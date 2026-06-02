import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { formatDate, formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown, ServiceRecord } from "@/lib/service/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(label: string, value: string) {
  return `
    <div class="field">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "—")}</dd>
    </div>
  `;
}

function costRows(breakdown: ServiceCostBreakdown) {
  const rows = [
    { label: "Auto (kilometry)", value: breakdown.categories.car },
    { label: "Godziny w aucie", value: breakdown.categories.carHours },
    { label: "Praca", value: breakdown.categories.labor },
    { label: "Materiały", value: breakdown.categories.materials },
    { label: "Noclegi", value: breakdown.categories.accommodations },
  ].filter((row) => row.value > 0);

  if (rows.length === 0) {
    return `<tr><td colspan="2" class="muted">Brak pozycji do rozliczenia</td></tr>`;
  }

  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td class="num">${escapeHtml(formatMoney(row.value))}</td>
        </tr>
      `,
    )
    .join("");
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 14mm 16mm; }
  html, body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #18181b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 180mm; margin: 0 auto; }
  .header {
    border-bottom: 3px solid #2563eb;
    padding-bottom: 14px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
  }
  .brand { color: #2563eb; font-size: 9pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
  h1 { font-size: 20pt; font-weight: 700; margin-top: 4px; color: #09090b; }
  .subtitle { font-size: 10pt; color: #71717a; margin-top: 4px; }
  .meta { text-align: right; font-size: 10pt; }
  .meta dt { color: #71717a; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .meta dd { font-weight: 600; color: #18181b; margin-top: 2px; }
  .meta > div + div { margin-top: 8px; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .section-title {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #3f3f46;
    border-bottom: 1px solid #e4e4e7;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  .fields { display: grid; gap: 10px; }
  .field dt { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
  .field dd { font-size: 10.5pt; color: #18181b; margin-top: 2px; }
  .block { border-top: 1px solid #f4f4f5; padding: 16px 0; }
  .block p { font-size: 10.5pt; color: #27272a; white-space: pre-wrap; line-height: 1.55; }
  .block-note { margin-top: 10px; font-size: 10pt; color: #52525b; }
  .block-note strong { color: #18181b; }
  .cost-section {
    background: #fafafa;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    padding: 16px;
    margin: 8px 0 20px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  thead th {
    text-align: left;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #71717a;
    border-bottom: 2px solid #e4e4e7;
    padding: 8px 0;
    font-weight: 700;
  }
  thead th:last-child { text-align: right; }
  tbody td { padding: 9px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
  tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  tbody tr.summary td { font-weight: 600; color: #3f3f46; }
  tbody tr.total-net td { font-weight: 700; border-bottom: 2px solid #e4e4e7; padding-top: 12px; }
  tbody tr.total-gross td {
    font-size: 12pt;
    font-weight: 700;
    color: #1d4ed8;
    border-bottom: none;
    padding-top: 12px;
  }
  .discount { color: #be123c; }
  .comparison {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    padding: 12px;
    background: #fafafa;
    font-size: 9.5pt;
  }
  .comparison .label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #71717a;
    margin-bottom: 4px;
  }
  .comparison .value { font-variant-numeric: tabular-nums; font-weight: 500; }
  .diff-over { color: #be123c; }
  .diff-under { color: #047857; }
  .footnote { margin-top: 10px; font-size: 8.5pt; color: #a1a1aa; }
  .doc-footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e4e4e7;
    text-align: center;
    font-size: 8.5pt;
    color: #a1a1aa;
  }
  @media print {
    html, body {
      width: 100%;
      height: auto;
      overflow: visible;
      background: #fff !important;
      color: #000 !important;
    }
    .doc {
      max-width: none;
      width: 100%;
    }
    .cost-section, .comparison { break-inside: avoid; }
    .block { break-inside: avoid; }
    .header { break-inside: avoid; }
  }
`;

export function buildServiceReportPrintDocument(
  service: ServiceRecord,
  projectName?: string,
) {
  const costs = {
    estimate: calculateServiceCost(
      service.estimate,
      service.rates,
      service.zoneSettings,
      service.discounts,
    ),
    actual: calculateServiceCost(
      service.actual,
      service.rates,
      service.zoneSettings,
      service.discounts,
    ),
  };
  const actual = costs.actual;
  const workNote = service.actual.workReportNote || service.estimate.workReportNote || "Brak opisu prac.";
  const materialsNote =
    service.actual.materialsNote || service.estimate.materialsNote || "Brak informacji o materiałach.";
  const projectLabel = projectName ?? (service.projectId ? "—" : "Bez projektu");

  const diffNet = actual.netTotal - costs.estimate.netTotal;
  const diffGross = actual.grossTotal - costs.estimate.grossTotal;
  const diffClass = diffNet > 0 ? "diff-over" : diffNet < 0 ? "diff-under" : "";

  const discountRows = [
    service.discounts.percentDiscount > 0
      ? `<tr class="summary">
          <td>Rabat ${service.discounts.percentDiscount}%</td>
          <td class="num discount">−${escapeHtml(formatMoney(actual.percentDiscountAmount))}</td>
        </tr>`
      : "",
    service.discounts.specialDiscountPln > 0
      ? `<tr class="summary">
          <td>Rabat specjalny</td>
          <td class="num discount">−${escapeHtml(formatMoney(service.discounts.specialDiscountPln))}</td>
        </tr>`
      : "",
  ].join("");

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Raport serwisowy — ${escapeHtml(service.title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <header class="header">
      <div>
        <p class="brand">Rentgen firmy</p>
        <h1>Raport serwisowy</h1>
        <p class="subtitle">Smart Home / BMS · rozliczenie serwisu</p>
      </div>
      <dl class="meta">
        <div>
          <dt>Data raportu</dt>
          <dd>${escapeHtml(formatDate(service.updatedAt))}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>${escapeHtml(service.status)}</dd>
        </div>
      </dl>
    </header>

    <div class="columns">
      <section>
        <h2 class="section-title">Dane klienta</h2>
        <dl class="fields">
          ${field("Imię i nazwisko", service.client.fullName)}
          ${field("Obiekt / lokalizacja", service.client.location)}
          ${field("E-mail", service.client.email)}
          ${field("Telefon", service.client.phone)}
        </dl>
      </section>
      <section>
        <h2 class="section-title">Zgłoszenie</h2>
        <dl class="fields">
          ${field("Tytuł", service.title)}
          ${field("Typ serwisu", service.serviceType)}
          ${field("Projekt", projectLabel)}
          ${field("Data utworzenia", formatDate(service.createdAt))}
        </dl>
      </section>
    </div>

    <section class="block">
      <h2 class="section-title">Wykonane prace</h2>
      <p>${escapeHtml(workNote)}</p>
    </section>

    <section class="block">
      <h2 class="section-title">Materiały</h2>
      <p>${escapeHtml(materialsNote)}</p>
      ${
        actual.categories.materials > 0
          ? `<p class="block-note">Koszt materiałów (rozliczane): <strong>${escapeHtml(formatMoney(actual.categories.materials))}</strong></p>`
          : ""
      }
    </section>

    <section class="cost-section">
      <h2 class="section-title">Rozliczenie kosztów serwisu</h2>
      <table>
        <thead>
          <tr>
            <th>Pozycja</th>
            <th>Kwota netto</th>
          </tr>
        </thead>
        <tbody>
          ${costRows(actual)}
          <tr class="summary">
            <td>Suma bez rabatu</td>
            <td class="num">${escapeHtml(formatMoney(actual.subtotalBeforeDiscount))}</td>
          </tr>
          ${discountRows}
          <tr class="total-net">
            <td>Cena netto</td>
            <td class="num">${escapeHtml(formatMoney(actual.netTotal))}</td>
          </tr>
          <tr class="summary">
            <td>VAT ${service.discounts.vatRate}%</td>
            <td class="num">${escapeHtml(formatMoney(actual.vatAmount))}</td>
          </tr>
          <tr class="total-gross">
            <td>Cena brutto do faktury</td>
            <td class="num">${escapeHtml(formatMoney(actual.grossTotal))}</td>
          </tr>
        </tbody>
      </table>
      ${
        actual.kilometerZone > 0
          ? `<p class="footnote">Strefa kilometrowa: ${actual.kilometerZone} · Sugerowane godziny w aucie: ${actual.suggestedCarHoursFromZone}</p>`
          : ""
      }
    </section>

    <section class="block">
      <h2 class="section-title">Porównanie z estymacją</h2>
      <div class="comparison">
        <div>
          <p class="label">Estymacja</p>
          <p class="value">netto ${escapeHtml(formatMoney(costs.estimate.netTotal))}<br />brutto ${escapeHtml(formatMoney(costs.estimate.grossTotal))}</p>
        </div>
        <div>
          <p class="label">Rzeczywiste</p>
          <p class="value">netto ${escapeHtml(formatMoney(actual.netTotal))}<br />brutto ${escapeHtml(formatMoney(actual.grossTotal))}</p>
        </div>
        <div>
          <p class="label">Różnica</p>
          <p class="value ${diffClass}">netto ${diffNet >= 0 ? "+" : ""}${escapeHtml(formatMoney(diffNet))}<br />brutto ${diffGross >= 0 ? "+" : ""}${escapeHtml(formatMoney(diffGross))}</p>
        </div>
      </div>
    </section>

    <div class="doc-footer">Dokument wygenerowany w module Serwis · Rentgen firmy</div>
  </div>
</body>
</html>`;
}

export function printServiceReport(service: ServiceRecord, projectName?: string) {
  const html = buildServiceReportPrintDocument(service, projectName);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Bez noopener — okno musi załadować blob URL z pełnym HTML raportu.
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    window.alert(
      "Przeglądarka zablokowała okno druku. Zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.",
    );
    return;
  }

  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (!printWindow.closed) {
      printWindow.close();
    }
  };

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      window.alert("Nie udało się otworzyć dialogu druku.");
      cleanup();
      return;
    }

    printWindow.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
  };

  const waitForRender = () => window.setTimeout(triggerPrint, 400);

  try {
    if (printWindow.document.readyState === "complete") {
      waitForRender();
    } else {
      printWindow.addEventListener("load", waitForRender, { once: true });
    }
  } catch {
    waitForRender();
  }
}
