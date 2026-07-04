import { DEFAULT_COMPANY_PROFILE } from "@/lib/company/company-profile";
import {
  buildCompanyFooterHtml,
  COMPANY_FOOTER_PRINT_STYLES,
  resolveCompanyProfileDocument,
  type CompanyProfileDocument,
} from "@/lib/company/company-profile-document";
import { fetchCompanyProfileDocumentClient } from "@/lib/hooks/use-company-profile";
import {
  buildServiceReportCosts,
  getAppliedDiscountDescription,
  getServiceReportBillingBreakdown,
  getServiceReportBillingDiscounts,
  getServiceReportDocumentMeta,
  getServiceReportMaterialsNote,
  getServiceReportPhotos,
  getServiceReportQuantitySections,
  getServiceReportWarrantyHoursRows,
  getServiceReportWorkNote,
  getServiceReportWorkTimeSections,
  hasAppliedDiscount,
  isServiceSettled,
} from "@/lib/service/report-document";
import {
  buildAccommodationsCompareRows,
  buildMaterialsCompareRows,
  buildTripCountCompareRows,
  buildWorkTimeCompareRows,
  type ReportCompareRow,
} from "@/lib/service/report-compare-rows";
import { formatDate, formatMoney } from "@/lib/utils";
import { openHtmlDocument } from "@/lib/service/open-html-document";
import {
  attachSignedUrlsToServicePhotos,
  type ServicePhotoWithUrl,
} from "@/lib/service/service-photos";
import type { ServiceCostBreakdown, ServiceDiscounts, ServiceRecord } from "@/lib/service/types";

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

