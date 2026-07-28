// Faza 4 (ROT jako widok) — docs/08 D2/D9/D12/D13/D14. Rejestr Otwartych Tematów: widok, nie
// nowy byt źródłowy — cztery istniejące tabele (kanban/zmiany projektowe/szybkie oferty/ustalenia)
// pozostają jedynym miejscem prawdy, ROT tylko agreguje.
import { ROT_STATUSES, ROT_STATUS_LABELS, type RotStatus } from "@/lib/process/kanban-types";

export { ROT_STATUSES, ROT_STATUS_LABELS, type RotStatus };

export const ROT_SOURCE_TYPES = ["kanban", "zmiana_projektowa", "szybka_oferta", "ustalenie"] as const;
export type RotSourceType = (typeof ROT_SOURCE_TYPES)[number];

export const ROT_SOURCE_LABELS: Record<RotSourceType, string> = {
  kanban: "Kanban",
  zmiana_projektowa: "Zmiana projektowa",
  szybka_oferta: "Szybka oferta",
  ustalenie: "Ustalenie",
};

export const ROT_CATEGORIES = ["OCZEKIWANIE_DECYZJA_INWESTORA", "POZA_ZAKRESEM"] as const;
export type RotCategory = (typeof ROT_CATEGORIES)[number];

export const ROT_CATEGORY_LABELS: Record<RotCategory, string> = {
  OCZEKIWANIE_DECYZJA_INWESTORA: "Oczekiwanie na decyzję inwestora",
  POZA_ZAKRESEM: "Poza zakresem",
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
};
