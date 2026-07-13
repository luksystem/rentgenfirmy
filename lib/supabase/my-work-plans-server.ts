import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import {
  itemIsOverdue,
  itemMatchesListSection,
  type ListSectionId,
} from "@/lib/my-work/section-filters";
import type {
  AcknowledgeWeekPlanInput,
  CreateWeekPlanInput,
  EndDayInput,
  ReportObstacleInput,
  StartDayInput,
  UpdateWeekPlanInput,
  WorkDayContext,
  WorkDaySession,
  WorkPlanItemView,
  WorkPlanPeriodType,
  WorkPlanStatus,
  WorkPlanView,
  WorkSummaryView,
} from "@/lib/my-work/plan-types";
import { isTerminalWorkItemStatus, type WorkItemView } from "@/lib/my-work/types";
import {
  canManageWorkItems,
  canViewWorkItem,
  fetchWorkItemsForUser,
  mapWorkItemRow,
} from "@/lib/supabase/my-work-server";
import { addDays, currentWeekMonday, toDateKey, weekRangeFromMonday } from "@/lib/my-work/week-range";
import {
  computeDayPlanSyncChanges,
  WEEK_PLAN_DAY_SYNC_STATUSES,
  type WeekPlanItemRef,
} from "@/lib/my-work/plan-sync";

type AdminClient = SupabaseClient;

const DAY_PLAN_SECTIONS: ListSectionId[] = ["today", "overdue", "pending_ack", "in_progress"];

function mapPlanRow(row: {
  id: string;
  period_type: string;
  date_from: string;
  date_to: string;
  assigned_user_id: string;
  manager_id: string | null;
  status: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  manager_comment: string;
  acknowledgement_due_at: string | null;
}): Omit<WorkPlanView, "items"> {
  return {
    id: row.id,
    periodType: row.period_type as WorkPlanPeriodType,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    assignedUserId: row.assigned_user_id,
    managerId: row.manager_id,
    status: row.status as WorkPlanStatus,
    sentAt: row.sent_at,
    acknowledgedAt: row.acknowledged_at,
    managerComment: row.manager_comment,
    acknowledgementDueAt: row.acknowledgement_due_at,
  };
}

function mapPlanItemRow(row: {
  id: string;
  work_plan_id: string;
  work_item_id: string;
  assigned_user_id: string;
  planned_date: string;
  sort_order: number;
  manager_comment: string;
  carried_over: boolean;
}): WorkPlanItemView {
  return {
    id: row.id,
    workPlanId: row.work_plan_id,
    workItemId: row.work_item_id,
    assignedUserId: row.assigned_user_id,
    plannedDate: row.planned_date,
    sortOrder: row.sort_order,
    managerComment: row.manager_comment,
    carriedOver: row.carried_over,
  };
}

function mapSessionRow(row: {
  id: string;
  user_id: string;
  session_date: string;
  work_plan_id: string | null;
  started_at: string;
  ended_at: string | null;
  start_confirmed: boolean;
  end_submitted_at: string | null;
}): WorkDaySession {
  return {
    id: row.id,
    userId: row.user_id,
    sessionDate: row.session_date,
    workPlanId: row.work_plan_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    startConfirmed: row.start_confirmed,
    endSubmittedAt: row.end_submitted_at,
  };
}

function mapSummaryRow(row: {
  id: string;
  user_id: string;
  period_type: string;
  date_from: string;
  date_to: string;
  work_plan_id: string | null;
  employee_comment: string;
  ai_draft: string;
  submitted_at: string;
}): WorkSummaryView {
  return {
    id: row.id,
    userId: row.user_id,
    periodType: row.period_type as WorkSummaryView["periodType"],
    dateFrom: row.date_from,
    dateTo: row.date_to,
    workPlanId: row.work_plan_id,
    employeeComment: row.employee_comment,
    aiDraft: row.ai_draft,
    submittedAt: row.submitted_at,
  };
}

function itemBelongsInDayPlan(item: WorkItemView, reference = new Date()) {
  if (isTerminalWorkItemStatus(item.status)) {
    return false;
  }
  return DAY_PLAN_SECTIONS.some((section) => itemMatchesListSection(item, section, reference));
}

