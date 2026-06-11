import {
  KANBAN_HUB_NO_CLIENT_ID,
  type KanbanHubBoardEntry,
  type KanbanHubClientTile,
} from "@/lib/process/kanban-hub-types";
import { getSupabase } from "@/lib/supabase/client";

type BoardRow = { id: string; project_process_item_id: string };
type ItemRow = { id: string; project_id: string; template_item_id: string };
type ProjectRow = { id: string; name: string; type: string; client_id: string | null };
type ColumnRow = { id: string; board_id: string };
type TaskRow = { column_id: string; closed_at: string | null; is_new_for_team: boolean };

type HubGraph = {
  boards: BoardRow[];
  items: ItemRow[];
  projects: ProjectRow[];
  clientNames: Map<string, string>;
  boardOpenCounts: Map<string, number>;
  boardNewCounts: Map<string, number>;
};

async function loadKanbanHubGraph(): Promise<HubGraph> {
  const supabase = getSupabase();

  const { data: boards, error: boardsError } = await supabase
    .from("process_kanban_boards")
    .select("id, project_process_item_id");

  if (boardsError) {
    throw new Error(boardsError.message);
  }

  const boardRows = (boards ?? []) as BoardRow[];
  if (!boardRows.length) {
    return {
      boards: [],
      items: [],
      projects: [],
      clientNames: new Map(),
      boardOpenCounts: new Map(),
      boardNewCounts: new Map(),
    };
  }

  const itemIds = boardRows.map((row) => row.project_process_item_id);
  const { data: items, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, project_id, template_item_id")
    .in("id", itemIds)
    .eq("kind", "kanban");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemRows = (items ?? []) as ItemRow[];
  const projectIds = [...new Set(itemRows.map((row) => row.project_id))];

  const { data: projects, error: projectsError } = projectIds.length
    ? await supabase.from("projects").select("id, name, type, client_id").in("id", projectIds)
    : { data: [], error: null };

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const projectRows = (projects ?? []) as ProjectRow[];
  const clientIds = [
    ...new Set(projectRows.map((row) => row.client_id).filter((id): id is string => Boolean(id))),
  ];

  const clientNames = new Map<string, string>();
  if (clientIds.length) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, full_name")
      .in("id", clientIds);

    if (clientsError) {
      throw new Error(clientsError.message);
    }

    for (const client of clients ?? []) {
      clientNames.set(client.id as string, (client.full_name as string)?.trim() || "Klient");
    }
  }

  const boardIds = boardRows.map((row) => row.id);
  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("id, board_id")
    .in("board_id", boardIds);

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const columnRows = (columns ?? []) as ColumnRow[];
  const columnToBoard = new Map(columnRows.map((row) => [row.id, row.board_id]));
  const boardOpenCounts = new Map<string, number>();
  const boardNewCounts = new Map<string, number>();

  if (columnRows.length) {
    const { data: tasks, error: tasksError } = await supabase
      .from("process_kanban_tasks")
      .select("column_id, closed_at, is_new_for_team")
      .in(
        "column_id",
        columnRows.map((row) => row.id),
      );

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    for (const task of (tasks ?? []) as TaskRow[]) {
      const boardId = columnToBoard.get(task.column_id);
      if (!boardId) {
        continue;
      }
      if (!task.closed_at) {
        boardOpenCounts.set(boardId, (boardOpenCounts.get(boardId) ?? 0) + 1);
        if (task.is_new_for_team) {
          boardNewCounts.set(boardId, (boardNewCounts.get(boardId) ?? 0) + 1);
        }
      }
    }
  }

  return {
    boards: boardRows,
    items: itemRows,
    projects: projectRows,
    clientNames,
    boardOpenCounts,
    boardNewCounts,
  };
}

function resolveClientId(clientId: string | null | undefined) {
  return clientId?.trim() || KANBAN_HUB_NO_CLIENT_ID;
}

function resolveClientName(clientId: string, clientNames: Map<string, string>) {
  if (clientId === KANBAN_HUB_NO_CLIENT_ID) {
    return "Bez klienta";
  }
  return clientNames.get(clientId) ?? "Klient";
}

function buildBoardEntries(graph: HubGraph, clientIdFilter?: string): KanbanHubBoardEntry[] {
  const itemById = new Map(graph.items.map((row) => [row.id, row]));
  const projectById = new Map(graph.projects.map((row) => [row.id, row]));
  const entries: KanbanHubBoardEntry[] = [];

  for (const board of graph.boards) {
    const item = itemById.get(board.project_process_item_id);
    if (!item) {
      continue;
    }

    const project = projectById.get(item.project_id);
    if (!project) {
      continue;
    }

    const clientId = resolveClientId(project.client_id);
    if (clientIdFilter && clientId !== clientIdFilter) {
      continue;
    }

    entries.push({
      boardId: board.id,
      projectProcessItemId: item.id,
      projectId: project.id,
      projectName: project.name?.trim() || "Projekt",
      projectType: project.type?.trim() || "Dom",
      templateItemId: item.template_item_id,
      openTaskCount: graph.boardOpenCounts.get(board.id) ?? 0,
      newTaskCount: graph.boardNewCounts.get(board.id) ?? 0,
    });
  }

  return entries.sort((a, b) => {
    const byProject = a.projectName.localeCompare(b.projectName, "pl");
    if (byProject !== 0) {
      return byProject;
    }
    return b.openTaskCount - a.openTaskCount;
  });
}

export async function fetchKanbanHubClients(): Promise<KanbanHubClientTile[]> {
  const graph = await loadKanbanHubGraph();
  const entries = buildBoardEntries(graph);
  const tiles = new Map<string, KanbanHubClientTile>();

  for (const entry of entries) {
    const project = graph.projects.find((row) => row.id === entry.projectId);
    if (!project) {
      continue;
    }

    const clientId = resolveClientId(project.client_id);
    const current =
      tiles.get(clientId) ??
      ({
        clientId,
        clientName: resolveClientName(clientId, graph.clientNames),
        projectCount: 0,
        boardCount: 0,
        openTaskCount: 0,
        newTaskCount: 0,
      } satisfies KanbanHubClientTile);

    current.boardCount += 1;
    current.openTaskCount += entry.openTaskCount;
    current.newTaskCount += entry.newTaskCount;
    tiles.set(clientId, current);
  }

  for (const tile of tiles.values()) {
    tile.projectCount = new Set(
      entries.filter((entry) => {
        const project = graph.projects.find((row) => row.id === entry.projectId);
        return project && resolveClientId(project.client_id) === tile.clientId;
      }).map((entry) => entry.projectId),
    ).size;
  }

  return [...tiles.values()].sort((a, b) => {
    if (b.openTaskCount !== a.openTaskCount) {
      return b.openTaskCount - a.openTaskCount;
    }
    return a.clientName.localeCompare(b.clientName, "pl");
  });
}

export async function fetchKanbanHubClientBoards(clientId: string): Promise<KanbanHubBoardEntry[]> {
  const graph = await loadKanbanHubGraph();
  return buildBoardEntries(graph, clientId);
}

export async function fetchKanbanHubBoardEntry(
  projectProcessItemId: string,
): Promise<KanbanHubBoardEntry | null> {
  const graph = await loadKanbanHubGraph();
  return buildBoardEntries(graph).find((entry) => entry.projectProcessItemId === projectProcessItemId) ?? null;
}
