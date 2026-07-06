import { resolveElementDefaultPayload } from "@/lib/process/item-payload";
import type { ProcessElement, ProcessItemKind } from "@/lib/process/types";
import type { ProcessElementRow } from "@/lib/supabase/database.types";

function isProcessItemKind(value: string): value is ProcessItemKind {
  return (
    value === "checklist" ||
    value === "protocol" ||
    value === "settlement" ||
    value === "kanban" ||
    value === "note"
  );
}

export function rowToProcessElement(row: ProcessElementRow): ProcessElement {
  const kind = isProcessItemKind(row.kind) ? row.kind : "checklist";
  const defaultPayload = resolveElementDefaultPayload(kind, row.default_payload, row.title);

  return {
    id: row.id,
    kind,
    title: row.title,
    description: row.description,
    defaultPayload,
    isInternalAcceptance: Boolean(row.is_internal_acceptance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function processElementToInsert(element: ProcessElement) {
  return {
    id: element.id,
    kind: element.kind,
    title: element.title,
    description: element.description,
    default_payload: element.defaultPayload,
    is_internal_acceptance: element.isInternalAcceptance ?? false,
    created_at: element.createdAt,
    updated_at: element.updatedAt,
  };
}

export function processElementToUpdate(element: ProcessElement) {
  return {
    kind: element.kind,
    title: element.title,
    description: element.description,
    default_payload: element.defaultPayload,
    is_internal_acceptance: element.isInternalAcceptance ?? false,
    updated_at: element.updatedAt,
  };
}
