import {
  SWITCHBOARD_CIRCUIT_STATUSES,
  type SwitchboardCircuitStatus,
} from "@/lib/dashboard/switchboard-types";
import type { DocumentationSheetType } from "@/lib/process/types";

export type DocumentationModuleType = Exclude<DocumentationSheetType, "rw_zugi">;

export const DOCUMENTATION_MODULE_LABELS: Record<DocumentationModuleType, string> = {
  rolety: "Rolety",
  przyciski: "Przyciski",
  alarm: "Alarm",
  hvac: "HVAC",
  rack: "RACK",
};

export type DocumentationModule = {
  id: string;
  projectId: string;
  moduleType: DocumentationModuleType;
  name: string;
  position: number;
  lastImportedAt: string | null;
  completedAt: string | null;
  completedById: string | null;
  completedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentationModuleItem = {
  id: string;
  moduleId: string;
  projectId: string;
  rowIndex: number;
  mergeKey: string;
  sectionName: string | null;
  label: string | null;
  location: string | null;
  description: string | null;
  rawFields: Record<string, string>;
  status: SwitchboardCircuitStatus;
  note: string | null;
  isStale: boolean;
  source: "import" | "manual";
  employeeReportTarget: "agreement" | "change_request" | null;
  employeeReportId: string | null;
  updatedById: string | null;
  updatedByName: string | null;
  /** "Ogarnięte" — niezależne od statusu montażu; ustawiane po zgłoszeniu do biura/zapotrzebowania. */
  handledAt: string | null;
  handledById: string | null;
  handledByName: string | null;
  handledNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentationModuleItemHistoryEntry = {
  id: string;
  itemId: string;
  previousStatus: SwitchboardCircuitStatus | null;
  newStatus: SwitchboardCircuitStatus;
  note: string | null;
  changedById: string | null;
  changedByName: string | null;
  changedAt: string;
};

export function documentationModuleItemLabel(
  item: Pick<DocumentationModuleItem, "label" | "description">,
) {
  return item.label || item.description || "—";
}

export type DocumentationModuleSectionGroup = {
  sectionName: string | null;
  items: DocumentationModuleItem[];
};

/** Grupowanie jednopoziomowe (sekcja → pozycje) — te moduły nie mają odpowiednika "Zug" z
 *  Rozdzielni, każda pozycja jest samodzielna. */
export function groupDocumentationModuleItemsBySection(
  items: DocumentationModuleItem[],
): DocumentationModuleSectionGroup[] {
  const groups: DocumentationModuleSectionGroup[] = [];
  const indexByName = new Map<string | null, number>();

  for (const item of items) {
    let index = indexByName.get(item.sectionName);
    if (index === undefined) {
      index = groups.length;
      groups.push({ sectionName: item.sectionName, items: [] });
      indexByName.set(item.sectionName, index);
    }
    groups[index].items.push(item);
  }

  return groups;
}

export type DocumentationModuleProgress = {
  total: number;
  counts: Record<SwitchboardCircuitStatus, number>;
  doneRatio: number;
};

export function buildDocumentationModuleProgress(
  items: DocumentationModuleItem[],
): DocumentationModuleProgress {
  const counts = Object.fromEntries(
    SWITCHBOARD_CIRCUIT_STATUSES.map((status) => [status, 0]),
  ) as Record<SwitchboardCircuitStatus, number>;
  for (const item of items) counts[item.status] += 1;
  const total = items.length;
  return { total, counts, doneRatio: total > 0 ? counts.podlaczone_i_sprawdzone / total : 0 };
}

export function buildDocumentationModuleReportDescription(
  moduleLabel: string,
  item: Pick<DocumentationModuleItem, "label" | "description" | "location" | "note">,
) {
  const parts = [
    moduleLabel,
    item.label,
    item.description,
    item.location ? `(${item.location})` : null,
  ].filter(Boolean);
  const header = parts.join(", ");
  return item.note ? `${header}: ${item.note}` : header;
}
