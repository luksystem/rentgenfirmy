import { getPublicOfferView } from "@/lib/service/client-offer-public-view";
import { buildServiceReportPrintDocument } from "@/lib/service/print-service-report";
import { getServiceCombinedBilling } from "@/lib/service/report-document";
import type { ServiceRecord } from "@/lib/service/types";
import { formatDate, formatMoney } from "@/lib/utils";

export type ClientOfferAcceptedDocument = {
  acceptedAt: string;
  reportHtml: string;
  title: string;
  grossTotal: number;
};

const ACCEPTED_BANNER_STYLES = `
  .accepted-frozen-banner {
    margin: 0 0 20px;
    padding: 14px 16px;
    border: 2px solid #059669;
    border-radius: 10px;
    background: #ecfdf5;
    color: #065f46;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  .accepted-frozen-banner strong {
    display: block;
    font-size: 11.5pt;
    margin-bottom: 4px;
  }
`;

export function buildAcceptedOfferDocument(
  service: ServiceRecord,
  acceptedAt: string,
  projectName?: string,
): ClientOfferAcceptedDocument {
  const view = getPublicOfferView(service);
  const combined = getServiceCombinedBilling(view);
  const baseHtml = buildServiceReportPrintDocument(view, projectName);
  const banner = `<div class="accepted-frozen-banner">
    <strong>Zaakceptowana wycena — dokument zamrożony</strong>
    Klient zaakceptował tę wersję oferty ${formatDate(acceptedAt)}.
    Poniższy raport odzwierciedla treść widoczną dla klienta w momencie akceptacji
    (kwota brutto: ${formatMoney(combined.grossTotal)}).
  </div>`;

  const reportHtml = baseHtml
    .replace("</style>", `${ACCEPTED_BANNER_STYLES}</style>`)
    .replace("<body>", `<body>${banner}`);

  return {
    acceptedAt,
    reportHtml,
    title: service.title,
    grossTotal: combined.grossTotal,
  };
}

export function normalizeClientOfferAcceptedDocument(
  value: unknown,
): ClientOfferAcceptedDocument | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.acceptedAt !== "string" ||
    typeof row.reportHtml !== "string" ||
    typeof row.title !== "string" ||
    typeof row.grossTotal !== "number"
  ) {
    return null;
  }

  return {
    acceptedAt: row.acceptedAt,
    reportHtml: row.reportHtml,
    title: row.title,
    grossTotal: row.grossTotal,
  };
}
