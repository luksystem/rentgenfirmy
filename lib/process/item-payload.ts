import { normalizeKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import { defaultKanbanTemplatePayload } from "@/lib/process/kanban-types";
import type {
  ChecklistItemPayload,
  ChecklistLine,
  ChecklistLineAttachment,
  ChecklistLineStatus,
  ChecklistSection,
  ProcessElementPayload,
  ProcessItemKind,
} from "@/lib/process/types";

export function emptyChecklistPayload(): ChecklistItemPayload {
  return { sections: [] };
}

export function getChecklistSections(payload: ChecklistItemPayload): ChecklistSection[] {
  if (payload.sections?.length) {
    return [...payload.sections].sort((a, b) => a.position - b.position);
  }

  const legacyLines = payload.lines ?? [];
  if (!legacyLines.length) {
    return [];
  }

  return [
    {
      id: "legacy-default",
      name: "Checklista",
      position: 0,
      lines: legacyLines,
    },
  ];
}

export function flattenChecklistLines(payload: ChecklistItemPayload): ChecklistLine[] {
  return getChecklistSections(payload).flatMap((section) => section.lines);
}

export function withChecklistSectionPositions(sections: ChecklistSection[]): ChecklistSection[] {
  return sections.map((section, index) => ({ ...section, position: index }));
}

export function checklistLineStatus(line: ChecklistLine): ChecklistLineStatus {
  if (line.status) {
    return line.status;
  }
  return line.checked ? "PASSED" : "NOT_STARTED";
}

export function isChecklistLineComplete(status: ChecklistLineStatus) {
  return status === "PASSED" || status === "NOT_APPLICABLE";
}

export function checklistPayloadFromTexts(texts: string[], sectionName = "Checklista"): ChecklistItemPayload {
  return {
    sections: [
      {
        id: crypto.randomUUID(),
        name: sectionName,
        position: 0,
        lines: texts
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text) => ({
            id: crypto.randomUUID(),
            text,
            checked: false,
            status: "NOT_STARTED" as const,
          })),
      },
    ],
  };
}

export function cloneTemplatePayloadForProject(templatePayload: ChecklistItemPayload): ChecklistItemPayload {
  return {
    note: templatePayload.note,
    sections: getChecklistSections(templatePayload).map((section) => ({
      id: section.id,
      name: section.name,
      position: section.position,
      lines: section.lines.map((line) => ({
        id: line.id,
        text: line.text,
        checked: false,
        status: "NOT_STARTED" as const,
        requireDocumentation: line.requireDocumentation,
        documentationHint: line.documentationHint,
      })),
    })),
  };
}

export function hasChecklistLines(payload: unknown): boolean {
  return flattenChecklistLines(normalizeChecklistPayload(payload)).length > 0;
}

export function isEmptyChecklistPayload(payload: unknown): boolean {
  return !hasChecklistLines(payload);
}

export type ChecklistLineAssignee = {
  assigneeId: string | null;
  assigneeName: string | null;
  /** true gdy brak przypisania na punkcie — używana osoba z całej checklisty */
  inherited: boolean;
};

export function getChecklistLineAssignee(
  line: ChecklistLine,
  defaultAssignee?: { assigneeId: string | null; assigneeName: string | null } | null,
): ChecklistLineAssignee {
  if (line.assigneeId) {
    return {
      assigneeId: line.assigneeId,
      assigneeName: line.assigneeName ?? null,
      inherited: false,
    };
  }
  if (defaultAssignee?.assigneeId) {
    return {
      assigneeId: defaultAssignee.assigneeId,
      assigneeName: defaultAssignee.assigneeName ?? null,
      inherited: true,
    };
  }
  return { assigneeId: null, assigneeName: null, inherited: false };
}

/** Kopiuje punkty z szablonu (sections lub legacy lines) do nowej instancji projektu. */
export function projectChecklistPayloadFromTemplate(defaultPayload: unknown): ChecklistItemPayload {
  const normalized = normalizeChecklistPayload(defaultPayload);
  if (!hasChecklistLines(normalized)) {
    return emptyChecklistPayload();
  }
  return cloneTemplatePayloadForProject(normalized);
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
  if (flattenChecklistLines(normalized).length > 0) {
    return normalized;
  }

  const fallback = templatePayloadFromTitle(title, kind);
  return "sections" in fallback || "lines" in fallback ? fallback : emptyChecklistPayload();
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

function normalizeChecklistLineAttachment(entry: unknown): ChecklistLineAttachment | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const storagePath = typeof raw.storagePath === "string" ? raw.storagePath : "";
  const fileName = typeof raw.fileName === "string" ? raw.fileName : "";
  if (!storagePath || !fileName) {
    return null;
  }

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    storagePath,
    fileName,
    mimeType: typeof raw.mimeType === "string" ? raw.mimeType : "application/octet-stream",
    mediaKind: raw.mediaKind === "image" ? "image" : "file",
    uploadedAt: typeof raw.uploadedAt === "string" ? raw.uploadedAt : new Date().toISOString(),
    uploadedBy: typeof raw.uploadedBy === "string" ? raw.uploadedBy : undefined,
    url: typeof raw.url === "string" ? raw.url : null,
  };
}

