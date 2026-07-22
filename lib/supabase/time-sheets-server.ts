import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, hasFullAppAccess, type UserProfile } from "@/lib/auth/types";
import {
  canApproveTimesheet,
  canRejectTimesheet,
  canSubmitTimesheet,
  canViewTeamTimesheets,
} from "@/lib/time-tracking/permissions";
import { collectTimesheetSubmitIssues } from "@/lib/time-tracking/timesheet-validation";
import { buildTimesheetSummary, type TimesheetSummary } from "@/lib/time-tracking/timesheet-summary";
import { buildTeamPeriodDetail, type TeamPeriodDetail } from "@/lib/time-tracking/team-period-detail";
import type {
  EnsureTimesheetInput,
  RejectTimesheetInput,
  SubmitTimesheetInput,
  TimeEntryStatus,
  Timesheet,
  TimesheetFilters,
  TimesheetPeriodType,
  TimesheetStatus,
  TimesheetView,
} from "@/lib/time-tracking/types";
import type { TeamTimesheetOverviewRow } from "@/lib/time-tracking/types";
import {
  fetchActiveTimerServer,
  fetchTeamTimeEntriesServer,
  fetchTimeEntriesServer,
  fetchTimeTrackingMetaServer,
} from "@/lib/supabase/time-tracking-server";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { awardXpServer } from "@/lib/supabase/xp-server";

type AdminClient = SupabaseClient;

type TimeSheetRow = {
  id: string;
  user_id: string;
  period_type: string;
  date_from: string;
  date_to: string;
  status: string;
  submitted_at: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  employee_comment: string;
  manager_comment: string;
  created_at: string;
  updated_at: string;
};

function mapTimesheetRow(row: TimeSheetRow): Timesheet {
  return {
    id: row.id,
    userId: row.user_id,
    periodType: row.period_type as TimesheetPeriodType,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    status: row.status as TimesheetStatus,
    submittedAt: row.submitted_at,
    approvedById: row.approved_by_id,
    approvedAt: row.approved_at,
    employeeComment: row.employee_comment,
    managerComment: row.manager_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logTimeEntryStatusChanges(
  admin: AdminClient,
  entryIds: string[],
  actorId: string,
  action: string,
  nextStatus: TimeEntryStatus,
  comment = "",
) {
  if (entryIds.length === 0) {
    return;
  }

  const rows = entryIds.map((entryId) => ({
    time_entry_id: entryId,
    action,
    user_id: actorId,
    old_value: null,
    new_value: { status: nextStatus },
    comment,
  }));

  const { error } = await admin.from("time_entry_logs").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

async function loadProfilesMap(admin: AdminClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      getUserDisplayName({
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        email: row.email as string,
      }),
    ]),
  );
}

async function attachTimesheetSummaries(
  admin: AdminClient,
  sheets: Timesheet[],
): Promise<TimesheetView[]> {
  if (sheets.length === 0) {
    return [];
  }

  const userIds = [...new Set(sheets.map((sheet) => sheet.userId))];
  const minDate = sheets.reduce((min, sheet) => (sheet.dateFrom < min ? sheet.dateFrom : min), sheets[0]!.dateFrom);
  const maxDate = sheets.reduce((max, sheet) => (sheet.dateTo > max ? sheet.dateTo : max), sheets[0]!.dateTo);

  const [profilesMap, entriesResult] = await Promise.all([
    loadProfilesMap(admin, userIds),
    admin
      .from("time_entries")
      .select("id, user_id, date, duration_minutes, status")
      .in("user_id", userIds)
      .gte("date", minDate)
      .lte("date", maxDate),
  ]);

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message);
  }

  const entries = entriesResult.data ?? [];

  return sheets.map((sheet) => {
    const sheetEntries = entries.filter(
      (entry) =>
        entry.user_id === sheet.userId &&
        (entry.date as string) >= sheet.dateFrom &&
        (entry.date as string) <= sheet.dateTo,
    );

    return {
      ...sheet,
      userDisplayName: profilesMap.get(sheet.userId) ?? "—",
      totalMinutes: sheetEntries.reduce((sum, entry) => sum + (entry.duration_minutes as number), 0),
      entryCount: sheetEntries.length,
      draftEntryCount: sheetEntries.filter((entry) => entry.status === "draft").length,
      submittedEntryCount: sheetEntries.filter((entry) => entry.status === "submitted").length,
      approvedEntryCount: sheetEntries.filter((entry) => entry.status === "approved").length,
    };
  });
}

