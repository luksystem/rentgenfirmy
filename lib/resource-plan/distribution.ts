// Asystent rozsyłania planów — buduje treść wiadomości dla pracowników (plan pracy w zakresie
// dat) i klientów (informacja o planowanym przyjeździe) z elementów planu zasobów. Czysta logika,
// bez I/O — wysyłką (Slack/e-mail/SMS) zajmuje się app/api/resource-plan/distribute/route.ts.

import type { ResourcePlanItem } from "@/lib/resource-plan/types";

/** Tylko pola potrzebne do budowy wiadomości — pozwala wywołującym przekazać lekki wiersz
 *  z bazy zamiast pełnego, zhydrowanego ResourcePlanItem (z uczestnikami, kompetencjami itd.). */
export type DistributionPlanItem = Pick<
  ResourcePlanItem,
  "id" | "title" | "startAt" | "endAt" | "plannedHours" | "assigneeId" | "clientId" | "completionFeedback"
>;

export type ClientDigestMessageType = "summary" | "offer_notice";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(new Date(iso));
}

function formatRange(startAt: string, endAt: string): string {
  const start = new Date(startAt).toDateString();
  const end = new Date(endAt).toDateString();
  return start === end ? formatDate(startAt) : `${formatDate(startAt)} – ${formatDate(endAt)}`;
}

export function buildEmployeeDigestMessage(params: {
  employeeName: string;
  from: string;
  to: string;
  items: DistributionPlanItem[];
}): string {
  const { employeeName, from, to, items } = params;
  const rangeLabel = `${formatDate(from)} – ${formatDate(to)}`;
  if (items.length === 0) {
    return `Cześć ${employeeName}! W okresie ${rangeLabel} nie masz jeszcze żadnych zaplanowanych zadań w Planie Zasobów.`;
  }
  const lines = items
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((item) => `• ${item.title || "Element planu"} — ${formatRange(item.startAt, item.endAt)}`);
  return [`Cześć ${employeeName}! Twój plan na ${rangeLabel}:`, ...lines].join("\n");
}

export function buildClientDigestMessage(params: {
  clientName: string;
  from: string;
  to: string;
  items: DistributionPlanItem[];
  /** "summary" (domyślnie) — co zrobiono / co planujemy; "offer_notice" — krótka zapowiedź
   *  oferty, bez szczegółów prac (samą ofertę wysyła się dalej z istniejącego modułu Oferty). */
  messageType?: ClientDigestMessageType;
}): string {
  const { clientName, from, to, items, messageType = "summary" } = params;
  const rangeLabel = `${formatDate(from)} – ${formatDate(to)}`;

  if (messageType === "offer_notice") {
    return [
      `Dzień dobry ${clientName},`,
      `dziękujemy za dotychczasową współpracę w okresie ${rangeLabel} — przygotowujemy dla Państwa ofertę na kolejny etap prac, wkrótce się z Państwem skontaktujemy.`,
      "W razie pytań prosimy o kontakt.",
    ].join("\n");
  }

  if (items.length === 0) {
    return `Dzień dobry ${clientName}, informujemy, że w okresie ${rangeLabel} nie mamy jeszcze zaplanowanych prac u Państwa.`;
  }

  const done = items.filter((item) => item.completionFeedback.trim().length > 0);
  const upcoming = items.filter((item) => item.completionFeedback.trim().length === 0);

  const doneLines = done.map((item) => `• ${item.title || "Prace"} — ${item.completionFeedback.trim()}`);
  const upcomingRanges = [...new Set(upcoming.map((item) => formatRange(item.startAt, item.endAt)))];
  const upcomingTitles = [...new Set(upcoming.map((item) => item.title).filter(Boolean))];

  return [
    `Dzień dobry ${clientName},`,
    `podsumowanie prac w okresie ${rangeLabel}:`,
    doneLines.length > 0 ? `Zrealizowane:\n${doneLines.join("\n")}` : null,
    upcoming.length > 0
      ? `Zaplanowane: ${upcomingTitles.join(", ")} — termin: ${upcomingRanges.join(", ")}.`
      : null,
    "W razie pytań prosimy o kontakt.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAdminSummaryMessage(params: { from: string; to: string; items: DistributionPlanItem[] }): string {
  const { from, to, items } = params;
  const rangeLabel = `${formatDate(from)} – ${formatDate(to)}`;
  const totalHours = items.reduce(
    (sum, item) =>
      sum + (item.plannedHours ?? Math.max(0, (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 3_600_000)),
    0,
  );
  const assignees = new Set(items.map((item) => item.assigneeId).filter(Boolean));
  return `Podsumowanie planu ${rangeLabel}: ${items.length} elementów, ~${Math.round(totalHours)}h, ${assignees.size} osób zaangażowanych.`;
}

/** Elementy planu, które dotykają zakresu [from, to] (nakładanie, jak w Gantcie/liście). */
export function filterItemsInRange(items: DistributionPlanItem[], from: string, to: string): DistributionPlanItem[] {
  return items.filter((item) => item.startAt <= to && item.endAt >= from);
}
