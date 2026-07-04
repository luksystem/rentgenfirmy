import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  PROJECT_AGREEMENT_STATUS_LABELS,
  type ProjectAgreementCategory,
  type ProjectAgreementStatus,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import {
  FULFILLMENT_STATUS_LABELS,
  type FulfillmentStatus,
} from "@/lib/dashboard/satisfaction-types";
import { rowToAgreement } from "@/lib/supabase/project-agreement-collaboration-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ServiceType } from "@/lib/service/types";

export const PROJECT_AI_CONTEXT_MAX_CHARS = 10_000;

type AgreementRow = Parameters<typeof rowToAgreement>[0];

type SpecRow = {
  id: string;
  project_id: string;
  catalog_item_id: string | null;
  title: string;
  category: string;
  description: string;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
};

type FulfillmentRow = {
  specification_item_id?: string;
  agreement_id?: string;
  status: string;
  note: string;
};

type KanbanTaskSummary = {
  boardLabel: string;
  columnTitle: string;
  title: string;
  description: string;
  status: "open" | "closed";
};

type RecentServiceSummary = {
  title: string;
  serviceType: ServiceType;
  description: string;
  status: string;
};

export type ProjectAiContext = {
  projectId: string;
  projectName: string;
  specificationItems: Array<{
    title: string;
    category: string;
    description: string;
    notes: string;
    fulfillmentStatus: FulfillmentStatus | null;
    fulfillmentNote: string | null;
  }>;
  agreements: Array<{
    title: string;
    category: ProjectAgreementCategory;
    status: ProjectAgreementStatus;
    body: string;
    costNote: string | null;
  }>;
  kanbanTasks: KanbanTaskSummary[];
  recentServices: RecentServiceSummary[];
};

