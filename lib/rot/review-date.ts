import type { PolicyThresholds } from "@/lib/policy-thresholds/types";
import type { RotItem } from "@/lib/rot/types";

/** Arytmetyka wyłącznie w UTC — parsowanie "YYYY-MM-DDT..." w czasie lokalnym przesuwałoby datę
 *  o jeden dzień w strefach innych niż UTC (np. Europe/Warsaw latem, UTC+2). */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Dzisiejsza data wg lokalnego kalendarza użytkownika (nie UTC) w formacie YYYY-MM-DD. */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * D33 — data kontroli wyliczana automatycznie, z możliwością nadpisania. Zawsze wcześniej niż
 * termin, nigdy równo (dowolny bufor >= 1 dzień to gwarantuje).
 *
 *   pozycja z terminem            -> termin minus bufor
 *   czeka na klienta (CZEKA_NA_ZEWNETRZNE, brak własnego terminu) -> data otwarcia + interwał oczekiwania
 *   bez terminu i bez oczekiwania (W_TOKU, kanban)                -> data otwarcia + interwał domyślny
 *
 * "Czeka na inną branżę" (data obiecana przez wykonawcę, a gdy brak — dziś + interwał) NIE ma dziś
 * źródła danych — ROT nie rozróżnia jeszcze "czeka na inwestora" od "czeka na inną branżę" jako
 * osobnych kategorii (patrz docs/08 D32/D33). Gdy taki atrybut powstanie, dopisać tu trzecią gałąź
 * zamiast zgadywać na podstawie dzisiejszych, niepełnych danych.
 */
export function computeSuggestedReviewDate(
  item: Pick<RotItem, "rotStatus" | "termin" | "openedAt">,
  thresholds: Pick<
    PolicyThresholds,
    "rotReviewBufferDays" | "rotReviewWaitingClientDays" | "rotReviewDefaultIntervalDays"
  >,
): string {
  if (item.termin) {
    return addDaysToIsoDate(item.termin, -thresholds.rotReviewBufferDays);
  }
  if (item.rotStatus === "CZEKA_NA_ZEWNETRZNE") {
    return addDaysToIsoDate(item.openedAt, thresholds.rotReviewWaitingClientDays);
  }
  return addDaysToIsoDate(item.openedAt, thresholds.rotReviewDefaultIntervalDays);
}
