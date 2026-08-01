import type { KanbanTemplatePayload } from "@/lib/process/kanban-types";

export const PROCESS_ITEM_KINDS = [
  "checklist",
  "protocol",
  "settlement",
  "kanban",
  "note",
  "snapshot",
  "arkusz_dokumentacji",
] as const;

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
  /** Standard szablonu (D1), nieedytowalny per projekt — podpisanie tego elementu wypełnia
   *  projects.systemHandoverAt, o ile puste (docs/CLAUDE.md: atrybut na elemencie, nie na etapie). */
  startsWarranty?: boolean;
  /** Krok A (docs/08 D27) — ile dni przed kamieniem milowym element musi być gotowy. NULL = element
   *  nie uczestniczy w terminach pochodnych. Standard szablonu (D1), nieedytowalny per projekt. */
  leadDays?: number | null;
  /** Krok A — ile realnie dni zajmuje wykonanie elementu. */
  effortDays?: number | null;
  /** Domyślnie false — element jest niewidoczny na publicznym dashboardzie klienta, dopóki admin
   *  świadomie nie zaznaczy tego w edytorze szablonu. */
  visibleToClient?: boolean;
};

export type ProcessMilestone = {
  id: string;
  stageId: string;
  title: string;
  position: number;
  items: ProcessItem[];
};

/** Wymagana kompetencja na etapie procesu (Plan Zasobów, Etap 3). */
export type ProcessStageCompetencyRequirement = {
  competencyItemId: string;
  minLevelItemId: string | null;
};

/** Wymagana rola operacyjna na etapie procesu, z minimalną liczbą osób. */
export type ProcessStageRoleRequirement = {
  roleItemId: string;
  minCount: number;
};

export const COMMUNICATION_PHASES = ["CZUWANIE", "STANDARD", "INTENSYWNA", "KRYTYCZNA"] as const;
export type CommunicationPhase = (typeof COMMUNICATION_PHASES)[number];

/** Kody ról procesowych — finalne, /docs/08 D10. Nie zmieniać istniejących, tylko dodawać. */
export const PROCESS_ROLE_CODES = [
  "wlasciciel",
  "opiekun_projektu",
  "koordynator_operacyjny",
  "koordynator_techniczny",
  "projektant",
  "wdrozeniowiec",
  "lider_montazu",
  "instalator",
  "asystent_procesu",
] as const;
export type ProcessRoleCode = (typeof PROCESS_ROLE_CODES)[number];

/** Etykiety ról procesowych do komunikatów dla człowieka — nie do UI uprawnień (/docs/04 §9). */
export const PROCESS_ROLE_LABELS: Record<ProcessRoleCode, string> = {
  wlasciciel: "Właściciel",
  opiekun_projektu: "Opiekun projektu",
  koordynator_operacyjny: "Koordynator operacyjny",
  koordynator_techniczny: "Koordynator techniczny",
  projektant: "Projektant",
  wdrozeniowiec: "Wdrożeniowiec",
  lider_montazu: "Lider montażu",
  instalator: "Instalator",
  asystent_procesu: "Asystent procesu",
};

/**
 * Forma narzędnika ("kim/czym jest") do zdań typu "Opiekunem projektu jest już X" —
 * osobna mapa, bo polska deklinacja nie da się wyprowadzić automatycznie z mianownika.
 */
export const PROCESS_ROLE_LABELS_INSTRUMENTAL: Record<ProcessRoleCode, string> = {
  wlasciciel: "Właścicielem",
  opiekun_projektu: "Opiekunem projektu",
  koordynator_operacyjny: "Koordynatorem operacyjnym",
  koordynator_techniczny: "Koordynatorem technicznym",
  projektant: "Projektantem",
  wdrozeniowiec: "Wdrożeniowcem",
  lider_montazu: "Liderem montażu",
  instalator: "Instalatorem",
  asystent_procesu: "Asystentem procesu",
};

/** Jeden wiersz macierzy odpowiedzialności rola x etap (/docs/02 §10). Standard firmy (D1). */
export type ProcessStageRoleResponsibility = {
  roleCode: string;
  isGlowny: boolean;
  isWspiera: boolean;
  isKomunikuje: boolean;
};

