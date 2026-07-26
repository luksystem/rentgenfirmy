import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { formatPartyName } from "@/lib/party/display-name";
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

/**
 * Rozwiązanie zadanie kanban -> projekt/klient idzie 4 skokami FK
 * (task -> kolumna -> tablica -> element procesu -> projekt -> klient). Zamiast kruchego,
 * głęboko zagnieżdżonego selecta PostgREST (który przy niejednoznacznej relacji potrafi po
 * cichu zwrócić null i wylądować na domyślnym /tablice-wdrozen), robimy to jawnymi,
 * wsadowymi zapytaniami — mniej eleganckie, ale łatwe do zweryfikowania krok po kroku.
 * Deep-link do KONKRETNEGO zadania na tablicy nie istnieje w tym module (proces-kanban-board
 * otwiera zadanie tylko przez lokalny stan komponentu, bez parametru w URL) — najlepsze
 * dostępne miejsce docelowe to strona procesu danego projektu.
 */
async function fetchOverdueKanbanTaskRows(admin: AdminClient): Promise<DetailRow[]> {
  const { data: taskRows, error: tasksError } = await admin
    .from("process_kanban_tasks")
    .select("id, title, due_date, column_id")
    .is("closed_at", null)
    .not("due_date", "is", null)
    .lt("due_date", toISODate(new Date()))
    .order("due_date", { ascending: true })
    .limit(5);
  if (tasksError) throw new Error(tasksError.message);

  const tasks = (taskRows ?? []) as Array<{
    id: string;
    title: string;
    due_date: string;
    column_id: string;
  }>;
  if (tasks.length === 0) {
    return [];
  }

  const columnIds = [...new Set(tasks.map((task) => task.column_id))];
  const { data: columnRows, error: columnsError } = await admin
    .from("process_kanban_columns")
    .select("id, board_id")
    .in("id", columnIds);
  if (columnsError) throw new Error(columnsError.message);
  const boardIdByColumn = new Map(
    ((columnRows ?? []) as Array<{ id: string; board_id: string }>).map((row) => [row.id, row.board_id]),
  );

  const boardIds = [...new Set([...boardIdByColumn.values()])];
  const { data: boardRows, error: boardsError } = boardIds.length
    ? await admin.from("process_kanban_boards").select("id, project_process_item_id").in("id", boardIds)
    : { data: [] as Array<{ id: string; project_process_item_id: string }>, error: null };
  if (boardsError) throw new Error(boardsError.message);
  const itemIdByBoard = new Map(
    ((boardRows ?? []) as Array<{ id: string; project_process_item_id: string }>).map((row) => [
      row.id,
      row.project_process_item_id,
    ]),
  );

  const itemIds = [...new Set([...itemIdByBoard.values()])];
  const { data: itemRows, error: itemsError } = itemIds.length
    ? await admin.from("project_process_items").select("id, project_id").in("id", itemIds)
    : { data: [] as Array<{ id: string; project_id: string | null }>, error: null };
  if (itemsError) throw new Error(itemsError.message);
  const projectIdByItem = new Map(
    ((itemRows ?? []) as Array<{ id: string; project_id: string | null }>).map((row) => [row.id, row.project_id]),
  );

  const projectIds = [...new Set([...projectIdByItem.values()].filter((id): id is string => Boolean(id)))];
  const { data: projectRows, error: projectsError } = projectIds.length
    ? await admin.from("projects").select("id, name, client_id").in("id", projectIds)
    : { data: [] as Array<{ id: string; name: string; client_id: string | null }>, error: null };
  if (projectsError) throw new Error(projectsError.message);
  const projects = (projectRows ?? []) as Array<{ id: string; name: string; client_id: string | null }>;
  const projectById = new Map(projects.map((row) => [row.id, row]));

  const clientIds = [...new Set(projects.map((row) => row.client_id).filter((id): id is string => Boolean(id)))];
  const { data: clientRows, error: clientsError } = clientIds.length
    ? await admin.from("clients").select("id, first_name, last_name").in("id", clientIds)
    : { data: [] as Array<{ id: string; first_name: string; last_name: string }>, error: null };
  if (clientsError) throw new Error(clientsError.message);
  const clientNameById = new Map(
    ((clientRows ?? []) as Array<{ id: string; first_name: string; last_name: string }>).map((row) => [
      row.id,
      formatPartyName({ firstName: row.first_name, lastName: row.last_name }),
    ]),
  );

  return tasks.map((task) => {
    const boardId = boardIdByColumn.get(task.column_id);
    const itemId = boardId ? itemIdByBoard.get(boardId) : undefined;
    const projectId = itemId ? (projectIdByItem.get(itemId) ?? null) : null;
    const project = projectId ? projectById.get(projectId) : undefined;
    const clientName = project?.client_id ? clientNameById.get(project.client_id) : undefined;
    const context = [clientName, project?.name].filter(Boolean).join(" — ");

    return {
      id: task.id,
      label: task.title || "Zadanie bez tytułu",
      sublabel: [context, `Termin: ${task.due_date}`].filter(Boolean).join(" · "),
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
