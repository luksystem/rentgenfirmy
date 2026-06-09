import { normalizeKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import { defaultKanbanTemplatePayload } from "@/lib/process/kanban-types";
import type { ChecklistItemPayload, ProcessElementPayload, ProcessItemKind } from "@/lib/process/types";

export function emptyChecklistPayload(): ChecklistItemPayload {
  return { lines: [] };
}

export function checklistPayloadFromTexts(texts: string[]): ChecklistItemPayload {
  return {
    lines: texts
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({
        id: crypto.randomUUID(),
        text,
        checked: false,
      })),
  };
}

export function cloneTemplatePayloadForProject(templatePayload: ChecklistItemPayload): ChecklistItemPayload {
  return {
    lines: templatePayload.lines.map((line) => ({
      id: line.id,
      text: line.text,
      checked: false,
    })),
  };
}

export function resolveElementDefaultPayload(
  kind: ProcessItemKind,
  raw: unknown,
  title: string,
): ProcessElementPayload {
  if (kind === "kanban") {
    const normalized = normalizeKanbanTemplatePayload(raw);
    return normalized.columns.length ? normalized : defaultKanbanTemplatePayload();
  }

  const normalized = normalizeChecklistPayload(raw);
  if (normalized.lines.length > 0) {
    return normalized;
  }

  const fallback = templatePayloadFromTitle(title, kind);
  return "lines" in fallback ? fallback : emptyChecklistPayload();
}

export function templatePayloadFromTitle(title: string, kind: ProcessItemKind): ProcessElementPayload {
  if (kind === "kanban") {
    return defaultKanbanTemplatePayload();
  }

  if (kind !== "checklist") {
    return emptyChecklistPayload();
  }

  const text = title.trim();
  return text ? checklistPayloadFromTexts([text]) : emptyChecklistPayload();
}

export function normalizeChecklistPayload(value: unknown): ChecklistItemPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyChecklistPayload();
  }

  const data = value as Record<string, unknown>;
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  const lines = rawLines
    .map((line) => {
      if (!line || typeof line !== "object" || Array.isArray(line)) {
        return null;
      }
      const entry = line as Record<string, unknown>;
      const text = typeof entry.text === "string" ? entry.text.trim() : "";
      if (!text) {
        return null;
      }
      return {
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        text,
        checked: Boolean(entry.checked),
        checkedAt: typeof entry.checkedAt === "string" ? entry.checkedAt : undefined,
        checkedBy: typeof entry.checkedBy === "string" ? entry.checkedBy : undefined,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  return {
    lines,
    note: typeof data.note === "string" ? data.note : undefined,
  };
}

export function isChecklistPayloadComplete(payload: ChecklistItemPayload) {
  return payload.lines.length > 0 && payload.lines.every((line) => line.checked);
}

export function checklistProgress(payload: ChecklistItemPayload) {
  const total = payload.lines.length;
  const completed = payload.lines.filter((line) => line.checked).length;
  return { total, completed };
}

export function deriveProcessItemStatus(
  kind: ProcessItemKind,
  payload: ChecklistItemPayload,
  explicitStatus: string,
): "open" | "in_progress" | "completed" {
  if (explicitStatus === "completed") {
    return "completed";
  }

  if (kind === "checklist") {
    const { total, completed } = checklistProgress(payload);
    if (total > 0 && completed === total) {
      return "completed";
    }
    if (completed > 0) {
      return "in_progress";
    }
  }

  return explicitStatus === "in_progress" ? "in_progress" : "open";
}