async function fetchWeekPlanWorkItemIdsForDate(
  admin: AdminClient,
  userId: string,
  sessionDate: string,
) {
  const { from, to } = weekRangeFromMonday(sessionDate);
  const { data: weekPlan, error } = await admin
    .from("work_plans")
    .select("id, status")
    .eq("assigned_user_id", userId)
    .eq("period_type", "week")
    .eq("date_from", from)
    .eq("date_to", to)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (
    !weekPlan ||
    !WEEK_PLAN_DAY_SYNC_STATUSES.includes(
      weekPlan.status as (typeof WEEK_PLAN_DAY_SYNC_STATUSES)[number],
    )
  ) {
    return null;
  }

  const { data: weekItems, error: itemsError } = await admin
    .from("work_plan_items")
    .select("work_item_id")
    .eq("work_plan_id", weekPlan.id)
    .eq("planned_date", sessionDate);
  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return new Set((weekItems ?? []).map((row) => row.work_item_id as string));
}

function toWeekPlanItemRefs(
  items: { workItemId: string; plannedDate: string; sortOrder?: number }[],
): WeekPlanItemRef[] {
  return items.map((item) => ({
    workItemId: item.workItemId,
    plannedDate: item.plannedDate,
    sortOrder: item.sortOrder,
  }));
}

async function applyDayPlanSyncFromWeekPlanChanges(
  admin: AdminClient,
  assignedUserId: string,
  oldItems: WeekPlanItemRef[],
  newItems: WeekPlanItemRef[],
) {
  const changes = computeDayPlanSyncChanges(oldItems, newItems);
  if (!changes.length) {
    return;
  }

  const now = new Date().toISOString();

  for (const change of changes) {
    const { data: dayPlan, error: dayPlanError } = await admin
      .from("work_plans")
      .select("id")
      .eq("assigned_user_id", assignedUserId)
      .eq("period_type", "day")
      .eq("date_from", change.date)
      .maybeSingle();
    if (dayPlanError) {
      throw new Error(dayPlanError.message);
    }
    if (!dayPlan?.id) {
      continue;
    }

    const { data: existingDayItems, error: existingError } = await admin
      .from("work_plan_items")
      .select("id, work_item_id")
      .eq("work_plan_id", dayPlan.id);
    if (existingError) {
      throw new Error(existingError.message);
    }

    const allowedIds = new Set(change.reconcileToNewIds);
    const staleDayItemIds = (existingDayItems ?? [])
      .filter((row) => !allowedIds.has(row.work_item_id as string))
      .map((row) => row.id as string);

    if (staleDayItemIds.length) {
      const { error: deleteError } = await admin
        .from("work_plan_items")
        .delete()
        .in("id", staleDayItemIds);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    const existingIds = new Set(
      (existingDayItems ?? [])
        .map((row) => row.work_item_id as string)
        .filter((id) => allowedIds.has(id)),
    );

    if (change.addedItems.length) {
      const inserts = change.addedItems
        .filter((item) => !existingIds.has(item.workItemId))
        .map((item, index) => ({
          id: crypto.randomUUID(),
          work_plan_id: dayPlan.id,
          work_item_id: item.workItemId,
          assigned_user_id: assignedUserId,
          planned_date: change.date,
          sort_order: item.sortOrder ?? index * 10,
          manager_comment: "",
          carried_over: false,
          created_at: now,
        }));

      if (inserts.length) {
        const { error: insertError } = await admin.from("work_plan_items").insert(inserts);
        if (insertError) {
          throw new Error(insertError.message);
        }
      }
    }
  }
}

async function fetchPlanItems(
  admin: AdminClient,
  planId: string,
  workItemsById?: Map<string, WorkItemView>,
) {
  const { data, error } = await admin
    .from("work_plan_items")
    .select("*")
    .eq("work_plan_id", planId)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    ...mapPlanItemRow(row),
    workItem: workItemsById?.get(row.work_item_id) ?? null,
  }));
}

