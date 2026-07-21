import { escapeEmailHtml } from "@/lib/email/layout";
import { buildSettlementSummary, type ProjectSettlementEntry } from "@/lib/settlements/types";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { ProjectHourBudgetSummary } from "@/lib/time-tracking/project-hour-budget";

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(value);
}

function buildHourBudgetHtml(budget: ProjectHourBudgetSummary) {
  if (budget.usageOnly) {
    return `<h2 style="font-size:15px;margin:24px 0 8px;">Zużycie godzin (czas pracy)</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Przepracowano</td>
        <td style="text-align:right;font-weight:700;">
          ${escapeEmailHtml(formatDurationMinutes(budget.totalUsedMinutes))}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:6px 0;color:#6b7280;font-size:12px;">
          Zarejestrowany czas pracy w projekcie (rozliczenie godzinowe)
        </td>
      </tr>
    </table>`;
  }

  const remainingLabel = budget.overBudget
    ? `Przekroczenie o ${formatDurationMinutes(budget.totalUsedMinutes - budget.totalBudgetMinutes)}`
    : `Pozostało ${formatDurationMinutes(budget.totalRemainingMinutes)} (${Math.max(0, 100 - budget.utilizationPercent)}%)`;
  const remainingColor = budget.overBudget ? "#be123c" : "#6b7280";

  const lines =
    budget.lines.length > 0
      ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
          <tbody>
            ${budget.lines
              .map(
                (line) => `<tr>
                  <td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">
                    ${escapeEmailHtml(line.label)}${
                      line.categoryName
                        ? `<div style="font-size:11px;color:#9ca3af;">${escapeEmailHtml(line.categoryName)}</div>`
                        : ""
                    }${
                      line.notes
                        ? `<div style="font-size:11px;color:#9ca3af;">${escapeEmailHtml(line.notes)}</div>`
                        : ""
                    }
                  </td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;vertical-align:top;">
                    ${escapeEmailHtml(formatDurationMinutes(line.usedMinutes))} / ${escapeEmailHtml(formatDurationMinutes(line.budgetMinutes))}
                  </td>
                </tr>`,
              )
              .join("")}
            ${
              budget.unmatchedUsedMinutes > 0
                ? `<tr>
                  <td style="padding:6px 0;color:#6b7280;">Pozostałe (inne kategorie)</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;">
                    ${escapeEmailHtml(formatDurationMinutes(budget.unmatchedUsedMinutes))}
                  </td>
                </tr>`
                : ""
            }
          </tbody>
        </table>`
      : "";

  return `<h2 style="font-size:15px;margin:24px 0 8px;">Zużycie godzin (czas pracy)</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Zużyte / deklarowane w kontrakcie</td>
        <td style="text-align:right;font-weight:700;">
          ${escapeEmailHtml(formatDurationMinutes(budget.totalUsedMinutes))} / ${escapeEmailHtml(formatDurationMinutes(budget.totalBudgetMinutes))}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Wykorzystanie</td>
        <td style="text-align:right;font-weight:600;">${budget.utilizationPercent}%</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Bilans godzin</td>
        <td style="text-align:right;font-weight:600;color:${remainingColor};">${escapeEmailHtml(remainingLabel)}</td>
      </tr>
    </table>
    ${lines}`;
}

export type SettlementPendingEmailItem = {
  title: string;
  amountNet: number | null;
  publicUrl: string | null;
};

function buildPendingItemsHtml(items: SettlementPendingEmailItem[]) {
  if (items.length === 0) {
    return "";
  }
  const pendingTotal = items.reduce((sum, item) => sum + (item.amountNet ?? 0), 0);
  const rows = items
    .map((item) => {
      const link = item.publicUrl
        ? `<a href="${escapeEmailHtml(item.publicUrl)}" style="color:#92400e;font-weight:600;text-decoration:underline;">Zobacz i zaakceptuj →</a>`
        : "";
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #fde68a;">${escapeEmailHtml(item.title)}</td>
        <td style="padding:8px;border-bottom:1px solid #fde68a;text-align:right;">${
          item.amountNet != null ? escapeEmailHtml(money(item.amountNet)) : "—"
        }</td>
        <td style="padding:8px;border-bottom:1px solid #fde68a;text-align:right;">${link}</td>
      </tr>`;
    })
    .join("");

  return `<div style="margin:20px 0;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;">
    <h2 style="font-size:15px;margin:0 0 4px;color:#92400e;">Niezaakceptowane do rozliczenia</h2>
    <p style="margin:0 0 10px;color:#92400e;font-size:13px;">
      Suma oczekujących na Twoją decyzję: <strong>${escapeEmailHtml(money(pendingTotal))}</strong> netto —
      nie jest jeszcze wliczona do salda "Pozostało".
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;color:#92400e;">Pozycja</th>
          <th style="text-align:right;padding:8px;color:#92400e;">Netto</th>
          <th style="text-align:right;padding:8px;color:#92400e;">Akcja</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export function buildSettlementReportEmail(input: {
  clientName: string;
  projectName: string;
  entries: ProjectSettlementEntry[];
  publicUrl?: string | null;
  hourBudget?: ProjectHourBudgetSummary | null;
  pendingItems?: SettlementPendingEmailItem[];
}) {
  const summary = buildSettlementSummary(input.entries);
  const pendingItems = input.pendingItems ?? [];
  const pendingNetTotal = pendingItems.reduce((sum, item) => sum + (item.amountNet ?? 0), 0);
  const charges = input.entries.filter((e) => e.kind === "charge");
  const payments = input.entries.filter((e) => e.kind === "payment");
  const schedule = input.entries.filter((e) => e.kind === "schedule");

  const rows = (list: ProjectSettlementEntry[]) =>
    list
      .map(
        (entry) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeEmailHtml(entry.title)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeEmailHtml(money(entry.amountNet))}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${entry.vatRate}%</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeEmailHtml(money(entry.amountGross))}</td>
          </tr>`,
      )
      .join("");

  const link = input.publicUrl
    ? `<p style="margin:20px 0;"><a href="${escapeEmailHtml(input.publicUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;">Otwórz rozliczenia w dashboardzie</a></p>`
    : "";

  const balanceColor = summary.balanceNet > 0.5 ? "#be123c" : summary.balanceNet < -0.5 ? "#047857" : "#374151";
  const hourBudgetHtml = input.hourBudget ? buildHourBudgetHtml(input.hourBudget) : "";
  const pendingItemsHtml = buildPendingItemsHtml(pendingItems);
  const pendingRowHtml =
    pendingItems.length > 0
      ? `<tr><td style="padding:6px 0;color:#92400e;">Niezaakceptowane (netto)</td><td style="text-align:right;font-weight:700;color:#92400e;">${escapeEmailHtml(money(pendingNetTotal))}</td></tr>`
      : "";

  const html = `<div style="font-family:system-ui,sans-serif;color:#111827;line-height:1.5;max-width:640px;margin:0 auto;">
    <h1 style="font-size:20px;margin:0 0 8px;">Rozliczenie projektu</h1>
    <p style="margin:0 0 16px;color:#6b7280;">${escapeEmailHtml(input.projectName)} · ${escapeEmailHtml(input.clientName)}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Do zapłaty (netto)</td><td style="text-align:right;font-weight:600;">${escapeEmailHtml(money(summary.chargesNet))}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Zapłacono (netto)</td><td style="text-align:right;font-weight:600;">${escapeEmailHtml(money(summary.paidNet))}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Pozostało</td><td style="text-align:right;font-weight:700;color:${balanceColor};">${escapeEmailHtml(money(summary.balanceNet))}</td></tr>
      ${pendingRowHtml}
      <tr><td style="padding:6px 0;color:#6b7280;">Harmonogram (netto)</td><td style="text-align:right;font-weight:600;">${escapeEmailHtml(money(summary.scheduleNet))}</td></tr>
    </table>
    ${hourBudgetHtml}
    ${pendingItemsHtml}
    ${link}
    <h2 style="font-size:15px;margin:24px 0 8px;">Należności</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;">Pozycja</th><th style="text-align:right;padding:8px;">Netto</th><th style="text-align:right;padding:8px;">VAT</th><th style="text-align:right;padding:8px;">Brutto</th></tr></thead>
      <tbody>${rows(charges) || `<tr><td colspan="4" style="padding:8px;color:#9ca3af;">Brak</td></tr>`}</tbody>
    </table>
    <h2 style="font-size:15px;margin:24px 0 8px;">Spłaty</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;">Pozycja</th><th style="text-align:right;padding:8px;">Netto</th><th style="text-align:right;padding:8px;">VAT</th><th style="text-align:right;padding:8px;">Brutto</th></tr></thead>
      <tbody>${rows(payments) || `<tr><td colspan="4" style="padding:8px;color:#9ca3af;">Brak</td></tr>`}</tbody>
    </table>
    <h2 style="font-size:15px;margin:24px 0 8px;">Harmonogram spłat</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;">Pozycja</th><th style="text-align:right;padding:8px;">Netto</th><th style="text-align:right;padding:8px;">VAT</th><th style="text-align:right;padding:8px;">Brutto</th></tr></thead>
      <tbody>${rows(schedule) || `<tr><td colspan="4" style="padding:8px;color:#9ca3af;">Brak</td></tr>`}</tbody>
    </table>
  </div>`;

  return {
    subject: `Rozliczenie projektu: ${input.projectName}`,
    html,
  };
}
