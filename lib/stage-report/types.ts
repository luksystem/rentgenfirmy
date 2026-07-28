// Faza 5 (Generator raportu etapowego) — docs/role/03-warstwa-komunikacyjna.md §3.
// Szablon (8 sekcji + klauzula) jest zamknięty — treść tego pliku modeluje TYLKO mechanikę
// generowania (docs/08), nie zmienia sekcji ani ich kolejności.
import { COMMUNICATION_PHASES, type CommunicationPhase } from "@/lib/process/types";

export { COMMUNICATION_PHASES };

export const STAGE_REPORT_STATUSES = ["wygenerowany", "zatwierdzony", "wyslany"] as const;
export type StageReportStatus = (typeof STAGE_REPORT_STATUSES)[number];

export const STAGE_REPORT_STATUS_LABELS: Record<StageReportStatus, string> = {
  wygenerowany: "Wygenerowany",
  zatwierdzony: "Zatwierdzony",
  wyslany: "Wysłany",
};

/**
 * Rytm kontaktu słownie (docs/03 §2, tabela faz komunikacji) — standard firmy, nie wartość
 * szablonu per projekt/etap (faza komunikacji sama JEST już atrybutem szablonu; to tylko jej
 * opis w prostym języku, ten sam dla każdego etapu o tej samej fazie).
 */
export const COMMUNICATION_PHASE_RHYTHM_LABELS: Record<CommunicationPhase, string> = {
  CZUWANIE: "raz w miesiącu, krótka nota",
  STANDARD: "co dwa tygodnie",
  INTENSYWNA: "co tydzień",
  KRYTYCZNA: "co tydzień, z potwierdzonym kontaktem telefonicznym",
};

export type StageReportCompletedItem = {
  title: string;
  kind: "checklist" | "protocol";
  completedAt: string | null;
};

export type StageReportDocument = {
  title: string;
  /** Null = element nie ma włączonego publicznego linku w chwili generowania raportu. */
  url: string | null;
};

export type StageReportChange = {
  title: string;
  costNote: string;
  costNet: number | null;
  costGross: number | null;
  approvedByName: string | null;
  approvedAt: string | null;
};

export type StageReportRotItem = {
  title: string;
  category: string | null;
  detail: string | null;
  daysOpen: number;
};

export type StageReportNextStage = {
  title: string;
  plannedStartDate: string | null;
  startConditions: string[];
  responsibleRoleLabel: string | null;
  responsibleName: string | null;
  rhythmLabel: string | null;
};

export type StageReportContent = {
  projectName: string;
  stageTitle: string;
  milestoneTitle: string;
  milestoneReachedAt: string;
  completedItems: StageReportCompletedItem[];
  documents: StageReportDocument[];
  changes: StageReportChange[];
  /** PRZENIESIONE DO NASTĘPNEGO ETAPU — sekcja obowiązkowa, pusta tablica drukuje się jawnie w UI. */
  carriedOverItems: StageReportRotItem[];
  /** CZEGO POTRZEBUJEMY OD PAŃSTWA — sekcja obowiązkowa, pusta tablica drukuje się jawnie w UI. */
  clientNeeds: StageReportRotItem[];
  /** Null, jeśli to ostatni etap szablonu. */
  nextStage: StageReportNextStage | null;
};

export type StageReport = {
  id: string;
  projectId: string;
  stageId: string;
  milestoneId: string;
  status: StageReportStatus;
  content: StageReportContent;
  coordinatorComment: string;
  generatedAt: string;
  generatedBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  sentBy: string | null;
};
