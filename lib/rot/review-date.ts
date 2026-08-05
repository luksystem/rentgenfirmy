// D33/migracja 308 — sugestia daty kontroli (termin-bufor / otwarcie+oczekiwanie / otwarcie+interwał)
// liczy się teraz w SQL (report_rot_items().effective_review_date), nie tutaj — jedno miejsce
// liczenia, żeby SQL i TS nie mogły z czasem zacząć się rozjeżdżać. Zostają tylko utility daty,
// wciąż używane przy ręcznym "Przejrzano" (markRotItemReviewed).

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
