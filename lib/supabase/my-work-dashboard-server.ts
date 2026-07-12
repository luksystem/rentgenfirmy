import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import {
  computeMyWorkDashboardMetrics,
  type WorkDashboardMetrics,
  type WorkObstacleRow,
} from "@/lib/my-work/dashboard-metrics";
import type { WorkPlanPeriodType, WorkPlanStatus, WorkPlanView } from "@/lib/my-work/plan-types";
import { canManageWorkItems, fetchWorkItemsForUser } from "@/lib/supabase/my-work-server";

type AdminClient = SupabaseClient;

function mapWeekPlanRow(row: {
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
}): WorkPlanView {
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
    items: [],
  };
}

async function fetchTeamMemberIds(admin: AdminClient, manager: UserProfile): Promise<string[]> {
  if (manager.role === "administrator") {
    const { data, error } = await admin.from("profiles").select("id").neq("id", manager.id);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: { id: string }) => row.id as string);
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("supervisor_id", manager.id);
  if (error) throw new Error(error.message);
  return [manager.id, ...(data ?? []).map((row) => row.id as string)];
}

async function fetchOpenObstaclesForManager(
  admin: AdminClient,
  managerId: string,
  teamIds: string[],
): Promise<WorkObstacleRow[]> {
  let query = admin
    .from("work_obstacles")
    .select(
      "id, work_item_id, obstacle_type, description, severity, created_at, reported_by_id, work_items(title)",
    )
    .eq("status", "open");

  if (teamIds.length > 0) {
    query = query.or(`assigned_to_id.eq.${managerId},reported_by_id.in.(${teamIds.join(",")})`);
  } else {
    query = query.eq("assigned_to_id", managerId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);

  const reporterIds = [...new Set((data ?? []).map((row) => row.reported_by_id as string))];
  const { data: profiles } = reporterIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", reporterIds)
    : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((row) => [
      row.id as string,
      getUserDisplayName({
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
      } as UserProfile),
    ]),
  );

  return (data ?? []).map((row) => {
    const workItem = row.work_items as { title?: string } | null;
    return {
      id: row.id as string,
      workItemId: row.work_item_id as string | null,
      workItemTitle: workItem?.title ?? null,
      obstacleType: row.obstacle_type as string,
      description: row.description as string,
      severity: row.severity as string,
      reportedByName: profileMap.get(row.reported_by_id as string) ?? "Pracownik",
      createdAt: row.created_at as string,
    };
  });
}

async function fetchWeekPlansForTeam(
  admin: AdminClient,
  teamIds: string[],
): Promise<WorkPlanView[]> {
  if (teamIds.length === 0) return [];

  const { data, error } = await admin
    .from("work_plans")
    .select("*, work_plan_items(*)")
    .eq("period_type", "week")
    .in("assigned_user_id", teamIds)
    .in("status", ["sent", "draft", "acknowledged", "active"])
    .order("date_from", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => mapWeekPlanRow(row));
}

export async function fetchMyWorkDashboardServer(
  admin: AdminClient,
  actor: UserProfile,
): Promise<WorkDashboardMetrics> {
  if (!canManageWorkItems(actor)) {
    throw new Error("Pulpit managera jest dostępny tylko dla managera lub administratora.");
  }

  const teamIds = await fetchTeamMemberIds(admin, actor);
  const [items, obstacles, weekPlans] = await Promise.all([
    fetchWorkItemsForUser(admin, actor.id, actor, { scope: "team", syncKanban: false }),
    fetchOpenObstaclesForManager(admin, actor.id, teamIds),
    fetchWeekPlansForTeam(admin, teamIds),
  ]);

  const assigneeIds = [...new Set(items.map((item) => item.assignedUserId))];
  const { data: profiles } = assigneeIds.length
    ? await admin.from("profiles").select("*").in("id", assigneeIds)
    : { data: [] };

  const profilesById = Object.fromEntries(
    (profiles ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        role: row.role as UserProfile["role"],
        supervisorId: row.supervisor_id as string | null,
      } as UserProfile,
    ]),
  );

  return computeMyWorkDashboardMetrics({ items, obstacles, weekPlans, profilesById });
}
