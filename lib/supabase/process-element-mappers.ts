import { normalizeChecklistPayload, templatePayloadFromTitle } from "@/lib/process/item-payload";
import type { ProcessElement, ProcessItemKind } from "@/lib/process/types";
import type { ProcessElementRow } from "@/lib/supabase/database.types";

function isProcessItemKind(value: string): value is ProcessItemKind {
  return value === "checklist" || value === "protocol" || value === "settlement";
}

export function rowToProcessElement(row: ProcessElementRow): ProcessElement {
  const kind = isProcessItemKind(row.kind) ? row.kind : "checklist";
  const normalized = normalizeChecklistPayload(row.default_payload);
  const defaultPayload =
    normalized.lines.length > 0 ? normalized : templatePayloadFromTitle(row.title, kind);

  return {
    id: row.id,
    kind,
    title: row.title,
    description: row.description,
    defaultPayload,
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
    updated_at: element.updatedAt,
  };
}