function costRows(breakdown: ServiceCostBreakdown, emptyMessage: string) {
  const rows = [
    { label: "Auto (kilometry)", value: breakdown.categories.car },
    { label: "Godziny w aucie", value: breakdown.categories.carHours },
    { label: "Praca", value: breakdown.categories.labor },
    { label: "Materiały", value: breakdown.categories.materials },
    { label: "Noclegi", value: breakdown.categories.accommodations },
  ].filter((row) => row.value > 0);

  if (rows.length === 0) {
    return `<tr><td colspan="2" class="muted">${escapeHtml(emptyMessage)}</td></tr>`;
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

function discountSummaryRows(
  billing: ServiceCostBreakdown,
  discounts: ServiceDiscounts,
) {
  const percentRow =
    discounts.percentDiscount > 0
      ? `<tr class="summary discount-row">
          <td>Rabat procentowy (${discounts.percentDiscount}%)</td>
          <td class="num">−${escapeHtml(formatMoney(billing.percentDiscountAmount))}</td>
        </tr>`
      : `<tr class="summary muted-row">
          <td>Rabat procentowy (0%)</td>
          <td class="num muted-cell">—</td>
        </tr>`;

  const specialRow =
    discounts.specialDiscountPln > 0
      ? `<tr class="summary discount-row">
          <td>Rabat specjalny</td>
          <td class="num">−${escapeHtml(formatMoney(discounts.specialDiscountPln))}</td>
        </tr>`
      : `<tr class="summary muted-row">
          <td>Rabat specjalny</td>
          <td class="num muted-cell">—</td>
        </tr>`;

  return `${percentRow}${specialRow}`;
}

function discountBannerHtml(
  discounts: ServiceDiscounts,
  billing: ServiceCostBreakdown,
) {
  const description = getAppliedDiscountDescription(discounts, billing);
  const active = hasAppliedDiscount(discounts);

  return `<div class="discount-note${active ? "" : " inactive"}">
    <p class="label">Przyznany rabat</p>
    <p><strong>${escapeHtml(description)}</strong></p>
  </div>`;
}

function compareTableHead(showComparison: boolean, valueHeader: string) {
  return `<thead>
    <tr>
      <th>Pozycja</th>
      <th>${escapeHtml(showComparison ? "Przewidywane" : valueHeader)}</th>
      ${showComparison ? "<th>Rozliczone</th>" : ""}
    </tr>
  </thead>`;
}

function compareTableRows(rows: ReportCompareRow[], showComparison: boolean) {
  return rows
    .map(
      (row) => `
    <tr class="${row.group ? "work-time-group" : row.detail ? "work-time-detail" : ""}">
      <td>${escapeHtml(row.label)}</td>
      <td class="num">${escapeHtml(row.predicted)}</td>
      ${showComparison ? `<td class="num">${escapeHtml(row.settled)}</td>` : ""}
    </tr>
  `,
    )
    .join("");
}

function compareSectionHtml(
  title: string,
  rows: ReportCompareRow[],
  showComparison: boolean,
  valueHeader: string,
  compact = false,
) {
  const tableClass = compact
    ? "work-time-table work-time-table-compact"
    : "work-time-table";
  const wrapClass = compact ? "work-time-compact-wrap" : "";

  return `<section class="sub-block work-time-section">
    <h3 class="subsection-title">${escapeHtml(title)}</h3>
    <div class="${wrapClass}">
      <table class="${tableClass}">
        ${compareTableHead(showComparison, valueHeader)}
        <tbody>
          ${compareTableRows(rows, showComparison)}
        </tbody>
      </table>
    </div>
  </section>`;
}

function materialsSectionHtml(materialsNote: string) {
  return `<div class="sub-block">
    <h3 class="subsection-title">Materiały</h3>
    <div class="prose">${materialsNote.trim() || "Brak informacji o materiałach."}</div>
  </div>`;
}

function reportCompareSectionsHtml(service: ServiceRecord, detailed: boolean) {
  const workTimeSections = getServiceReportWorkTimeSections(service);
  const quantitySections = getServiceReportQuantitySections(service);
  const workTimeRows = [
    ...buildTripCountCompareRows(
      quantitySections.predicted.tripCount,
      quantitySections.actual.tripCount,
    ),
    ...buildWorkTimeCompareRows(
      workTimeSections.predicted,
      workTimeSections.actual,
      detailed,
    ),
  ];
  const materialsRows = buildMaterialsCompareRows(
    quantitySections.predicted.materialsCost,
    quantitySections.actual.materialsCost,
  );
  const accommodationsRows = buildAccommodationsCompareRows(
    quantitySections.predicted.accommodations,
    quantitySections.actual.accommodations,
  );
  const workTimeTitle = workTimeSections.showComparison
    ? "Czas pracy"
    : "Przewidywany czas pracy";

  const parts: string[] = [];

  parts.push(
    compareSectionHtml(
      "Koszty materiałów",
      materialsRows,
      quantitySections.showComparison,
      "Koszt",
      !detailed,
    ),
  );

  if (!detailed) {
    parts.push(
      compareSectionHtml(
        "Noclegi",
        accommodationsRows,
        quantitySections.showComparison,
        "Ilość",
        true,
      ),
    );
  }

  parts.push(
    compareSectionHtml(
      workTimeTitle,
      workTimeRows,
      workTimeSections.showComparison,
      "Ilość",
      !detailed,
    ),
  );

  const warrantyRows = getServiceReportWarrantyHoursRows(service);
  if (warrantyRows.length > 0) {
    parts.push(
      compareSectionHtml(
        "Prace w ramach gwarancji",
        warrantyRows,
        false,
        "Godziny",
        !detailed,
      ),
    );
  }

  return {
    materialsRows,
    quantityShowComparison: quantitySections.showComparison,
    body: parts.join(""),
  };
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 14mm 16mm; }
  html, body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #18181b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 180mm; margin: 0 auto; }
  .header {
    border-bottom: 2px solid #18181b;
    padding-bottom: 16px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
  }
  .brand {
    font-size: 8.5pt;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #71717a;
  }
  h1 { font-size: 19pt; font-weight: 700; margin-top: 6px; color: #09090b; letter-spacing: -0.02em; }
  .subtitle { font-size: 10pt; color: #71717a; margin-top: 4px; }
  .meta { text-align: right; font-size: 10pt; }
  .meta dt { color: #a1a1aa; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .meta dd { font-weight: 600; color: #18181b; margin-top: 2px; }
  .meta > div + div { margin-top: 10px; }
  .major-section {
    border-top: 1.5px solid #27272a;
    padding: 22px 0 4px;
    margin-top: 4px;
  }
  .major-label {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #a1a1aa;
    margin-bottom: 16px;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  .columns > section + section {
    border-left: 1px solid #e4e4e7;
    padding-left: 28px;
  }
  .section-title {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #18181b;
    margin-bottom: 12px;
  }
  .subsection-title {
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #3f3f46;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e4e4e7;
  }
  .fields { display: grid; gap: 11px; }
  .field dt {
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a1a1aa;
  }
  .field dd { font-size: 10.5pt; color: #18181b; margin-top: 3px; font-weight: 500; }
  .sub-block { margin-bottom: 18px; }
  .sub-block:last-child { margin-bottom: 0; }
  .prose {
    font-size: 10.5pt;
    color: #27272a;
    white-space: pre-wrap;
    line-height: 1.6;
  }
  .scope-stack { display: grid; gap: 20px; }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 8px;
  }
  .photo-item {
    break-inside: avoid;
    border: 1px solid #e4e4e7;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  .photo-item img {
    display: block;
    width: 100%;
    min-height: 150px;
    max-height: 230px;
    object-fit: contain;
    background: #fafafa;
  }
  .photo-item figcaption {
    border-top: 1px solid #e4e4e7;
    padding: 8px 10px;
    font-size: 8.5pt;
    color: #52525b;
    line-height: 1.4;
  }
  .cost-section { padding-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .cost-totals-compact {
    margin-left: auto;
    max-width: 400px;
    border-top: 2px solid #27272a;
    padding-top: 4px;
  }
  .work-time-section { break-inside: avoid; }
  .work-time-table { width: 100%; }
  .work-time-table-compact {
    margin-left: auto;
    max-width: 400px;
  }
  .work-time-compact-wrap {
    display: flex;
    justify-content: flex-end;
  }
  tbody tr.work-time-group td {
    font-weight: 700;
    color: #18181b;
    border-bottom: 1px solid #d4d4d8;
    padding-top: 12px;
  }
  tbody tr.work-time-detail td {
    color: #52525b;
    padding-left: 14px;
    font-size: 9.5pt;
  }
  thead th {
    text-align: left;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #a1a1aa;
    border-bottom: 1.5px solid #27272a;
    padding: 8px 0 7px;
    font-weight: 700;
  }
  thead th:last-child { text-align: right; }
  thead th:nth-child(2) { text-align: right; }
  thead th:nth-child(3) { text-align: right; }
  tbody td { padding: 8px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
  tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  tbody tr.summary td { font-weight: 600; color: #3f3f46; }
  tbody tr.muted-row td { color: #a1a1aa; font-weight: 400; }
  tbody tr.total-net td {
    font-weight: 700;
    border-top: 1.5px solid #d4d4d8;
    border-bottom: none;
    padding-top: 14px;
  }
  tbody tr.total-gross td {
    font-size: 12pt;
    font-weight: 700;
    color: #18181b;
    border-bottom: none;
    padding-top: 10px;
  }
  .discount-note {
    border-left: 2px solid #27272a;
    padding: 2px 0 2px 12px;
    margin-bottom: 16px;
    font-size: 10pt;
    color: #3f3f46;
  }
  .discount-note.inactive {
    border-left-color: #e4e4e7;
    color: #71717a;
  }
  .discount-note .label {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a1a1aa;
    margin-bottom: 4px;
  }
  tr.discount-row td { font-weight: 600; color: #3f3f46; }
  .muted-cell { color: #a1a1aa; font-weight: 400; }
  .comparison {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
    border: 1px solid #e4e4e7;
    font-size: 9.5pt;
  }
  .comparison > div {
    padding: 12px 14px;
    border-right: 1px solid #e4e4e7;
  }
  .comparison > div:last-child { border-right: none; }
  .comparison .label {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a1a1aa;
    margin-bottom: 6px;
  }
  .comparison .value { font-variant-numeric: tabular-nums; font-weight: 600; color: #18181b; }
  .diff-over { font-weight: 700; }
  .diff-under { font-weight: 700; }
  .footnote { margin-top: 12px; font-size: 8.5pt; color: #a1a1aa; }
  .doc-footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid #e4e4e7;
    text-align: center;
    font-size: 8pt;
    color: #a1a1aa;
    letter-spacing: 0.02em;
  }
  @media print {
    html, body {
      width: 100%;
      height: auto;
      overflow: visible;
      background: #fff !important;
      color: #000 !important;
    }
    .doc { max-width: none; width: 100%; }
    .cost-section, .comparison { break-inside: avoid; }
    .major-section { break-inside: avoid; }
    .header { break-inside: avoid; }
  }
${COMPANY_FOOTER_PRINT_STYLES}`;

function serviceReportPhotosHtml(photos: ServicePhotoWithUrl[]) {
  if (!photos.length) {
    return "";
  }

  const items = photos
    .filter((photo) => photo.url)
    .map(
      (photo) => `<figure class="photo-item">
        <img src="${escapeHtml(photo.url!)}" alt="${escapeHtml(photo.caption || photo.fileName)}" />
        ${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ""}
      </figure>`,
    )
    .join("");

  if (!items) {
    return "";
  }

  return `<div class="sub-block">
          <h3 class="subsection-title">Zdjęcia</h3>
          <div class="photo-grid">${items}</div>
        </div>`;
}

export function buildServiceReportPrintDocument(
  service: ServiceRecord,
  projectName?: string,
  photosWithUrls: ServicePhotoWithUrl[] = [],
  companyProfile?: CompanyProfileDocument,
) {
  const company = companyProfile ?? resolveCompanyProfileDocument(DEFAULT_COMPANY_PROFILE);
  const settled = isServiceSettled(service);
  const meta = getServiceReportDocumentMeta(service);
  const costs = buildServiceReportCosts(service);
  const billing = getServiceReportBillingBreakdown(service, costs);
  const billingDiscounts = getServiceReportBillingDiscounts(service);
  const workNote =
    getServiceReportWorkNote(service, settled) || "Brak opisu prac.";
  const materialsNote =
    getServiceReportMaterialsNote(service, settled) || "Brak informacji o materiałach.";
  const photosHtml = serviceReportPhotosHtml(photosWithUrls);
  const projectLabel = projectName ?? (service.projectId ? "—" : "Bez projektu");

  const diffNet = costs.actual.netTotal - costs.estimate.netTotal;
  const diffGross = costs.actual.grossTotal - costs.estimate.grossTotal;
  const diffClass = diffNet > 0 ? "diff-over" : diffNet < 0 ? "diff-under" : "";

  const discountRows = discountSummaryRows(billing, billingDiscounts);

  const totalsTail = `<tr class="total-net">
            <td>Cena netto</td>
            <td class="num">${escapeHtml(formatMoney(billing.netTotal))}</td>
          </tr>
          <tr class="summary">
            <td>VAT ${billingDiscounts.vatRate}%</td>
            <td class="num">${escapeHtml(formatMoney(billing.vatAmount))}</td>
          </tr>
          <tr class="total-gross">
            <td>${escapeHtml(meta.grossTotalLabel)}</td>
            <td class="num">${escapeHtml(formatMoney(billing.grossTotal))}</td>
          </tr>`;

  const costTableBody = meta.showDetailedCosts
    ? `${costRows(billing, meta.emptyCostRowsMessage)}
          <tr class="summary">
            <td>Suma netto przed rabatem</td>
            <td class="num">${escapeHtml(formatMoney(billing.subtotalBeforeDiscount))}</td>
          </tr>
          ${discountRows}
          ${totalsTail}`
    : `<tr class="summary">
            <td>Suma netto przed rabatem</td>
            <td class="num">${escapeHtml(formatMoney(billing.subtotalBeforeDiscount))}</td>
          </tr>
          ${discountRows}
          ${totalsTail}`;

  const costTableHead = meta.showDetailedCosts
    ? `<thead>
          <tr>
            <th>Pozycja</th>
            <th>Kwota netto</th>
          </tr>
        </thead>`
    : `<thead>
          <tr>
            <th>Pozycja</th>
            <th>Kwota</th>
          </tr>
        </thead>`;

  const compareSections = reportCompareSectionsHtml(service, meta.showDetailedCosts);

  const comparisonSection = meta.showComparison
    ? `<section class="major-section">
      <p class="major-label">Porównanie</p>
      <h2 class="section-title">Porównanie z przewidywanymi kosztami</h2>
      <div class="comparison">
        <div>
          <p class="label">Przewidywane koszty</p>
          <p class="value">netto ${escapeHtml(formatMoney(costs.estimate.netTotal))}<br />brutto ${escapeHtml(formatMoney(costs.estimate.grossTotal))}</p>
        </div>
        <div>
          <p class="label">Rzeczywiste</p>
          <p class="value">netto ${escapeHtml(formatMoney(costs.actual.netTotal))}<br />brutto ${escapeHtml(formatMoney(costs.actual.grossTotal))}</p>
        </div>
        <div>
          <p class="label">Różnica</p>
          <p class="value ${diffClass}">netto ${diffNet >= 0 ? "+" : ""}${escapeHtml(formatMoney(diffNet))}<br />brutto ${diffGross >= 0 ? "+" : ""}${escapeHtml(formatMoney(diffGross))}</p>
        </div>
      </div>
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meta.title)} — ${escapeHtml(service.title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <header class="header">
      <div>
        <p class="brand">${escapeHtml(company.displayName)}</p>
        <h1>${escapeHtml(meta.title)}</h1>
        <p class="subtitle">${escapeHtml(meta.subtitle)}</p>
      </div>
      <dl class="meta">
        <div>
          <dt>${escapeHtml(meta.dateLabel)}</dt>
          <dd>${escapeHtml(formatDate(service.updatedAt))}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>${escapeHtml(service.status)}</dd>
        </div>
      </dl>
    </header>

    <section class="major-section">
      <p class="major-label">Informacje</p>
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
    </section>

    <section class="major-section">
      <p class="major-label">Zakres prac</p>
      <div class="scope-stack">
        <div class="sub-block">
          <h3 class="subsection-title">${escapeHtml(meta.worksSectionTitle)}</h3>
          <div class="prose">${workNote.trim() || "Brak opisu prac."}</div>
        </div>
        ${materialsSectionHtml(materialsNote)}
        ${photosHtml}
      </div>
    </section>

    <section class="major-section">
      <p class="major-label">Szczegóły wyceny</p>
      ${compareSections.body}
    </section>

    <section class="major-section">
      <p class="major-label">Podsumowanie</p>
      <div class="cost-section">
        <h2 class="section-title">${escapeHtml(meta.costSectionTitle)}</h2>
        ${discountBannerHtml(billingDiscounts, billing)}
        ${
          meta.showDetailedCosts
            ? `<table>
          ${costTableHead}
          <tbody>
            ${costTableBody}
          </tbody>
        </table>`
            : `<div class="cost-totals-compact">
          <table>
          ${costTableHead}
          <tbody>
            ${costTableBody}
          </tbody>
        </table>
        </div>`
        }
        ${
          meta.showDetailedCosts && billing.kilometerZone > 0
            ? `<p class="footnote">Strefa kilometrowa: ${billing.kilometerZone} · Sugerowane godziny w aucie: ${billing.suggestedCarHoursFromZone}</p>`
            : ""
        }
      </div>
    </section>

    ${comparisonSection}

    ${buildCompanyFooterHtml(company)}
  </div>
</body>
</html>`;
}

export async function printServiceReport(
  service: ServiceRecord,
  projectName?: string,
  companyProfile?: CompanyProfileDocument,
) {
  const settled = isServiceSettled(service);
  const photos = getServiceReportPhotos(service, settled);
  const photosWithUrls = photos.length ? await attachSignedUrlsToServicePhotos(photos) : [];
  const company =
    companyProfile ??
    (await fetchCompanyProfileDocumentClient().catch(() =>
      resolveCompanyProfileDocument(DEFAULT_COMPANY_PROFILE),
    ));
  openHtmlDocument(
    buildServiceReportPrintDocument(service, projectName, photosWithUrls, company),
  );
}
