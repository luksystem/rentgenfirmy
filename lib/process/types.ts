import type { KanbanTemplatePayload } from "@/lib/process/kanban-types";

export const PROCESS_ITEM_KINDS = ["checklist", "protocol", "settlement", "kanban"] as const;

export type ProcessItemKind = (typeof PROCESS_ITEM_KINDS)[number];

export type ProcessElement = {
  id: string;
  kind: ProcessItemKind;
  title: string;
  description: string;
  defaultPayload: ProcessElementPayload;
  /** Dynamiczna tablica odbiorowa QA — generowana ze specyfikacji i ustaleń. */
  isInternalAcceptance?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProcessItem = {
  id: string;
  milestoneId: string;
  elementId: string;
  kind: ProcessItemKind;
  title: string;
  position: number;
  defaultPayload: ProcessElementPayload;
  isInternalAcceptance?: boolean;
};

export type ProcessMilestone = {
  id: string;
  stageId: string;
  title: string;
  position: number;
  items: ProcessItem[];
};

export type ProcessStage = {
  id: string;
  templateId: string;
  title: string;
  position: number;
  milestones: ProcessMilestone[];
};

export type ProcessTemplate = {
  id: string;
  projectType: string;
  name: string;
  description: string;
  stages: ProcessStage[];
  createdAt: string;
  updatedAt: string;
};

export type ProcessItemCompletion = {
  completedAt: string;
  completedBy?: string;
  note?: string;
};

import type { InternalAcceptanceStatus } from "@/lib/internal-acceptance/types";

export type ChecklistLineStatus = InternalAcceptanceStatus;

export type ChecklistLineAttachment = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  mediaKind: "image" | "file";
  uploadedAt: string;
  uploadedBy?: string;
  url?: string | null;
};

export type ChecklistLine = {
  id: string;
  text: string;
  checked: boolean;
  checkedAt?: string;
  checkedBy?: string;
  status?: ChecklistLineStatus;
  notes?: string;
  failureReason?: string;
  assigneeName?: string;
  assigneeId?: string;
  fixDeadline?: string;
  /** Wymaga zdjęcia/pliku przed oznaczeniem jako Spełnia. */
  requireDocumentation?: boolean;
  /** Podpowiedź przy realizacji (np. „dodaj zdjęcie szafy rack”). */
  documentationHint?: string;
  attachments?: ChecklistLineAttachment[];
};

export type ChecklistSection = {
  id: string;
  name: string;
  position: number;
  lines: ChecklistLine[];
};

export type ChecklistItemPayload = {
  sections: ChecklistSection[];
  /** @deprecated migracja — używaj sections */
  lines?: ChecklistLine[];
  note?: string;
};

export type ProcessElementPayload = ChecklistItemPayload | KanbanTemplatePayload;

export type ProjectProcessItemStatus = "open" | "in_progress" | "completed";

export type ProjectProcessItem = {
  id: string;
  projectId: string;
  templateItemId: string;
  kind: ProcessItemKind;
  payload: ChecklistItemPayload;
  status: ProjectProcessItemStatus;
  isInternalAcceptance?: boolean;
  internalAcceptanceState?: import("@/lib/internal-acceptance/types").InternalAcceptanceState | null;
  assigneeId: string | null;
  assigneeName: string | null;
  signedAt: string | null;
  signedBy: string | null;
  signedByName: string | null;
  signatureNote: string | null;
  /** Ustawiane z poziomu projektu — jeśli true i element nie ukończony, blokuje kolejny etap. */
  blocksNextStage: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectProcess = {
  id: string;
  projectId: string;
  templateId: string;
  templateSnapshot: ProcessTemplate | null;
  completions: Record<string, ProcessItemCompletion>;
  milestoneDates: Record<string, string | null>;
  /** Etap ręcznie oznaczony jako aktualnie aktywny (widok klienta, ostrzeżenia). */
  activeStageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PROCESS_ITEM_KIND_LABELS: Record<ProcessItemKind, string> = {
  checklist: "Checklista",
  protocol: "Protokół odbioru",
  settlement: "Rozliczenie",
  kanban: "Tablica Kanban",
};

export function countProcessItems(template: ProcessTemplate) {
  return (template.stages ?? []).reduce(
    (total, stage) =>
      total +
      (stage.milestones ?? []).reduce(
        (mTotal, milestone) => mTotal + (milestone.items ?? []).length,
        0,
      ),
    0,
  );
}

export function countCompletedItems(template: ProcessTemplate, process: ProjectProcess) {
  const itemIds = new Set<string>();
  (template.stages ?? []).forEach((stage) =>
    (stage.milestones ?? []).forEach((milestone) =>
      (milestone.items ?? []).forEach((item) => itemIds.add(item.id)),
    ),
  );

  return [...itemIds].filter((id) => process.completions?.[id]).length;
}

export function getProcessProgress(template: ProcessTemplate, process: ProjectProcess) {
  const total = countProcessItems(template);
  const completed = countCompletedItems(template, process);
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function flattenProcessItems(template: ProcessTemplate) {
  return template.stages.flatMap((stage) =>
    stage.milestones.flatMap((milestone) =>
      milestone.items.map((item) => ({
        ...item,
        stageTitle: stage.title,
        milestoneTitle: milestone.title,
      })),
    ),
  );
}