function normalizeChecklistLine(entry: unknown): ChecklistLine | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const text = typeof raw.text === "string" ? raw.text : "";
  if (!text.trim()) {
    return {
      id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
      text: "",
      checked: false,
      status: "NOT_STARTED" as const,
      requireDocumentation: Boolean(raw.requireDocumentation),
      documentationHint:
        typeof raw.documentationHint === "string" ? raw.documentationHint : undefined,
    };
  }
  const checked = Boolean(raw.checked);
  const status =
    raw.status === "NOT_STARTED" ||
    raw.status === "IN_PROGRESS" ||
    raw.status === "PASSED" ||
    raw.status === "FAILED" ||
    raw.status === "NOT_APPLICABLE"
      ? (raw.status as ChecklistLineStatus)
      : checked
        ? "PASSED"
        : "NOT_STARTED";

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    text,
    checked: isChecklistLineComplete(status),
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : undefined,
    checkedBy: typeof raw.checkedBy === "string" ? raw.checkedBy : undefined,
    status,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    failureReason: typeof raw.failureReason === "string" ? raw.failureReason : undefined,
    assigneeName: typeof raw.assigneeName === "string" ? raw.assigneeName : undefined,
    assigneeId: typeof raw.assigneeId === "string" ? raw.assigneeId : undefined,
    fixDeadline: typeof raw.fixDeadline === "string" ? raw.fixDeadline : undefined,
    requireDocumentation: Boolean(raw.requireDocumentation),
    documentationHint:
      typeof raw.documentationHint === "string" ? raw.documentationHint : undefined,
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments
          .map((attachment) => normalizeChecklistLineAttachment(attachment))
          .filter((attachment): attachment is ChecklistLineAttachment => attachment !== null)
      : undefined,
  };
}

function normalizeChecklistSection(entry: unknown, index: number): ChecklistSection | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const rawLines = Array.isArray(raw.lines) ? raw.lines : [];
  const lines = rawLines
    .map((line) => normalizeChecklistLine(line))
    .filter((line): line is ChecklistLine => line !== null);

  if (!lines.length && typeof raw.name !== "string") {
    return null;
  }

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `Lista ${index + 1}`,
    position: typeof raw.position === "number" ? raw.position : index,
    lines,
  };
}

export function prepareChecklistPayloadForSave(value: unknown): ChecklistItemPayload {
  const normalized = normalizeChecklistPayload(value);
  const sections = getChecklistSections(normalized)
    .map((section) => ({
      ...section,
      lines: section.lines.filter((line) => line.text.trim()),
    }))
    .filter((section) => section.lines.length > 0);

  return {
    sections: withChecklistSectionPositions(sections),
    note: normalized.note,
  };
}

export function normalizeChecklistPayload(value: unknown): ChecklistItemPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyChecklistPayload();
  }

  const data = value as Record<string, unknown>;
  const rawSections = Array.isArray(data.sections) ? data.sections : [];
  let sections = rawSections
    .map((section, index) => normalizeChecklistSection(section, index))
    .filter((section): section is ChecklistSection => section !== null);

  if (!sections.length && Array.isArray(data.lines)) {
    const lines = data.lines
      .map((line) => normalizeChecklistLine(line))
      .filter((line): line is ChecklistLine => line !== null);
    if (lines.length) {
      sections = [
        {
          id: "legacy-default",
          name: "Checklista",
          position: 0,
          lines,
        },
      ];
    }
  }

  return {
    sections: withChecklistSectionPositions(sections),
    note: typeof data.note === "string" ? data.note : undefined,
  };
}

export function getChecklistDocumentationBlockReason(
  line: ChecklistLine,
  nextStatus?: ChecklistLineStatus,
): string | null {
  const status = nextStatus ?? checklistLineStatus(line);
  if (!line.requireDocumentation || status !== "PASSED") {
    return null;
  }
  if (line.attachments?.length) {
    return null;
  }
  if (line.documentationHint?.trim()) {
    return `Dodaj dokumentację: ${line.documentationHint.trim()}`;
  }
  return "Ten punkt wymaga dokumentacji (zdjęcie lub plik) przed oznaczeniem jako Spełnia.";
}

export function validateChecklistDocumentationRules(payload: ChecklistItemPayload): string | null {
  for (const line of flattenChecklistLines(payload)) {
    const reason = getChecklistDocumentationBlockReason(line);
    if (reason) {
      const label = line.text.trim() ? `„${line.text.trim()}”` : "Punkt checklisty";
      return `${label}: ${reason}`;
    }
  }
  return null;
}

export function isChecklistPayloadComplete(payload: ChecklistItemPayload) {
  const lines = flattenChecklistLines(payload);
  return lines.length > 0 && lines.every((line) => isChecklistLineComplete(checklistLineStatus(line)));
}

export function checklistProgress(payload: ChecklistItemPayload) {
  const lines = flattenChecklistLines(payload);
  const total = lines.length;
  const completed = lines.filter((line) => isChecklistLineComplete(checklistLineStatus(line))).length;
  return { total, completed };
}

export function checklistSectionSummary(section: ChecklistSection) {
  const failed = section.lines.filter((line) => checklistLineStatus(line) === "FAILED").length;
  const inProgress = section.lines.filter((line) => checklistLineStatus(line) === "IN_PROGRESS").length;
  const complete = section.lines.every((line) => isChecklistLineComplete(checklistLineStatus(line)));

  let tone: "failed" | "progress" | "complete" | "idle" = "idle";
  if (failed > 0) {
    tone = "failed";
  } else if (complete && section.lines.length > 0) {
    tone = "complete";
  } else if (inProgress > 0 || section.lines.some((line) => checklistLineStatus(line) === "PASSED")) {
    tone = "progress";
  }

  return { failed, inProgress, complete, tone, total: section.lines.length };
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