function excerpt(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars - 1)}…`;
}

function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return value === "pending" || value === "met" || value === "not_met" || value === "partial";
}

function rowToSpec(row: SpecRow): ProjectSpecificationItem {
  return {
    id: row.id,
    projectId: row.project_id,
    catalogItemId: row.catalog_item_id,
    title: row.title,
    category: row.category,
    description: row.description,
    notes: row.notes,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingTableError(message: string): boolean {
  return (
    message.includes("does not exist") ||
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  );
}

async function fetchSpecificationBundle(projectId: string) {
  const supabase = getSupabaseAdmin();
  const [specResult, fulfillmentResult] = await Promise.all([
    supabase
      .from("project_specification_items")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase.from("project_specification_fulfillments").select("*").eq("project_id", projectId),
  ]);

  if (specResult.error && !isMissingTableError(specResult.error.message)) {
    throw new Error(specResult.error.message);
  }
  if (fulfillmentResult.error && !isMissingTableError(fulfillmentResult.error.message)) {
    throw new Error(fulfillmentResult.error.message);
  }

  const fulfillmentBySpecId = new Map<string, FulfillmentRow>();
  for (const row of (fulfillmentResult.data ?? []) as FulfillmentRow[]) {
    if (row.specification_item_id) {
      fulfillmentBySpecId.set(row.specification_item_id, row);
    }
  }

  const specificationItems = (specResult.data ?? []).map((row) => {
    const spec = rowToSpec(row as SpecRow);
    const fulfillment = fulfillmentBySpecId.get(spec.id);
    return {
      title: spec.title,
      category: spec.category,
      description: spec.description,
      notes: spec.notes,
      fulfillmentStatus:
        fulfillment && isFulfillmentStatus(fulfillment.status) ? fulfillment.status : null,
      fulfillmentNote: fulfillment?.note?.trim() || null,
    };
  });

  return specificationItems;
}

async function fetchAgreementsBundle(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "cancelled")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => rowToAgreement(row as AgreementRow))
    .filter((agreement) => agreement.status !== "cancelled")
    .map((agreement: ProjectClientAgreement) => ({
      title: agreement.title,
      category: agreement.category,
      status: agreement.status,
      body: agreement.body,
      costNote: agreement.costNote,
    }));
}

async function fetchKanbanTasksForProject(projectId: string): Promise<KanbanTaskSummary[]> {
  const supabase = getSupabaseAdmin();

  const { data: processItems, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, template_item_id, status")
    .eq("project_id", projectId)
    .eq("kind", "kanban");

  if (itemsError) {
    if (isMissingTableError(itemsError.message)) {
      return [];
    }
    throw new Error(itemsError.message);
  }

  const items = processItems ?? [];
  if (!items.length) {
    return [];
  }

  const templateItemIds = [...new Set(items.map((item) => item.template_item_id as string))];
  const { data: templateItems } = await supabase
    .from("process_items")
    .select("id, title")
    .in("id", templateItemIds);

  const templateTitleById = new Map(
    (templateItems ?? []).map((row) => [row.id as string, (row.title as string).trim()]),
  );

  const itemLabelById = new Map(
    items.map((item) => {
      const title = templateTitleById.get(item.template_item_id as string);
      const status = (item.status as string)?.trim();
      const label = title
        ? status
          ? `${title} (${status})`
          : title
        : status
          ? `Wdrożenie (${status})`
          : "Wdrożenie";
      return [item.id as string, label];
    }),
  );

  const itemIds = items.map((item) => item.id as string);
  const { data: boards, error: boardsError } = await supabase
    .from("process_kanban_boards")
    .select("id, project_process_item_id")
    .in("project_process_item_id", itemIds);

  if (boardsError) {
    if (isMissingTableError(boardsError.message)) {
      return [];
    }
    throw new Error(boardsError.message);
  }

  const boardRows = boards ?? [];
  if (!boardRows.length) {
    return [];
  }

  const boardIds = boardRows.map((row) => row.id as string);
  const boardLabelById = new Map(
    boardRows.map((row) => [
      row.id as string,
      itemLabelById.get(row.project_process_item_id as string) ?? "Wdrożenie",
    ]),
  );

  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("id, board_id, title")
    .in("board_id", boardIds)
    .order("position", { ascending: true });

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const columnRows = columns ?? [];
  if (!columnRows.length) {
    return [];
  }

  const columnMetaById = new Map(
    columnRows.map((row) => [
      row.id as string,
      {
        title: (row.title as string).trim() || "Kolumna",
        boardLabel: boardLabelById.get(row.board_id as string) ?? "Wdrożenie",
      },
    ]),
  );

  const columnIds = columnRows.map((row) => row.id as string);
  const { data: tasks, error: tasksError } = await supabase
    .from("process_kanban_tasks")
    .select("column_id, title, description, closed_at")
    .in("column_id", columnIds)
    .order("position", { ascending: true });

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  return (tasks ?? []).map((row) => {
    const columnMeta = columnMetaById.get(row.column_id as string);
    return {
      boardLabel: columnMeta?.boardLabel ?? "Wdrożenie",
      columnTitle: columnMeta?.title ?? "Kolumna",
      title: (row.title as string).trim() || "Zadanie",
      description: (row.description as string).trim(),
      status: row.closed_at ? "closed" : "open",
    } satisfies KanbanTaskSummary;
  });
}

async function fetchRecentServicesForProject(projectId: string): Promise<RecentServiceSummary[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("title, service_type, status, ai_estimate")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const aiEstimate = row.ai_estimate as { description?: string } | null;
    return {
      title: (row.title as string).trim() || "Serwis",
      serviceType: row.service_type as ServiceType,
      description: typeof aiEstimate?.description === "string" ? aiEstimate.description.trim() : "",
      status: (row.status as string).trim(),
    };
  });
}

export async function fetchProjectAiContext(input: {
  projectId: string;
  projectName?: string;
}): Promise<ProjectAiContext | null> {
  const projectId = input.projectId.trim();
  if (!projectId) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  let projectName = input.projectName?.trim() ?? "";

  if (!projectName) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    projectName = projectRow?.name?.trim() ?? "Projekt";
  }

  const [specificationItems, agreements, kanbanTasks, recentServices] = await Promise.all([
    fetchSpecificationBundle(projectId),
    fetchAgreementsBundle(projectId),
    fetchKanbanTasksForProject(projectId),
    fetchRecentServicesForProject(projectId),
  ]);

  if (
    specificationItems.length === 0 &&
    agreements.length === 0 &&
    kanbanTasks.length === 0 &&
    recentServices.length === 0
  ) {
    return null;
  }

  return {
    projectId,
    projectName,
    specificationItems,
    agreements,
    kanbanTasks,
    recentServices,
  };
}

export function formatProjectAiContextForPrompt(
  context: ProjectAiContext,
  maxChars = PROJECT_AI_CONTEXT_MAX_CHARS,
): string {
  const sections: string[] = [`Projekt: ${context.projectName}`];

  if (context.specificationItems.length > 0) {
    const lines = context.specificationItems.map((item, index) => {
      const fulfillment = item.fulfillmentStatus
        ? FULFILLMENT_STATUS_LABELS[item.fulfillmentStatus]
        : "brak oceny realizacji";
      const parts = [
        `${index + 1}. [${item.category}] ${item.title} — realizacja: ${fulfillment}`,
      ];
      const description = excerpt(item.description, 220);
      if (description) {
        parts.push(`Opis: ${description}`);
      }
      const notes = excerpt(item.notes, 120);
      if (notes) {
        parts.push(`Notatki: ${notes}`);
      }
      if (item.fulfillmentNote) {
        parts.push(`Uwagi realizacji: ${excerpt(item.fulfillmentNote, 120)}`);
      }
      return parts.join(" ");
    });
    sections.push(`Specyfikacja projektu (${context.specificationItems.length} pozycji):\n${lines.join("\n")}`);
  }

  if (context.agreements.length > 0) {
    const lines = context.agreements.map((agreement, index) => {
      const category = PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category];
      const status = PROJECT_AGREEMENT_STATUS_LABELS[agreement.status];
      const parts = [`${index + 1}. [${category}, ${status}] ${agreement.title}`];
      const body = excerpt(agreement.body, 280);
      if (body) {
        parts.push(`Treść: ${body}`);
      }
      if (agreement.costNote?.trim()) {
        parts.push(`Koszt: ${excerpt(agreement.costNote, 100)}`);
      }
      return parts.join(" ");
    });
    sections.push(`Ustalenia z klientem (${context.agreements.length}):\n${lines.join("\n")}`);
  }

  if (context.kanbanTasks.length > 0) {
    const openTasks = context.kanbanTasks.filter((task) => task.status === "open");
    const closedTasks = context.kanbanTasks.filter((task) => task.status === "closed");
    const prioritized = [...openTasks, ...closedTasks].slice(0, 40);
    const lines = prioritized.map((task, index) => {
      const state = task.status === "open" ? "otwarte" : "zamknięte";
      const parts = [
        `${index + 1}. [${task.boardLabel} / ${task.columnTitle}, ${state}] ${task.title}`,
      ];
      const description = excerpt(task.description, 180);
      if (description) {
        parts.push(`Opis: ${description}`);
      }
      return parts.join(" ");
    });
    sections.push(
      `Zadania wdrożenia Kanban (${context.kanbanTasks.length}, pokazano ${prioritized.length}):\n${lines.join("\n")}`,
    );
  }

  if (context.recentServices.length > 0) {
    const lines = context.recentServices.map((service, index) => {
      const parts = [
        `${index + 1}. ${service.title} (${service.serviceType}, ${service.status})`,
      ];
      const description = excerpt(service.description, 200);
      if (description) {
        parts.push(`Opis: ${description}`);
      }
      return parts.join(" ");
    });
    sections.push(`Historia serwisów projektu (${context.recentServices.length}):\n${lines.join("\n")}`);
  }

  let formatted = sections.join("\n\n");
  if (formatted.length > maxChars) {
    formatted = `${formatted.slice(0, maxChars - 1)}…`;
  }

  return formatted;
}
