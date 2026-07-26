import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { computeKpiResult, resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DetailRow, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

/**
 * Zadania przeterminowane "na dzień asOfIso" — prosty punktowy warunek (due_date < asOfIso),
 * nie okno [from,to]. Okno dnia (current=dziś, previous=wczoraj) dawałoby sprzeczny warunek
 * "due_date < dziś ORAZ due_date w [dziś,dziś]", czyli zawsze 0 — stąd dwa niezależne
 * zapytania: dziś vs wczoraj, każde jako osobna migawka "ile jest przeterminowanych na ten dzień".
 */
async function countOverdueKanbanTasksAsOf(admin: AdminClient, asOfIso: string) {
  const { count, error } = await admin
    .from("process_kanban_tasks")
    .select("id", { count: "exact", head: true })
    .is("closed_at", null)
    .not("due_date", "is", null)
    .lt("due_date", asOfIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countNewKanbanTasksFromClient(admin: AdminClient) {
  const { count, error } = await admin
    .from("process_kanban_tasks")
    .select("id", { count: "exact", head: true })
    .is("closed_at", null)
    .eq("is_new_for_team", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Kamień milowy = wpis w project_processes.milestone_dates (jsonb: id kamienia -> data
 * lub null). Liczymy tylko po dacie, bez sprawdzania czy powiązane elementy procesu są
 * już ukończone — pełne dopasowanie milestone -> jego pozycje w szablonie wymagałoby
 * dociągania template_snapshot per projekt, co wykracza poza jeden KPI. Traktować jako
 * górne oszacowanie (kamień milowy odhaczony tuż po terminie też się tu policzy).
 */
async function countOverdueMilestones(admin: AdminClient) {
  const { data, error } = await admin.from("project_processes").select("milestone_dates");
  if (error) throw new Error(error.message);

  const todayIso = toISODate(new Date());
  let count = 0;
  for (const row of (data ?? []) as Array<{ milestone_dates: Record<string, string | null> }>) {
    for (const date of Object.values(row.milestone_dates ?? {})) {
      if (date && date.slice(0, 10) < todayIso) {
        count += 1;
      }
    }
  }
  return count;
}

type OverdueKanbanTaskRow = {
  id: string;
  title: string;
  due_date: string;
  process_kanban_columns: {
    process_kanban_boards: {
      project_process_items: {
        project_id: string | null;
        projects: { name: string } | null;
      } | null;
    } | null;
  } | null;
};

async function fetchOverdueKanbanTaskRows(admin: AdminClient): Promise<DetailRow[]> {
  const { data, error } = await admin
    .from("process_kanban_tasks")
    .select(
      "id, title, due_date, process_kanban_columns(process_kanban_boards(project_process_items(project_id, projects(name))))",
    )
    .is("closed_at", null)
    .not("due_date", "is", null)
    .lt("due_date", toISODate(new Date()))
    .order("due_date", { ascending: true })
    .limit(5);
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as OverdueKanbanTaskRow[]).map((row) => {
    const projectItem = row.process_kanban_columns?.process_kanban_boards?.project_process_items ?? null;
    const projectId = projectItem?.project_id ?? null;
    const projectName = projectItem?.projects?.name ?? null;

    return {
      id: row.id,
      label: row.title || "Zadanie bez tytułu",
      sublabel: [projectName, `Termin: ${row.due_date}`].filter(Boolean).join(" · "),
      severity: "critical" as const,
      href: projectId ? `/projekty/${projectId}/proces` : "/tablice-wdrozen",
    };
  });
}

export async function computeDeploymentDomainReport(
  admin: AdminClient,
  asOf: Date,
  configByKey: Map<string, ReportKpiConfigRow>,
): Promise<DomainReport> {
  const kpis = [];

  const overdueConfig = configByKey.get("deployment.kanban_tasks_overdue");
  if (overdueConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "day");
    const [value, previousValue] = await Promise.all([
      countOverdueKanbanTasksAsOf(admin, window.current.endDate),
      countOverdueKanbanTasksAsOf(admin, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: overdueConfig,
        definition: KPI_DEFINITIONS["deployment.kanban_tasks_overdue"],
      }),
    );
  }

  const newFromClientConfig = configByKey.get("deployment.kanban_tasks_new_from_client");
  if (newFromClientConfig?.enabled) {
    const value = await countNewKanbanTasksFromClient(admin);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: newFromClientConfig,
        definition: KPI_DEFINITIONS["deployment.kanban_tasks_new_from_client"],
      }),
    );
  }

  const milestonesConfig = configByKey.get("deployment.milestones_overdue");
  if (milestonesConfig?.enabled) {
    const value = await countOverdueMilestones(admin);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: milestonesConfig,
        definition: KPI_DEFINITIONS["deployment.milestones_overdue"],
      }),
    );
  }

  const quickWins: QuickWin[] = [];
  const milestonesKpi = kpis.find((kpi) => kpi.key === "deployment.milestones_overdue");
  if (milestonesKpi && milestonesKpi.value > 0) {
    quickWins.push({
      id: "deployment-milestones-overdue",
      severity: milestonesKpi.severity === "critical" ? "critical" : "warning",
      title: "Kamienie milowe po terminie",
      description: `${milestonesKpi.value} kamieni milowych w procesach projektów ma minięty termin.`,
      action: "Przejrzyj tablice wdrożeń i zaktualizuj daty lub domknij zaległe etapy.",
    });
  }

  const overdueKanbanKpi = kpis.find((kpi) => kpi.key === "deployment.kanban_tasks_overdue");
  if (overdueKanbanKpi && overdueKanbanKpi.value > 0) {
    quickWins.push({
      id: "deployment-kanban-overdue",
      severity: overdueKanbanKpi.severity === "critical" ? "critical" : "warning",
      title: "Zadania kanban po terminie",
      description: `${overdueKanbanKpi.value} zadań na tablicach wdrożeniowych przekroczyło termin.`,
      action: "Zaktualizuj terminy lub domknij zaległe zadania na tablicach projektów.",
    });
  }

  const detailRows =
    overdueKanbanKpi && overdueKanbanKpi.value > 0 ? await fetchOverdueKanbanTaskRows(admin) : [];

  return {
    domain: "deployment",
    label: "Wdrożenia",
    kpis,
    severity: computeTileSeverity(kpis),
    trend: computeTileTrend(kpis),
    quickWins,
    detailRows,
  };
}
