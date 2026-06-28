import type { ProcessItemKind } from "@/lib/process/types";

export type ProcessElementKindMeta = {
  kind: ProcessItemKind;
  label: string;
  description: string;
  icon: string;
  supportsPublicLink: boolean;
  supportsInternalAcceptance: boolean;
  sortOrder: number;
  isActive: boolean;
};

export const DEFAULT_PROCESS_ELEMENT_KIND_META: ProcessElementKindMeta[] = [
  {
    kind: "checklist",
    label: "Checklista",
    description:
      "Lista punktów do odhaczenia — np. kontrola montażu, przygotowanie pomieszczenia, weryfikacja okablowania.",
    icon: "check-circle",
    supportsPublicLink: true,
    supportsInternalAcceptance: true,
    sortOrder: 10,
    isActive: true,
  },
  {
    kind: "protocol",
    label: "Protokół odbioru",
    description: "Formalny protokół z podpisem — potwierdzenie przekazania systemu lub etapu prac.",
    icon: "file-check",
    supportsPublicLink: true,
    supportsInternalAcceptance: false,
    sortOrder: 20,
    isActive: true,
  },
  {
    kind: "settlement",
    label: "Rozliczenie",
    description: "Powiązanie z ofertą / rozliczeniem serwisowym — akceptacja kosztów i zakresu.",
    icon: "receipt",
    supportsPublicLink: true,
    supportsInternalAcceptance: false,
    sortOrder: 30,
    isActive: true,
  },
  {
    kind: "kanban",
    label: "Tablica Kanban",
    description:
      "Tablica wdrożeniowa z zadaniami — współpraca zespołu, podwykonawców i klienta.",
    icon: "layout-grid",
    supportsPublicLink: true,
    supportsInternalAcceptance: false,
    sortOrder: 40,
    isActive: true,
  },
];

export function getProcessKindMetaMap(meta = DEFAULT_PROCESS_ELEMENT_KIND_META) {
  return Object.fromEntries(meta.map((entry) => [entry.kind, entry])) as Record<
    ProcessItemKind,
    ProcessElementKindMeta
  >;
}

export function getProcessKindLabel(kind: ProcessItemKind, meta = DEFAULT_PROCESS_ELEMENT_KIND_META) {
  return meta.find((entry) => entry.kind === kind)?.label ?? kind;
}