async function fetchPlanWithItems(
  admin: AdminClient,
  planId: string,
  workItemsById?: Map<string, WorkItemView>,
): Promise<WorkPlanView | null> {
  const { data, error } = await admin.from("work_plans").select("*").eq("id", planId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const items = await fetchPlanItems(admin, planId, workItemsById);
  return { ...mapPlanRow(data), items };
}

async function ensureDayPlan(
  admin: AdminClient,
  userId: string,
  sessionDate: string,
  workItems: WorkItemView[],
) {
  const { data: existing, error: existingError } = await admin
    .from("work_plans")
    .select("*")
    .eq("assigned_user_id", userId)
    .eq("period_type", "day")
    .eq("date_from", sessionDate)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }

  let planId = existing?.id as string | undefined;
  if (!planId) {
    const { data: created, error: createError } = await admin
      .from("work_plans")
      .insert({
        id: crypto.randomUUID(),
        period_type: "day",
        date_from: sessionDate,
        date_to: sessionDate,
        assigned_user_id: userId,
        manager_id: null,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (createError) {
      throw new Error(createError.message);
    }
    planId = created.id;
  }

  if (!planId) {
    throw new Error("Nie udało się utworzyć planu dnia.");
  }

  const candidateItems = (async () => {
    const weekPlanIds = await fetchWeekPlanWorkItemIdsForDate(admin, userId, sessionDate);
    const reference = new Date(`${sessionDate}T12:00:00`);
    if (weekPlanIds) {
      return workItems.filter(
        (item) => weekPlanIds.has(item.id) && !isTerminalWorkItemStatus(item.status),
      );
    }
    return workItems.filter((item) => itemBelongsInDayPlan(item, reference));
  })();

  const resolvedCandidateItems = await candidateItems;
  const { data: currentItems } = await admin
    .from("work_plan_items")
    .select("id, work_item_id")
    .eq("work_plan_id", planId);
  const existingIds = new Set((currentItems ?? []).map((row) => row.work_item_id));

  const inserts = resolvedCandidateItems
    .filter((item) => !existingIds.has(item.id))
    .map((item, index) => ({
      id: crypto.randomUUID(),
      work_plan_id: planId,
      work_item_id: item.id,
      assigned_user_id: userId,
      planned_date: sessionDate,
      sort_order: (existingIds.size + index) * 10,
      manager_comment: "",
      carried_over: itemIsOverdue(item, new Date(`${sessionDate}T12:00:00`)),
      created_at: new Date().toISOString(),
    }));

  if (inserts.length) {
    const { error: insertError } = await admin.from("work_plan_items").insert(inserts);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const validIds = new Set(resolvedCandidateItems.map((item) => item.id));
  const stalePlanItemIds = (currentItems ?? [])
    .filter((row) => !validIds.has(row.work_item_id as string))
    .map((row) => row.id as string);
  if (stalePlanItemIds.length) {
    const { error: pruneError } = await admin
      .from("work_plan_items")
      .delete()
      .in("id", stalePlanItemIds);
    if (pruneError) {
      throw new Error(pruneError.message);
    }
  }

  const workItemsById = new Map(workItems.map((item) => [item.id, item]));
  const plan = await fetchPlanWithItems(admin, planId, workItemsById);
  if (!plan) {
    throw new Error("Nie udało się wczytać planu dnia.");
  }
  return {
    ...plan,
    items: plan.items.filter((entry) => entry.workItem != null),
  };
}

export async function fetchDayContextServer(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
  sessionDate = toDateKey(),
): Promise<WorkDayContext> {
  const workItems = await fetchWorkItemsForUser(admin, userId, profile, { scope: "my" });

  const { data: sessionRow } = await admin
    .from("work_day_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_date", sessionDate)
    .maybeSingle();

  const { data: planRow } = await admin
    .from("work_plans")
    .select("*")
    .eq("assigned_user_id", userId)
    .eq("period_type", "day")
    .eq("date_from", sessionDate)
    .maybeSingle();

  const { data: summaryRow } = await admin
    .from("work_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("period_type", "day")
    .eq("date_from", sessionDate)
    .maybeSingle();

  let dayPlan: WorkPlanView | null = null;
  if (planRow) {
    dayPlan = await ensureDayPlan(admin, userId, sessionDate, workItems);
  }

  return {
    sessionDate,
    session: sessionRow ? mapSessionRow(sessionRow) : null,
    dayPlan,
    summary: summaryRow ? mapSummaryRow(summaryRow) : null,
  };
}

export async function startDaySessionServer(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
  input: StartDayInput = {},
): Promise<WorkDayContext> {
  const sessionDate = input.sessionDate ?? toDateKey();
  const workItems = await fetchWorkItemsForUser(admin, userId, profile, { scope: "my" });
  const dayPlan = await ensureDayPlan(admin, userId, sessionDate, workItems);

  const { data: existingSession } = await admin
    .from("work_day_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_date", sessionDate)
    .maybeSingle();

  let session: WorkDaySession;
  if (existingSession) {
    const { data: updated, error } = await admin
      .from("work_day_sessions")
      .update({
        work_plan_id: dayPlan?.id ?? null,
        start_confirmed: input.confirmPlan ?? true,
      })
      .eq("id", existingSession.id)
      .select("*")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    session = mapSessionRow(updated);
  } else {
    const { data: created, error } = await admin
      .from("work_day_sessions")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        session_date: sessionDate,
        work_plan_id: dayPlan?.id ?? null,
        started_at: new Date().toISOString(),
        start_confirmed: input.confirmPlan ?? true,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    session = mapSessionRow(created);
  }

  if (dayPlan && dayPlan.status === "draft") {
    await admin
      .from("work_plans")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", dayPlan.id);
    dayPlan.status = "active";
  }

  return {
    sessionDate,
    session,
    dayPlan,
    summary: null,
  };
}

export async function endDaySessionServer(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
  input: EndDayInput,
): Promise<WorkDayContext> {
  const sessionDate = input.sessionDate ?? toDateKey();
  const now = new Date().toISOString();

  const { data: sessionRow, error: sessionError } = await admin
    .from("work_day_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_date", sessionDate)
    .maybeSingle();
  if (sessionError) {
    throw new Error(sessionError.message);
  }
  if (!sessionRow) {
    throw new Error("Brak rozpoczętej sesji dnia. Najpierw kliknij „Rozpoczynam dzień”.");
  }

  const { error: updateSessionError } = await admin
    .from("work_day_sessions")
    .update({
      ended_at: now,
      end_submitted_at: now,
    })
    .eq("id", sessionRow.id);
  if (updateSessionError) {
    throw new Error(updateSessionError.message);
  }

  const { data: existingSummary } = await admin
    .from("work_summaries")
    .select("id")
    .eq("user_id", userId)
    .eq("period_type", "day")
    .eq("date_from", sessionDate)
    .maybeSingle();

  if (!existingSummary) {
    const { error: summaryError } = await admin.from("work_summaries").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      period_type: "day",
      date_from: sessionDate,
      date_to: sessionDate,
      work_plan_id: sessionRow.work_plan_id,
      employee_comment: input.employeeComment.trim(),
      ai_draft: input.aiDraft?.trim() ?? "",
      submitted_at: now,
      created_at: now,
    });
    if (summaryError) {
      throw new Error(summaryError.message);
    }
  } else {
    await admin
      .from("work_summaries")
      .update({
        employee_comment: input.employeeComment.trim(),
        ai_draft: input.aiDraft?.trim() ?? "",
        submitted_at: now,
      })
      .eq("id", existingSummary.id);
  }

  if (input.carryOverUnfinished && sessionRow.work_plan_id) {
    const tomorrow = addDays(sessionDate, 1);
    const workItems = await fetchWorkItemsForUser(admin, userId, profile, { scope: "my", syncKanban: false });
    const unfinished = workItems.filter(
      (item) => !isTerminalWorkItemStatus(item.status) && itemBelongsInDayPlan(item),
    );
    await ensureDayPlan(admin, userId, tomorrow, unfinished);
  }

  return fetchDayContextServer(admin, userId, profile, sessionDate);
}

async function assertCanManagePlanForUser(
  admin: AdminClient,
  manager: UserProfile,
  assignedUserId: string,
) {
  if (!canManageWorkItems(manager)) {
    throw new Error("Brak uprawnień do zarządzania planami pracy.");
  }
  if (assignedUserId === manager.id) {
    return;
  }
  const { data } = await admin.from("profiles").select("supervisor_id").eq("id", assignedUserId).maybeSingle();
  if (data?.supervisor_id !== manager.id && manager.role !== "administrator") {
    throw new Error("Możesz planować pracę tylko dla siebie lub swojego zespołu.");
  }
}

export async function createWeekPlanServer(
  admin: AdminClient,
  manager: UserProfile,
  input: CreateWeekPlanInput,
): Promise<WorkPlanView> {
  await assertCanManagePlanForUser(admin, manager, input.assignedUserId);

  const now = new Date().toISOString();
  const status = input.sendImmediately ? "sent" : "draft";

  const { data: existing, error: existingError } = await admin
    .from("work_plans")
    .select("*")
    .eq("assigned_user_id", input.assignedUserId)
    .eq("period_type", "week")
    .eq("date_from", input.dateFrom)
    .eq("date_to", input.dateTo)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    if (existing.status !== "draft") {
      throw new Error(
        "Plan na ten tydzień już został wysłany lub potwierdzony. Nie można utworzyć nowego szkicu.",
      );
    }

    const oldItems = toWeekPlanItemRefs(
      (await fetchPlanItems(admin, existing.id)).map((entry) => ({
        workItemId: entry.workItemId,
        plannedDate: entry.plannedDate,
        sortOrder: entry.sortOrder,
      })),
    );

    const { error: updateError } = await admin
      .from("work_plans")
      .update({
        manager_id: manager.id,
        manager_comment: input.managerComment?.trim() ?? existing.manager_comment,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: deleteItemsError } = await admin
      .from("work_plan_items")
      .delete()
      .eq("work_plan_id", existing.id);
    if (deleteItemsError) {
      throw new Error(deleteItemsError.message);
    }

    if (input.items.length) {
      const { error: itemsError } = await admin.from("work_plan_items").insert(
        input.items.map((item, index) => ({
          id: crypto.randomUUID(),
          work_plan_id: existing.id,
          work_item_id: item.workItemId,
          assigned_user_id: input.assignedUserId,
          planned_date: item.plannedDate,
          sort_order: item.sortOrder ?? index * 10,
          manager_comment: item.managerComment?.trim() ?? "",
          carried_over: false,
          created_at: now,
        })),
      );
      if (itemsError) {
        throw new Error(itemsError.message);
      }
    }

    const plan = await fetchPlanWithItems(admin, existing.id);
    if (!plan) {
      throw new Error("Nie udało się zaktualizować planu tygodnia.");
    }
    await applyDayPlanSyncFromWeekPlanChanges(
      admin,
      input.assignedUserId,
      oldItems,
      toWeekPlanItemRefs(input.items),
    );
    return plan;
  }

  const planId = crypto.randomUUID();

  const { error: planError } = await admin.from("work_plans").insert({
    id: planId,
    period_type: "week",
    date_from: input.dateFrom,
    date_to: input.dateTo,
    assigned_user_id: input.assignedUserId,
    manager_id: manager.id,
    status,
    sent_at: input.sendImmediately ? now : null,
    manager_comment: input.managerComment?.trim() ?? "",
    acknowledgement_due_at: input.sendImmediately
      ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      : null,
    created_at: now,
    updated_at: now,
  });
  if (planError) {
    throw new Error(planError.message);
  }

  if (input.items.length) {
    const { error: itemsError } = await admin.from("work_plan_items").insert(
      input.items.map((item, index) => ({
        id: crypto.randomUUID(),
        work_plan_id: planId,
        work_item_id: item.workItemId,
        assigned_user_id: input.assignedUserId,
        planned_date: item.plannedDate,
        sort_order: item.sortOrder ?? index * 10,
        manager_comment: item.managerComment?.trim() ?? "",
        carried_over: false,
        created_at: now,
      })),
    );
    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  const plan = await fetchPlanWithItems(admin, planId);
  if (!plan) {
    throw new Error("Nie udało się utworzyć planu tygodnia.");
  }
  await applyDayPlanSyncFromWeekPlanChanges(
    admin,
    input.assignedUserId,
    [],
    toWeekPlanItemRefs(input.items),
  );
  return plan;
}

export async function updateWeekPlanServer(
  admin: AdminClient,
  planId: string,
  manager: UserProfile,
  input: UpdateWeekPlanInput,
): Promise<WorkPlanView> {
  const existing = await fetchPlanWithItems(admin, planId);
  if (!existing) {
    throw new Error("Plan nie istnieje.");
  }
  if (existing.periodType !== "week") {
    throw new Error("Edycja dotyczy tylko planów tygodniowych.");
  }
  if (existing.managerId !== manager.id && manager.role !== "administrator") {
    throw new Error("Brak uprawnień do edycji tego planu.");
  }
  await assertCanManagePlanForUser(admin, manager, existing.assignedUserId);

  const now = new Date().toISOString();
  const sendImmediately = input.sendImmediately === true;
  const oldItems = toWeekPlanItemRefs(
    existing.items.map((entry) => ({
      workItemId: entry.workItemId,
      plannedDate: entry.plannedDate,
      sortOrder: entry.sortOrder,
    })),
  );

  const { error: updateError } = await admin
    .from("work_plans")
    .update({
      manager_id: manager.id,
      manager_comment: input.managerComment?.trim() ?? existing.managerComment,
      status: sendImmediately ? "sent" : "draft",
      sent_at: sendImmediately ? now : null,
      acknowledged_at: null,
      acknowledgement_due_at: sendImmediately
        ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      updated_at: now,
    })
    .eq("id", planId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteItemsError } = await admin
    .from("work_plan_items")
    .delete()
    .eq("work_plan_id", planId);
  if (deleteItemsError) {
    throw new Error(deleteItemsError.message);
  }

  if (input.items.length) {
    const { error: itemsError } = await admin.from("work_plan_items").insert(
      input.items.map((item, index) => ({
        id: crypto.randomUUID(),
        work_plan_id: planId,
        work_item_id: item.workItemId,
        assigned_user_id: existing.assignedUserId,
        planned_date: item.plannedDate,
        sort_order: item.sortOrder ?? index * 10,
        manager_comment: item.managerComment?.trim() ?? "",
        carried_over: false,
        created_at: now,
      })),
    );
    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  const workItems = await fetchWorkItemsForUser(admin, existing.assignedUserId, manager, {
    scope: "my",
    syncKanban: false,
  });
  const workItemsById = new Map(workItems.map((item) => [item.id, item]));
  const plan = await fetchPlanWithItems(admin, planId, workItemsById);
  if (!plan) {
    throw new Error("Nie udało się zapisać planu tygodnia.");
  }
  await applyDayPlanSyncFromWeekPlanChanges(
    admin,
    existing.assignedUserId,
    oldItems,
    toWeekPlanItemRefs(input.items),
  );
  return plan;
}

export async function sendWeekPlanServer(admin: AdminClient, planId: string, manager: UserProfile) {
  const plan = await fetchPlanWithItems(admin, planId);
  if (!plan) {
    throw new Error("Plan nie istnieje.");
  }
  if (plan.managerId !== manager.id && manager.role !== "administrator") {
    throw new Error("Brak uprawnień do wysłania tego planu.");
  }
  const now = new Date().toISOString();
  const { error } = await admin
    .from("work_plans")
    .update({
      status: "sent",
      sent_at: now,
      acknowledgement_due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now,
    })
    .eq("id", planId);
  if (error) {
    throw new Error(error.message);
  }
  return fetchPlanWithItems(admin, planId);
}

export async function acknowledgeWeekPlanServer(
  admin: AdminClient,
  planId: string,
  userId: string,
  input: AcknowledgeWeekPlanInput,
) {
  const plan = await fetchPlanWithItems(admin, planId);
  if (!plan) {
    throw new Error("Plan nie istnieje.");
  }
  if (plan.assignedUserId !== userId) {
    throw new Error("Ten plan nie jest przypisany do Ciebie.");
  }
  if (plan.periodType !== "week") {
    throw new Error("Potwierdzenie dotyczy tylko planów tygodniowych.");
  }

  const now = new Date().toISOString();
  const { error: ackError } = await admin.from("work_plan_acknowledgements").upsert(
    {
      id: crypto.randomUUID(),
      work_plan_id: planId,
      user_id: userId,
      comment: input.comment?.trim() ?? "",
      risk_notes: input.riskNotes?.trim() ?? "",
      accepted_without_reservations: input.acceptedWithoutReservations ?? false,
      created_at: now,
    },
    { onConflict: "work_plan_id,user_id" },
  );
  if (ackError) {
    throw new Error(ackError.message);
  }

  const { error: planError } = await admin
    .from("work_plans")
    .update({
      status: "acknowledged",
      acknowledged_at: now,
      updated_at: now,
    })
    .eq("id", planId);
  if (planError) {
    throw new Error(planError.message);
  }

  return fetchPlanWithItems(admin, planId);
}

export async function fetchCurrentWeekPlanServer(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
  options?: { assignedUserId?: string | null; referenceDate?: string | null },
): Promise<WorkPlanView | null> {
  const targetUserId = options?.assignedUserId ?? userId;
  if (targetUserId !== userId) {
    await assertCanManagePlanForUser(admin, profile, targetUserId);
  }

  const referenceDate = options?.referenceDate ?? currentWeekMonday();
  const { from, to } = weekRangeFromMonday(referenceDate);
  const { data, error } = await admin
    .from("work_plans")
    .select("*")
    .eq("assigned_user_id", targetUserId)
    .eq("period_type", "week")
    .eq("date_from", from)
    .eq("date_to", to)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const workItems = await fetchWorkItemsForUser(admin, targetUserId, profile, {
    scope: "my",
    syncKanban: false,
  });
  const workItemsById = new Map(workItems.map((item) => [item.id, item]));
  return fetchPlanWithItems(admin, data.id, workItemsById);
}

export async function copyWeekPlanFromPreviousServer(
  admin: AdminClient,
  manager: UserProfile,
  assignedUserId: string,
  referenceDate = toDateKey(),
): Promise<WorkPlanView> {
  await assertCanManagePlanForUser(admin, manager, assignedUserId);
  const { from, to } = weekRangeFromMonday(referenceDate);
  const prevFrom = addDays(from, -7);
  const prevTo = addDays(to, -7);

  const { data: previousPlan } = await admin
    .from("work_plans")
    .select("*")
    .eq("assigned_user_id", assignedUserId)
    .eq("period_type", "week")
    .eq("date_from", prevFrom)
    .eq("date_to", prevTo)
    .maybeSingle();

  const { data: previousItems } = previousPlan
    ? await admin.from("work_plan_items").select("*").eq("work_plan_id", previousPlan.id)
    : { data: [] };

  const workItems = await fetchWorkItemsForUser(admin, assignedUserId, manager, {
    scope: "my",
    syncKanban: false,
  });
  const unfinished = workItems.filter((item) => !isTerminalWorkItemStatus(item.status));

  const itemMap = new Map<string, { workItemId: string; plannedDate: string; managerComment: string }>();
  for (const row of previousItems ?? []) {
    const shiftedDate = addDays(row.planned_date, 7);
    if (shiftedDate >= from && shiftedDate <= to) {
      itemMap.set(row.work_item_id, {
        workItemId: row.work_item_id,
        plannedDate: shiftedDate,
        managerComment: row.manager_comment,
      });
    }
  }
  for (const item of unfinished) {
    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, {
        workItemId: item.id,
        plannedDate: from,
        managerComment: "",
      });
    }
  }

  return createWeekPlanServer(admin, manager, {
    assignedUserId,
    dateFrom: from,
    dateTo: to,
    managerComment: previousPlan?.manager_comment ?? "",
    items: [...itemMap.values()].map((entry, index) => ({
      workItemId: entry.workItemId,
      plannedDate: entry.plannedDate,
      sortOrder: index * 10,
      managerComment: entry.managerComment,
    })),
    sendImmediately: false,
  });
}

export async function reportObstacleServer(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
  input: ReportObstacleInput,
) {
  let assignedToId: string | null = null;
  let projectId = input.projectId ?? null;
  let workItemTitle = "";

  if (input.workItemId) {
    const { data: itemRow, error } = await admin
      .from("work_items")
      .select("*")
      .eq("id", input.workItemId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!itemRow) {
      throw new Error("Zadanie nie istnieje.");
    }
    const item = mapWorkItemRow(itemRow);
    const canView = await canViewWorkItem(admin, item, userId, profile);
    if (!canView) {
      throw new Error("Brak dostępu do tego zadania.");
    }
    assignedToId = item.managerId;
    projectId = item.projectId;
    workItemTitle = item.title;
  }

  const now = new Date().toISOString();
  const obstacleId = crypto.randomUUID();
  const { error } = await admin.from("work_obstacles").insert({
    id: obstacleId,
    work_item_id: input.workItemId ?? null,
    work_plan_id: input.workPlanId ?? null,
    project_id: projectId,
    reported_by_id: userId,
    assigned_to_id: assignedToId,
    obstacle_type: input.obstacleType,
    description: input.description.trim(),
    status: "open",
    severity: input.severity ?? "medium",
    created_at: now,
    updated_at: now,
  });
  if (error) {
    throw new Error(error.message);
  }

  return {
    id: obstacleId,
    assignedToId,
    workItemTitle,
    reporterName: getUserDisplayName(profile),
  };
}
