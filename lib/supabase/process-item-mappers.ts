import {
  deriveProcessItemStatus,
  normalizeChecklistPayload,
} from "@/lib/process/item-payload";
import type {
  ChecklistItemPayload,
  ProcessItemKind,
  ProjectProcessItem,
  ProjectProcessItemStatus,
} from "@/lib/process/types";
import type { ProjectProcessItemRow } from "@/lib/supabase/database.types";

function isProcessItemKind(value: string): value is ProcessItemKind {
  return value === "checklist" || value === "protocol" || value === "settlement";
}

function isProjectProcessItemStatus(value: string): value is ProjectProcessItemStatus {
  return value === "open" || value === "in_progress" || value === "completed";
}

export function rowToProjectProcessItem(row: ProjectProcessItemRow): ProjectProcessItem {
  const kind = isProcessItemKind(row.kind) ? row.kind : "checklist";
  const payload = normalizeChecklistPayload(row.payload);
  const status = deriveProcessItemStatus(
    kind,
    payload,
    isProjectProcessItemStatus(row.status) ? row.status : "open",
  );

  return {
    id: row.id,
    projectId: row.project_id,
    templateItemId: row.template_item_id,
    kind,
    payload,
    status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectProcessItemToUpdate(
  payload: ChecklistItemPayload,
  status: ProjectProcessItemStatus,
) {
  return {
    payload,
    status,
    updated_at: new Date().toISOString(),
  };
}