export type ProcessStage = {
  id: string;
  templateId: string;
  title: string;
  /** Opis etapu (dla AI) — pomaga np. Asystentowi wyznaczania celów dobrać, jakie cele/dla jakiej roli ustalić. */
  description?: string;
  /** Etap zamykający projekt — odpowiednik starej flagi „Do zamknięcia” z ustawień etapów. */
  forClosing?: boolean;
  position: number;
  milestones: ProcessMilestone[];
  /**
   * Plan Zasobów (Etap 3) — etap procesu jako źródło prawdy dla planowania.
   * Opcjonalne w typie (żeby nie łamać istniejących generatorów szablonów) —
   * przy odczycie z bazy/snapshotu zawsze mają wartość (patrz process-mappers / anchored-template).
   */
  minPeopleCount?: number;
  optimalPeopleCount?: number | null;
  estimatedDurationDays?: number | null;
  estimatedLaborHours?: number | null;
  defaultLaborBudget?: number | null;
  defaultMaterialBudget?: number | null;
  /** Odwołanie do resource_dictionary_items (dictionary_key='risk_level'). */
  defaultRiskItemId?: string | null;
  canRunInParallel?: boolean;
  requiresLeader?: boolean;
  allowsTrainee?: boolean;
  requiredRoles?: ProcessStageRoleRequirement[];
  requiredCompetencies?: ProcessStageCompetencyRequirement[];
  /** ID innych etapów tego samego szablonu, od których zależy ten etap. */
  dependsOnStageIds?: string[];
  /** Faza bazowa komunikacji, standard firmy (/docs/03 §2). Nieedytowalne per projekt (D1). */
  baseCommunicationPhase?: CommunicationPhase | null;
  /** Waga komunikacyjna — seed, NULL do kalibracji w fazie obciążenia (/docs/05 §4.3). */
  weightComm?: number | null;
  /** Waga koordynacyjna — seed, NULL do kalibracji. */
  weightCoord?: number | null;
  /** SLA w dniach dla elementów etapu, np. {"rozstrzygniecie": 7, "poprawki_dok": 7}. */
  slaDays?: Record<string, number>;
  /**
   * Czy etap wymaga Lidera Etapu na poziomie projektu (project_stage_leads).
   * NIEZALEŻNE od requiresLeader (ostrzeżenie w walidacji Planu Zasobów) — dwa różne poziomy.
   */
  requiresProjectStageLead?: boolean;
  /** Macierz odpowiedzialności rola x etap (/docs/02 §10). Standard firmy (D1). */
  roleResponsibility?: ProcessStageRoleResponsibility[];
  /**
   * Stabilny slug etapu, niezależny od title. NIEZMIENNY po utworzeniu (trigger DB
   * process_stages_code_immutable) — wszystko semantyczne kluczuje na code, nie na title.
   * Rozbicie/przemianowanie etapu w przyszłości = nowy wiersz z nowym code.
   */
  code?: string;
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
  /** Blokuje status "Nie dotyczy" — pracownik musi rozwiązać punkt jako Spełnia albo Problem. */
  blockNotApplicable?: boolean;
  attachments?: ChecklistLineAttachment[];
  /** Punkt dodany ręcznie do instancji projektu, poza szablonem. */
  isCustom?: boolean;
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

/** Szablon elementu "Zdjęcie do klienta" — wiadomość widoczna klientowi przy odebranym zdjęciu
 *  (np. "Miło mi tworzyć dla Państwa rozdzielnię..."), definiowana raz w katalogu elementów. */
export type SnapshotTemplatePayload = {
  clientMessage: string;
};

export function isSnapshotTemplatePayload(value: unknown): value is SnapshotTemplatePayload {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).clientMessage === "string"
  );
}

// Arkusze zmapowane z ogólnego pliku dokumentacji technicznej projektu (jeden plik, wgrywany raz
// w zakładce Dokumentacja — patrz `lib/import/detect-mapped-sheets.ts`). Każda wartość odpowiada
// jednemu elementowi procesu typu "arkusz_dokumentacji" osadzonemu na właściwym etapie.
export const DOCUMENTATION_SHEET_TYPES = [
  "rw_zugi",
  "rolety",
  "przyciski",
  "alarm",
  "hvac",
  "rack",
] as const;

export type DocumentationSheetType = (typeof DOCUMENTATION_SHEET_TYPES)[number];

export const DOCUMENTATION_SHEET_TYPE_LABELS: Record<DocumentationSheetType, string> = {
  rw_zugi: "Rozdzielnie (RW-Zugi)",
  rolety: "Rolety",
  przyciski: "Przyciski",
  alarm: "Alarm",
  hvac: "HVAC",
  rack: "RACK",
};