async function fetchTimesheetById(admin: AdminClient, sheetId: string): Promise<Timesheet | null> {
  const { data, error } = await admin.from("time_sheets").select("*").eq("id", sheetId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapTimesheetRow(data as TimeSheetRow) : null;
}

export async function fetchTimesheetsServer(
  admin: AdminClient,
  actor: UserProfile,
  filters: TimesheetFilters = {},
): Promise<TimesheetView[]> {
  const targetUserId = filters.userId;

  if (targetUserId && targetUserId !== actor.id && !canViewTeamTimesheets(actor.role)) {
    throw new Error("Brak uprawnień do podglądu arkuszy innej osoby.");
  }

  let query = admin.from("time_sheets").select("*").order("date_from", { ascending: false });

  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  } else if (!canViewTeamTimesheets(actor.role)) {
    query = query.eq("user_id", actor.id);
  }

  if (filters.dateFrom) {
    query = query.gte("date_from", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("date_to", filters.dateTo);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.periodType) {
    query = query.eq("period_type", filters.periodType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const sheets = (data ?? []).map((row) => mapTimesheetRow(row as TimeSheetRow));
  return attachTimesheetSummaries(admin, sheets);
}

export async function ensureTimesheetServer(
  admin: AdminClient,
  actor: UserProfile,
  input: EnsureTimesheetInput,
): Promise<TimesheetView> {
  const targetUserId = input.userId ?? actor.id;
  if (targetUserId !== actor.id && !hasFullAppAccess(actor.role)) {
    throw new Error("Brak uprawnień do utworzenia arkusza dla tej osoby.");
  }

  const periodType = input.periodType ?? "week";

  const { data: existing, error: existingError } = await admin
    .from("time_sheets")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("period_type", periodType)
    .eq("date_from", input.dateFrom)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const views = await attachTimesheetSummaries(admin, [mapTimesheetRow(existing as TimeSheetRow)]);
    return views[0]!;
  }

  const { data, error } = await admin
    .from("time_sheets")
    .insert({
      user_id: targetUserId,
      period_type: periodType,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const views = await attachTimesheetSummaries(admin, [mapTimesheetRow(data as TimeSheetRow)]);
  return views[0]!;
}

async function updateEntriesInPeriod(
  admin: AdminClient,
  sheet: Timesheet,
  fromStatuses: TimeEntryStatus[],
  toStatus: TimeEntryStatus,
  actorId: string,
  action: string,
  comment = "",
) {
  const { data: entries, error: fetchError } = await admin
    .from("time_entries")
    .select("id")
    .eq("user_id", sheet.userId)
    .gte("date", sheet.dateFrom)
    .lte("date", sheet.dateTo)
    .in("status", fromStatuses);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const entryIds = (entries ?? []).map((entry) => entry.id as string);
  if (entryIds.length === 0) {
    return;
  }

  const { error: updateError } = await admin
    .from("time_entries")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .in("id", entryIds);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await logTimeEntryStatusChanges(admin, entryIds, actorId, action, toStatus, comment);
}

export async function submitTimesheetServer(
  admin: AdminClient,
  actor: UserProfile,
  sheetId: string,
  input: SubmitTimesheetInput = {},
): Promise<TimesheetView> {
  const sheet = await fetchTimesheetById(admin, sheetId);
  if (!sheet) {
    throw new Error("Arkusz czasu nie istnieje.");
  }
  if (!canSubmitTimesheet(actor, sheet)) {
    throw new Error("Nie można wysłać tego arkusza do akceptacji.");
  }

  const activeTimer = await fetchActiveTimerServer(admin, sheet.userId);
  if (activeTimer) {
    throw new Error("Zatrzymaj aktywny timer przed wysłaniem arkusza.");
  }

  const [meta, entries] = await Promise.all([
    fetchTimeTrackingMetaServer(admin),
    fetchTimeEntriesServer(admin, actor, {
      userId: sheet.userId,
      dateFrom: sheet.dateFrom,
      dateTo: sheet.dateTo,
    }),
  ]);

  const issues = collectTimesheetSubmitIssues(entries, meta.categories, meta.entryTypes);
  if (issues.length > 0) {
    const preview = issues
      .slice(0, 3)
      .map((issue) => `${issue.date}: ${issue.message}`)
      .join(" ");
    throw new Error(`Popraw wpisy przed wysłaniem. ${preview}`);
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("time_sheets")
    .update({
      status: "submitted",
      submitted_at: now,
      employee_comment: input.employeeComment?.trim() ?? sheet.employeeComment,
      manager_comment: "",
      approved_by_id: null,
      approved_at: null,
      updated_at: now,
    })
    .eq("id", sheetId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await updateEntriesInPeriod(admin, sheet, ["draft", "rejected"], "submitted", actor.id, "submitted");

  await awardXpServer(admin, { employeeId: sheet.userId, criterionKey: "timesheet_submitted", sourceId: sheetId });

  const views = await attachTimesheetSummaries(admin, [mapTimesheetRow(data as TimeSheetRow)]);
  return views[0]!;
}

/** Czy jakikolwiek wpis z tego okresu był kiedykolwiek odrzucony — do bonusu "bez poprawek". */
async function hasTimesheetBeenRejectedServer(admin: AdminClient, sheet: Timesheet): Promise<boolean> {
  const { data: entries, error: entriesError } = await admin
    .from("time_entries")
    .select("id")
    .eq("user_id", sheet.userId)
    .gte("date", sheet.dateFrom)
    .lte("date", sheet.dateTo);
  if (entriesError || !entries?.length) {
    return false;
  }

  const { count, error: logsError } = await admin
    .from("time_entry_logs")
    .select("id", { count: "exact", head: true })
    .in(
      "time_entry_id",
      entries.map((entry) => entry.id as string),
    )
    .eq("action", "rejected");
  if (logsError) {
    return false;
  }

  return (count ?? 0) > 0;
}

export async function approveTimesheetServer(
  admin: AdminClient,
  actor: UserProfile,
  sheetId: string,
): Promise<TimesheetView> {
  const sheet = await fetchTimesheetById(admin, sheetId);
  if (!sheet) {
    throw new Error("Arkusz czasu nie istnieje.");
  }
  if (!canApproveTimesheet(actor, sheet)) {
    throw new Error("Brak uprawnień do akceptacji tego arkusza.");
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("time_sheets")
    .update({
      status: "approved",
      approved_by_id: actor.id,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", sheetId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await updateEntriesInPeriod(admin, sheet, ["submitted"], "approved", actor.id, "approved");

  await awardXpServer(admin, { employeeId: sheet.userId, criterionKey: "timesheet_approved", sourceId: sheetId });
  const wasEverRejected = await hasTimesheetBeenRejectedServer(admin, sheet);
  if (!wasEverRejected) {
    await awardXpServer(admin, {
      employeeId: sheet.userId,
      criterionKey: "timesheet_approved_without_rework",
      sourceId: sheetId,
    });
  }

  const views = await attachTimesheetSummaries(admin, [mapTimesheetRow(data as TimeSheetRow)]);
  return views[0]!;
}

export async function rejectTimesheetServer(
  admin: AdminClient,
  actor: UserProfile,
  sheetId: string,
  input: RejectTimesheetInput,
): Promise<TimesheetView> {
  const sheet = await fetchTimesheetById(admin, sheetId);
  if (!sheet) {
    throw new Error("Arkusz czasu nie istnieje.");
  }
  if (!canRejectTimesheet(actor, sheet)) {
    throw new Error("Brak uprawnień do odrzucenia tego arkusza.");
  }

  const comment = input.managerComment.trim();
  if (!comment) {
    throw new Error("Podaj komentarz przy odrzuceniu arkusza.");
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("time_sheets")
    .update({
      status: "rejected",
      manager_comment: comment,
      approved_by_id: null,
      approved_at: null,
      updated_at: now,
    })
    .eq("id", sheetId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await updateEntriesInPeriod(admin, sheet, ["submitted"], "rejected", actor.id, "rejected", comment);

  const views = await attachTimesheetSummaries(admin, [mapTimesheetRow(data as TimeSheetRow)]);
  return views[0]!;
}

export type TimesheetSummaryQuery = {
  userId?: string;
  dateFrom: string;
  dateTo: string;
  periodType: TimesheetPeriodType;
  ensureTimesheet?: boolean;
};

async function fetchTimesheetForPeriod(
  admin: AdminClient,
  userId: string,
  input: Pick<TimesheetSummaryQuery, "dateFrom" | "dateTo" | "periodType">,
): Promise<Timesheet | null> {
  const { data, error } = await admin
    .from("time_sheets")
    .select("*")
    .eq("user_id", userId)
    .eq("period_type", input.periodType)
    .eq("date_from", input.dateFrom)
    .eq("date_to", input.dateTo)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapTimesheetRow(data as TimeSheetRow) : null;
}

export async function fetchTimesheetSummaryServer(
  admin: AdminClient,
  actor: UserProfile,
  query: TimesheetSummaryQuery,
): Promise<TimesheetSummary> {
  const targetUserId = query.userId ?? actor.id;
  if (targetUserId !== actor.id && !canViewTeamTimesheets(actor.role)) {
    throw new Error("Brak uprawnień do podglądu zestawienia innej osoby.");
  }

  const [meta, entries, profileResult] = await Promise.all([
    fetchTimeTrackingMetaServer(admin),
    fetchTimeEntriesServer(admin, actor, {
      userId: targetUserId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    }),
    admin.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
  ]);

  let timesheetView: TimesheetView | null = null;

  if (query.ensureTimesheet && targetUserId === actor.id) {
    timesheetView = await ensureTimesheetServer(admin, actor, {
      userId: targetUserId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      periodType: query.periodType,
    });
  } else {
    const existing = await fetchTimesheetForPeriod(admin, targetUserId, query);
    if (existing) {
      const views = await attachTimesheetSummaries(admin, [existing]);
      timesheetView = views[0] ?? null;
    }
  }

  return buildTimesheetSummary(
    timesheetView,
    entries,
    query.dateFrom,
    query.dateTo,
    meta.entryTypes,
    profileResult.data
      ? mapProfileRow(profileResult.data).dailyHoursLimit
      : actor.id === targetUserId
        ? actor.dailyHoursLimit
        : null,
  );
}

export async function fetchTeamTimesheetOverviewServer(
  admin: AdminClient,
  actor: UserProfile,
  query: Pick<TimesheetSummaryQuery, "dateFrom" | "dateTo" | "periodType">,
): Promise<TeamTimesheetOverviewRow[]> {
  if (!canViewTeamTimesheets(actor.role)) {
    throw new Error("Brak uprawnień do podglądu zestawienia zespołu.");
  }

  const [profiles, meta] = await Promise.all([
    fetchTeamProfilesServer(),
    fetchTimeTrackingMetaServer(admin),
  ]);

  const userIds = profiles.map((profile) => profile.id);
  if (userIds.length === 0) {
    return [];
  }

  const typeMeta = new Map(meta.entryTypes.map((item) => [item.id, item]));

  const [entriesResult, sheetsResult] = await Promise.all([
    admin
      .from("time_entries")
      .select("id, user_id, date, duration_minutes, status, entry_type_id")
      .in("user_id", userIds)
      .gte("date", query.dateFrom)
      .lte("date", query.dateTo),
    admin
      .from("time_sheets")
      .select("*")
      .in("user_id", userIds)
      .eq("period_type", query.periodType)
      .eq("date_from", query.dateFrom)
      .eq("date_to", query.dateTo),
  ]);

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message);
  }
  if (sheetsResult.error) {
    throw new Error(sheetsResult.error.message);
  }

  const sheetsByUser = new Map(
    (sheetsResult.data ?? []).map((row) => [row.user_id as string, mapTimesheetRow(row as TimeSheetRow)]),
  );

  return profiles
    .map((profile) => {
      const userEntries = (entriesResult.data ?? []).filter((row) => row.user_id === profile.id);
      let totalMinutes = 0;
      let workMinutes = 0;
      let draftEntryCount = 0;
      let submittedEntryCount = 0;
      let approvedEntryCount = 0;

      for (const row of userEntries) {
        const minutes = row.duration_minutes as number;
        totalMinutes += minutes;
        const type = typeMeta.get(row.entry_type_id as string);
        if (!type?.countsAsAbsence && (type?.countsAsWork ?? true)) {
          workMinutes += minutes;
        }
        if (row.status === "draft") draftEntryCount += 1;
        if (row.status === "submitted") submittedEntryCount += 1;
        if (row.status === "approved") approvedEntryCount += 1;
      }

      const sheet = sheetsByUser.get(profile.id);

      return {
        userId: profile.id,
        userDisplayName: getUserDisplayName(profile),
        timesheetId: sheet?.id ?? null,
        status: sheet?.status ?? "draft",
        totalMinutes,
        workMinutes,
        entryCount: userEntries.length,
        draftEntryCount,
        submittedEntryCount,
        approvedEntryCount,
      } satisfies TeamTimesheetOverviewRow;
    })
    .sort((a, b) => a.userDisplayName.localeCompare(b.userDisplayName, "pl"));
}

export async function fetchTeamPeriodDetailServer(
  admin: AdminClient,
  actor: UserProfile,
  query: Pick<TimesheetSummaryQuery, "dateFrom" | "dateTo" | "periodType">,
): Promise<TeamPeriodDetail> {
  if (!canViewTeamTimesheets(actor.role)) {
    throw new Error("Brak uprawnień do podglądu zestawienia zespołu.");
  }

  const [profiles, meta, entries, sheetsResult] = await Promise.all([
    fetchTeamProfilesServer(),
    fetchTimeTrackingMetaServer(admin),
    fetchTeamTimeEntriesServer(admin, actor, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    }),
    admin
      .from("time_sheets")
      .select("*")
      .eq("period_type", query.periodType)
      .eq("date_from", query.dateFrom)
      .eq("date_to", query.dateTo),
  ]);

  if (sheetsResult.error) {
    throw new Error(sheetsResult.error.message);
  }

  const sheetsByUser = new Map(
    (sheetsResult.data ?? []).map((row) => [row.user_id as string, mapTimesheetRow(row as TimeSheetRow)]),
  );

  const entriesByUser = new Map<string, typeof entries>();
  for (const entry of entries) {
    const bucket = entriesByUser.get(entry.userId) ?? [];
    bucket.push(entry);
    entriesByUser.set(entry.userId, bucket);
  }

  return buildTeamPeriodDetail({
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    periodType: query.periodType,
    entryTypeMeta: meta.entryTypes.map((item) => ({
      id: item.id,
      countsAsWork: item.countsAsWork,
      countsAsAbsence: item.countsAsAbsence,
    })),
    employees: profiles.map((profile) => {
      const sheet = sheetsByUser.get(profile.id);
      return {
        userId: profile.id,
        userDisplayName: getUserDisplayName(profile),
        entries: entriesByUser.get(profile.id) ?? [],
        timesheetId: sheet?.id ?? null,
        status: sheet?.status ?? "draft",
      };
    }),
  });
}
