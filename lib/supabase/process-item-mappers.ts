import {
  deriveProcessItemStatus,
  normalizeChecklistPayload,
} from "@/lib/process/item-payload";
import type { InternalAcceptanceState } from "@/lib/internal-acceptance/types";
import { normalizeInternalAcceptanceState } from "@/lib/internal-acceptance/state-normalize";
import type {
  ChecklistItemPayload,
  ProcessItemKind,
  ProjectProcessItem,
  ProjectProcessItemStatus,
} from "@/lib/process/types";
import type { ProjectProcessItemRow } from "@/lib/supabase/database.types";

function parseInternalAcceptanceState(value: unknown): InternalAcceptanceState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return normalizeInternalAcceptanceState(value as InternalAcceptanceState);
}

function isProcessItemKind(value: string): value is ProcessItemKind {
  return value === "checklist" || value === "protocol" || value === "settlement" || value === "kanban";
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
    isInternalAcceptance: Boolean(row.is_internal_acceptance),
    internalAcceptanceState: parseInternalAcceptanceState(row.internal_acceptance_state),
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_name ?? null,
    signedAt: row.signed_at ?? null,
    signedBy: row.signed_by ?? null,
    signedByName: row.signed_by_name ?? null,
    signatureNote: row.signature_note ?? null,
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

export function projectProcessItemAssigneeUpdate(
  assigneeId: string | null,
  assigneeName: string | null,
) {
  return {
    assignee_id: assigneeId,
    assignee_name: assigneeName,
    signed_at: null,
    signed_by: null,
    signed_by_name: null,
    signature_note: null,
    updated_at: new Date().toISOString(),
  };
}

export function projectProcessItemSignatureUpdate(
  signedBy: string,
  signedByName: string,
  signatureNote: string | null,
) {
  return {
    signed_at: new Date().toISOString(),
    signed_by: signedBy,
    signed_by_name: signedByName,
    signature_note: signatureNote,
    updated_at: new Date().toISOString(),
  };
}
