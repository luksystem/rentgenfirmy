// Asystent rozsyłania planów — buduje zmienne {{var}} podstawiane w szablonach z Ustawienia >
// E-mail (kinds: resource_plan_employee_digest / resource_plan_client_summary /
// resource_plan_client_offer_notice / resource_plan_admin_summary — patrz
// lib/email/email-settings.ts i lib/email/notification-routing.ts). Samo renderowanie
// (podstawienie {{var}} do treści skonfigurowanej przez użytkownika w ustawieniach) robi
// app/api/resource-plan/distribute/route.ts przez renderEmailSubject/renderEmailTemplateString/
// renderPlainTemplateString — ten plik dostarcza tylko dane wejściowe, bez I/O.

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

export function formatRangeLabel(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function buildEmployeeDigestVariables(params: {
  employeeName: string;
  from: string;
  to: string;
  items: DistributionPlanItem[];
}): Record<string, string> {
  const { employeeName, from, to, items } = params;
  const itemsBlock =
    items.length === 0
      ? "Brak zaplanowanych zadań w tym okresie."
      : items
          .slice()
          .sort((a, b) => a.startAt.localeCompare(b.startAt))
          .map((item) => `• ${item.title || "Element planu"} — ${formatRange(item.startAt, item.endAt)}`)
          .join("\n");

  return {
    employee_name: employeeName,
    range_label: formatRangeLabel(from, to),
    items_block: itemsBlock,
  };
}

export function buildClientSummaryVariables(params: {
  clientName: string;
  from: string;
  to: string;
  items: DistributionPlanItem[];
}): Record<string, string> {
  const { clientName, from, to, items } = params;
  const done = items.filter((item) => item.completionFeedback.trim().length > 0);
  const upcoming = items.filter((item) => item.completionFeedback.trim().length === 0);

  const doneBlock =
    done.length > 0
      ? `Zrealizowane:\n${done.map((item) => `• ${item.title || "Prace"} — ${item.completionFeedback.trim()}`).join("\n")}`
      : "";
  const upcomingRanges = [...new Set(upcoming.map((item) => formatRange(item.startAt, item.endAt)))];
  const upcomingTitles = [...new Set(upcoming.map((item) => item.title).filter(Boolean))];
  const upcomingBlock =
    upcoming.length > 0 ? `Zaplanowane: ${upcomingTitles.join(", ")} — termin: ${upcomingRanges.join(", ")}.` : "";

  return {
    client_name: clientName,
    range_label: formatRangeLabel(from, to),
    done_block: doneBlock,
    upcoming_block: upcomingBlock,
  };
}

export function buildClientOfferNoticeVariables(params: { clientName: string; from: string; to: string }): Record<string, string> {
  return {
    client_name: params.clientName,
    range_label: formatRangeLabel(params.from, params.to),
  };
}

export function buildAdminSummaryVariables(params: { from: string; to: string; items: DistributionPlanItem[] }): Record<string, string> {
  const { from, to, items } = params;
  const totalHours = items.reduce(
    (sum, item) =>
      sum + (item.plannedHours ?? Math.max(0, (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 3_600_000)),
    0,
  );
  const assignees = new Set(items.map((item) => item.assigneeId).filter(Boolean));

  return {
    range_label: formatRangeLabel(from, to),
    item_count: String(items.length),
    total_hours: String(Math.round(totalHours)),
    assignee_count: String(assignees.size),
  };
}

/** Elementy planu, które dotykają zakresu [from, to] (nakładanie, jak w Gantcie/liście). */
export function filterItemsInRange(items: DistributionPlanItem[], from: string, to: string): DistributionPlanItem[] {
  return items.filter((item) => item.startAt <= to && item.endAt >= from);
}