/** Szablon elementu "Arkusz dokumentacji" — który zmapowany arkusz ten element reprezentuje. */
export type ArkuszDokumentacjiPayload = {
  sheetType: DocumentationSheetType;
};

export function isArkuszDokumentacjiPayload(value: unknown): value is ArkuszDokumentacjiPayload {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (DOCUMENTATION_SHEET_TYPES as readonly string[]).includes(
      (value as Record<string, unknown>).sheetType as string,
    )
  );
}

export type ProcessElementPayload =
  | ChecklistItemPayload
  | KanbanTemplatePayload
  | SnapshotTemplatePayload
  | ArkuszDokumentacjiPayload;

/** Zdjęcie faktycznie wysłane klientowi dla elementu typu "snapshot" w konkretnym projekcie. */
export type ProjectProcessSnapshot = {
  id: string;
  projectProcessItemId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  employeeNote: string | null;
  uploadedBy: string | null;
  uploadedByName: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

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
  /** Krok A (docs/08 D27) — wyliczany, nigdy nieedytowalny bezpośrednio. Data własnego milestone'a
   *  minus process_items.leadDays. NULL, gdy brak leadDays na elemencie lub brak daty kamienia. */
  terminWynikajacy: string | null;
  /** Krok A — kiedy faktycznie zaplanowano robotę. NULL = "termin istnieje, nikt nie zdecydował kiedy". */
  dataPlanowana: string | null;
  /** Krok A — źródło prawdy faktycznego wykonania (docs/08 D27 2.2). */
  dataUkonczenia: string | null;
  /** Ostatnia znana nazwa/etap/kamień z chwili, gdy element został osierocony (sync do żywego
   *  szablonu nadpisał template_snapshot) — jedyny ślad po co ten element był, skoro slot w
   *  szablonie już nie istnieje. Null dla elementów jeszcze podłączonych do szablonu. */
  lastKnownTitle: string | null;
  lastKnownStageTitle: string | null;
  lastKnownMilestoneTitle: string | null;
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
  note: "Notatka / dokument",
  snapshot: "Zdjęcie do klienta",
  arkusz_dokumentacji: "Arkusz dokumentacji",
};

/** Podpięcie istniejącej notatki lub dokumentu (albo nowo utworzonych) do kroku procesu typu „note”. */
export type ProcessItemLink = {
  id: string;
  projectProcessItemId: string;
  documentId: string | null;
  meetingNoteId: string | null;
  createdAt: string;
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

/** Kopia szablonu okrojona do elementów oznaczonych "Widoczne dla klienta" — używana przy budowie
 *  publicznego payloadu dashboardu, żeby elementy niewidoczne nigdy nie trafiły do przeglądarki
 *  klienta (nie tylko UI-owe ukrycie). */
export function filterProcessTemplateForClient(template: ProcessTemplate): ProcessTemplate {
  return {
    ...template,
    stages: template.stages.map((stage) => ({
      ...stage,
      milestones: stage.milestones.map((milestone) => ({
        ...milestone,
        items: milestone.items.filter((item) => item.visibleToClient === true),
      })),
    })),
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

/** Czy etap zawierający dany element szablonu jest oznaczony jako „etap zamykający projekt”. */
export function isTemplateItemOnClosingStage(template: ProcessTemplate, templateItemId: string): boolean {
  return template.stages.some(
    (stage) =>
      Boolean(stage.forClosing) &&
      stage.milestones.some((milestone) => milestone.items.some((item) => item.id === templateItemId)),
  );
}

export type ClosingStageKanbanCandidate = {
  templateItemId: string;
  title: string;
  stageTitle: string;
  milestoneTitle: string;
};

/** Tablice kanban leżące na etapach oznaczonych jako „etap zamykający projekt” — cele generowania tasków AI z notatki checklisty. */
export function findClosingStageKanbanItems(template: ProcessTemplate): ClosingStageKanbanCandidate[] {
  const result: ClosingStageKanbanCandidate[] = [];
  for (const stage of template.stages) {
    if (!stage.forClosing) {
      continue;
    }
    for (const milestone of stage.milestones) {
      for (const item of milestone.items) {
        if (item.kind === "kanban") {
          result.push({
            templateItemId: item.id,
            title: item.title,
            stageTitle: stage.title,
            milestoneTitle: milestone.title,
          });
        }
      }
    }
  }
  return result;
}
