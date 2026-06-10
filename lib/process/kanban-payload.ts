import type { KanbanColumnTemplate, KanbanTemplatePayload } from "@/lib/process/kanban-types";
import { defaultKanbanTemplatePayload } from "@/lib/process/kanban-types";

export function normalizeKanbanTemplatePayload(value: unknown): KanbanTemplatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultKanbanTemplatePayload();
  }

  const data = value as Record<string, unknown>;
  const rawColumns = Array.isArray(data.columns) ? data.columns : [];
  const columns = rawColumns
    .map((column, index) => {
      if (!column || typeof column !== "object" || Array.isArray(column)) {
        return null;
      }
      const entry = column as Record<string, unknown>;
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!title) {
        return null;
      }
      return {
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        title,
        position: typeof entry.position === "number" ? entry.position : index,
      } satisfies KanbanColumnTemplate;
    })
    .filter((column): column is KanbanColumnTemplate => column !== null)
    .sort((a, b) => a.position - b.position);

  const accessFields = {
    publicAccessPassword:
      typeof data.publicAccessPassword === "string" && data.publicAccessPassword.trim()
        ? data.publicAccessPassword
        : undefined,
    publicAccessUsername:
      typeof data.publicAccessUsername === "string" && data.publicAccessUsername.trim()
        ? data.publicAccessUsername.trim()
        : undefined,
    publicAuthorName:
      typeof data.publicAuthorName === "string" && data.publicAuthorName.trim()
        ? data.publicAuthorName.trim()
        : undefined,
  };

  if (!columns.length) {
    return { ...defaultKanbanTemplatePayload(), ...accessFields };
  }

  return { columns, ...accessFields };
}

export function isKanbanTemplatePayload(value: unknown): value is KanbanTemplatePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as KanbanTemplatePayload).columns)
  );
}
