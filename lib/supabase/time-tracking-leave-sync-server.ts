import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveRequest } from "@/lib/leave/types";
import {
  resolveLeaveEntryTypeCode,
  shouldSyncLeaveToTimeEntries,
} from "@/lib/time-tracking/leave-type-mapping";
import { listWorkingDaysInRange, resolveDailyWorkMinutes } from "@/lib/time-tracking/work-schedule";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

type AdminClient = SupabaseClient;

async function resolveMetaIds(admin: AdminClient) {
  const [categoryResult, typesResult] = await Promise.all([
    admin.from("time_categories").select("id").eq("code", "company").maybeSingle(),
    admin.from("time_entry_types").select("id, code").in("code", ["leave", "sick"]),
  ]);

  if (categoryResult.error) {
    throw new Error(categoryResult.error.message);
  }
  if (typesResult.error) {
    throw new Error(typesResult.error.message);
  }
  if (!categoryResult.data) {
    throw new Error("Brak kategorii czasu „Firma”.");
  }

  const typeByCode = new Map(
    (typesResult.data ?? []).map((row) => [row.code as string, row.id as string]),
  );

  return {
    categoryId: categoryResult.data.id as string,
    leaveTypeId: typeByCode.get("leave"),
    sickTypeId: typeByCode.get("sick"),
  };
}

export async function syncApprovedLeaveTimeEntriesServer(
  admin: AdminClient,
  leaveRequest: Pick<LeaveRequest, "id" | "profileId" | "startDate" | "endDate" | "note">,
  leaveTypeName: string,
): Promise<number> {
  if (!shouldSyncLeaveToTimeEntries(leaveTypeName)) {
    await removeLeaveTimeEntriesServer(admin, leaveRequest.id);
    return 0;
  }

  const entryTypeCode = resolveLeaveEntryTypeCode(leaveTypeName);
  if (!entryTypeCode) {
    return 0;
  }

  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", leaveRequest.profileId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profile = profileRow ? mapProfileRow(profileRow) : null;
  const dailyMinutes = resolveDailyWorkMinutes(profile?.dailyHoursLimit);
  const meta = await resolveMetaIds(admin);
  const entryTypeId = entryTypeCode === "sick" ? meta.sickTypeId : meta.leaveTypeId;

  if (!entryTypeId) {
    throw new Error(`Brak typu wpisu „${entryTypeCode}” w słowniku czasu pracy.`);
  }

  const workingDays = listWorkingDaysInRange(leaveRequest.startDate, leaveRequest.endDate);
  const now = new Date().toISOString();
  const description =
    leaveRequest.note.trim() ||
    `${leaveTypeName} (${leaveRequest.startDate} – ${leaveRequest.endDate})`;

  await removeLeaveTimeEntriesServer(admin, leaveRequest.id);

  if (workingDays.length === 0) {
    return 0;
  }

  const rows = workingDays.map((date) => ({
    user_id: leaveRequest.profileId,
    date,
    duration_minutes: dailyMinutes,
    break_minutes: 0,
    category_id: meta.categoryId,
    entry_type_id: entryTypeId,
    description,
    billable: false,
    status: "approved",
    created_from: "leave",
    leave_request_id: leaveRequest.id,
    updated_at: now,
  }));

  const { error } = await admin.from("time_entries").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  return rows.length;
}

export async function removeLeaveTimeEntriesServer(
  admin: AdminClient,
  leaveRequestId: string,
): Promise<void> {
  const { error } = await admin.from("time_entries").delete().eq("leave_request_id", leaveRequestId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function syncApprovedLeaveToTimeTrackingServer(
  admin: AdminClient,
  leaveRequest: Pick<LeaveRequest, "id" | "profileId" | "startDate" | "endDate" | "note">,
  leaveTypeName: string,
): Promise<number> {
  return syncApprovedLeaveTimeEntriesServer(admin, leaveRequest, leaveTypeName);
}
