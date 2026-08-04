// Faza 4 (ROT jako widok) — docs/08 D2/D9/D12/D13/D14. Rejestr Otwartych Tematów: widok, nie
// nowy byt źródłowy — cztery istniejące tabele (kanban/zmiany projektowe/szybkie oferty/ustalenia)
// pozostają jedynym miejscem prawdy, ROT tylko agreguje.
import {
  ROT_CATEGORIES,
  ROT_CATEGORY_LABELS,
  ROT_STATUSES,
  ROT_STATUS_LABELS,
  type RotCategory,
  type RotStatus,
} from "@/lib/process/kanban-types";

export { ROT_STATUSES, ROT_STATUS_LABELS, type RotStatus, ROT_CATEGORIES, ROT_CATEGORY_LABELS, type RotCategory };

export const ROT_SOURCE_TYPES = ["kanban", "zmiana_projektowa", "szybka_oferta", "ustalenie"] as const;
export type RotSourceType = (typeof ROT_SOURCE_TYPES)[number];

export const ROT_SOURCE_LABELS: Record<RotSourceType, string> = {
  kanban: "Kanban",
  zmiana_projektowa: "Zmiana projektowa",
  szybka_oferta: "Szybka oferta",
  ustalenie: "Ustalenie",
};

export type RotItem = {
  sourceType: RotSourceType;
  sourceId: string;
  projectId: string;
  projectName: string;
  title: string;
  rotStatus: RotStatus;
  category: RotCategory | null;
  detail: string | null;
  openedAt: string;
  /** Dni od otwarcia (docs/04 D13: "oferty w negocjacji bez ruchu > 5 dni" na checklistę opiekuna). */
  daysOpen: number;
  /** Faza 7 (D3/D26) — RĘCZNIE ustawiona data kontroli z rot_item_reviews. Null = brak nadpisania,
   *  UI liczy sugestię przez computeSuggestedReviewDate (lib/rot/review-date.ts). */
  reviewDate: string | null;
  /** D33 — realny termin/deadline pozycji, gdy istnieje (wygaśnięcie oferty, kamień etapu blokady). */
  termin: string | null;
  /** Wymiar etapu (D44) — null = "bez przypisania" (nie ukrywać). Kanban: live z tablicy/elementu
   *  procesu. Zmiana/ustalenie: stage_id, tylko część ma ustawione (ścieżka zgłoszenia pracownika).
   *  Szybka oferta: zawsze null — brak odniesienia w schemacie, świadomie. */
  stageId: string | null;
  stageTitle: string | null;
  /** Przygotowanie pod 11c (przenoszenie pozycji między etapami) — tylko kanban, reszta zawsze null. */
  originStageId: string | null;
  moveCount: number | null;
};
