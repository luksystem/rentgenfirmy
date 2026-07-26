import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { workItemLinkUrl } from "@/lib/my-work/types";
import { formatPartyName } from "@/lib/party/display-name";
import { computeKpiResult, resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DetailRow, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

const OPEN_WORK_ITEM_STATUSES_EXCLUDED = ["done", "verified", "not_done", "cancelled"];
const WAITING_WORK_ITEM_STATUSES = ["blocked", "needs_clarification", "pending_ack", "risk_reported"];
/** Przybliżenie standardu 40h/tydzień na osobę — brak per-profilowego limitu w tym zapytaniu
 * (w przeciwieństwie do lib/resource-plan/dashboard-metrics.ts), żeby uniknąć dodatkowego joina
 * tylko dla jednego KPI. Nadgodziny = suma zalogowanych godzin ponad tę przybliżoną pojemność. */
const STANDARD_WEEKLY_MINUTES_PER_PERSON = 40 * 60;

/**
 * Zadania przeterminowane "na dzień asOfIso" — prosty punktowy warunek (due_date < asOfIso),
 * nie okno [from,to]. Okno dnia (current=dziś, previous=wczoraj) dawałoby sprzeczny warunek
 * "due_date < dziś ORAZ due_date w [dziś,dziś]", czyli zawsze 0 — stąd migawka dziś vs wczoraj.
 */
async function countOverdueWorkItemsAsOf(admin: AdminClient, asOfIso: string) {
  const { count, error } = await admin
    .from("work_items")
    .select("id", { count: "exact", head: true })
    .not("status", "in", `(${OPEN_WORK_ITEM_STATUSES_EXCLUDED.join(",")})`)
    .lt("due_date", asOfIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countWaitingWorkItems(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("work_items")
    .select("id", { count: "exact", head: true })
    .in("status", WAITING_WORK_ITEM_STATUSES)
    .lte("created_at", `${toIso}T23:59:59`)
    .gte("created_at", `${fromIso}T00:00:00`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countUnassignedResourcePlanGaps(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("resource_plan_items")
    .select("id", { count: "exact", head: true })
    .is("assignee_id", null)
    .lt("start_at", `${toIso}T23:59:59`)
    .gt("end_at", `${fromIso}T00:00:00`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function sumOvertimeMinutes(admin: AdminClient, fromIso: string, toIso: string) {
  const { data, error } = await admin
    .from("time_entries")
    .select("user_id, duration_minutes")
    .gte("date", fromIso)
    .lte("date", toIso);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ user_id: string; duration_minutes: number }>;
  const minutesByUser = new Map<string, number>();
  for (const row of rows) {
    minutesByUser.set(row.user_id, (minutesByUser.get(row.user_id) ?? 0) + row.duration_minutes);
  }

  let overtimeMinutes = 0;
  for (const totalMinutes of minutesByUser.values()) {
    overtimeMinutes += Math.max(0, totalMinutes - STANDARD_WEEKLY_MINUTES_PER_PERSON);
  }

  return Math.round(overtimeMinutes / 60);
}

async function countReworkEntries(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .in("work_nature", ["rework", "unplanned_closing"])
    .gte("date", fromIso)
    .lte("date", toIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchTopReworkEntries(
  admin: AdminClient,
  fromIso: string,
  toIso: string,
): Promise<DetailRow[]> {
  const { data, error } = await admin
    .from("time_entries")
    .select("id, date, duration_minutes, work_nature, description, projects(name)")
    .in("work_nature", ["rework", "unplanned_closing"])
    .gte("date", fromIso)
    .lte("date", toIso)
    .order("date", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    date: string;
    duration_minutes: number;
    work_nature: "rework" | "unplanned_closing";
    description: string;
    projects: { name: string } | null;
  };

  const natureLabel: Record<Row["work_nature"], string> = {
    rework: "Poprawka",
    unplanned_closing: "Nieplanowane kończenie",
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    label: row.projects?.name ?? row.description ?? "Bez projektu",
    sublabel: `${natureLabel[row.work_nature]} · ${row.date} · ${Math.round(row.duration_minutes / 60)}h`,
    severity: "warning" as const,
  }));
}

async function countPendingLeaveRequests(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .lte("created_at", `${toIso}T23:59:59`)
    .gte("created_at", `${fromIso}T00:00:00`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchTopOverdueWorkItems(admin: AdminClient): Promise<DetailRow[]> {
  const { data, error } = await admin
    .from("work_items")
    .select("id, title, due_date, projects(name), clients(first_name, last_name)")
    .not("status", "in", `(${OPEN_WORK_ITEM_STATUSES_EXCLUDED.join(",")})`)
    .lt("due_date", toISODate(new Date()))
    .order("due_date", { ascending: true })
    .limit(5);
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    title: string;
    due_date: string;
    projects: { name: string } | null;
    clients: { first_name: string; last_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const clientName = row.clients
      ? formatPartyName({ firstName: row.clients.first_name, lastName: row.clients.last_name })
      : null;
    const context = [clientName, row.projects?.name].filter(Boolean).join(" — ");
    return {
      id: row.id,
      label: row.title,
      sublabel: [context, `Termin: ${row.due_date}`].filter(Boolean).join(" · "),
      severity: "critical" as const,
      href: workItemLinkUrl(row.id),
    };
  });
}

export async function computeTeamDomainReport(
  admin: AdminClient,
  asOf: Date,
  configByKey: Map<string, ReportKpiConfigRow>,
): Promise<DomainReport> {
  const kpis = [];

  const overdueConfig = configByKey.get("team.overdue_tasks");
  if (overdueConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "day");
    const [value, previousValue] = await Promise.all([
      countOverdueWorkItemsAsOf(admin, window.current.endDate),
      countOverdueWorkItemsAsOf(admin, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: overdueConfig,
        definition: KPI_DEFINITIONS["team.overdue_tasks"],
      }),
    );
  }

  const gapsConfig = configByKey.get("team.resource_plan_gaps");
  if (gapsConfig?.enabled) {
    const next7 = { startDate: toISODate(asOf), endDate: toISODate(new Date(asOf.getTime() + 7 * 86_400_000)) };
    const value = await countUnassignedResourcePlanGaps(admin, next7.startDate, next7.endDate);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: gapsConfig,
        definition: KPI_DEFINITIONS["team.resource_plan_gaps"],
      }),
    );
  }

  const unassignedTomorrowConfig = configByKey.get("team.unassigned_tomorrow");
  if (unassignedTomorrowConfig?.enabled) {
    const tomorrow = toISODate(new Date(asOf.getTime() + 86_400_000));
    const value = await countUnassignedResourcePlanGaps(admin, tomorrow, tomorrow);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: unassignedTomorrowConfig,
        definition: KPI_DEFINITIONS["team.unassigned_tomorrow"],
      }),
    );
  }

  const waitingConfig = configByKey.get("team.tasks_waiting_3d");
  if (waitingConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      countWaitingWorkItems(admin, window.current.startDate, window.current.endDate),
      countWaitingWorkItems(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: waitingConfig,
        definition: KPI_DEFINITIONS["team.tasks_waiting_3d"],
      }),
    );
  }

  const overtimeConfig = configByKey.get("team.overtime_hours");
  if (overtimeConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      sumOvertimeMinutes(admin, window.current.startDate, window.current.endDate),
      sumOvertimeMinutes(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: overtimeConfig,
        definition: KPI_DEFINITIONS["team.overtime_hours"],
      }),
    );
  }

  const reworkConfig = configByKey.get("team.rework_entries");
  let reworkWindow: ReturnType<typeof resolveComparisonWindow> | null = null;
  if (reworkConfig?.enabled) {
    reworkWindow = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      countReworkEntries(admin, reworkWindow.current.startDate, reworkWindow.current.endDate),
      countReworkEntries(admin, reworkWindow.previous.startDate, reworkWindow.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: reworkConfig,
        definition: KPI_DEFINITIONS["team.rework_entries"],
      }),
    );
  }

  const leaveConfig = configByKey.get("team.pending_leave_requests");
  if (leaveConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      countPendingLeaveRequests(admin, window.current.startDate, window.current.endDate),
      countPendingLeaveRequests(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: leaveConfig,
        definition: KPI_DEFINITIONS["team.pending_leave_requests"],
      }),
    );
  }

  const quickWins: QuickWin[] = [];
  const overdueKpi = kpis.find((kpi) => kpi.key === "team.overdue_tasks");
  if (overdueKpi && overdueKpi.severity !== "good") {
    quickWins.push({
      id: "team-overdue-tasks",
      severity: overdueKpi.severity === "critical" ? "critical" : "warning",
      title: "Zadania przeterminowane wymagają uwagi",
      description: `${overdueKpi.value} zadań zespołu jest po terminie.`,
      action: "Przejrzyj listę w Moja praca i przypisz priorytety lub nowe terminy.",
    });
  }

  const reworkKpi = kpis.find((kpi) => kpi.key === "team.rework_entries");

  const [overdueRows, reworkRows] = await Promise.all([
    overdueKpi && overdueKpi.value > 0 ? fetchTopOverdueWorkItems(admin) : Promise.resolve([]),
    reworkKpi && reworkKpi.value > 0 && reworkWindow
      ? fetchTopReworkEntries(admin, reworkWindow.current.startDate, reworkWindow.current.endDate)
      : Promise.resolve([]),
  ]);
  const detailRows = [...overdueRows, ...reworkRows];

  return {
    domain: "team",
    label: "Zespół i czas",
    kpis,
    severity: computeTileSeverity(kpis),
    trend: computeTileTrend(kpis),
    quickWins,
    detailRows,
  };
}
