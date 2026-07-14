const KWH_PATTERNS = [
  /zużycie[^0-9]{0,40}([\d\s.,]+)\s*kwh/i,
  /([\d\s.,]+)\s*kwh/i,
  /energia[^0-9]{0,30}([\d\s.,]+)/i,
];

const COST_PATTERNS = [
  /do zapłaty[^0-9]{0,30}([\d\s.,]+)/i,
  /razem[^0-9]{0,30}([\d\s.,]+)\s*zł/i,
  /brutto[^0-9]{0,30}([\d\s.,]+)/i,
  /([\d\s.,]+)\s*pln/i,
];

const DATE_RANGE_PATTERN =
  /(\d{4}-\d{2}-\d{2}|\d{2}[./]\d{2}[./]\d{4}).{0,40}(\d{4}-\d{2}-\d{2}|\d{2}[./]\d{2}[./]\d{4})/;

const SUPPLIER_HINTS = ["PGE", "Tauron", "Enea", "Energa", "PGNiG", "ORLEN", "RWE"];

export type ParsedEnergyInvoiceFields = {
  totalKwh: number | null;
  totalCostPln: number | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  supplierName: string | null;
};

function parsePolishNumber(raw: string) {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

function firstMatchNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = parsePolishNumber(match[1]);
      if (value != null) {
        return value;
      }
    }
  }
  return null;
}

function normalizeDateToken(token: string) {
  const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return token;
  }
  const pl = token.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (pl) {
    return `${pl[3]}-${pl[2]}-${pl[1]}`;
  }
  return null;
}

function detectSupplier(text: string) {
  const upper = text.toUpperCase();
  for (const hint of SUPPLIER_HINTS) {
    if (upper.includes(hint.toUpperCase())) {
      return hint;
    }
  }
  return null;
}

export function parseEnergyFieldsFromPdfText(text: string): ParsedEnergyInvoiceFields {
  const compact = text.replace(/\s+/g, " ").trim();
  const rangeMatch = DATE_RANGE_PATTERN.exec(compact);

  return {
    totalKwh: firstMatchNumber(compact, KWH_PATTERNS),
    totalCostPln: firstMatchNumber(compact, COST_PATTERNS),
    billingPeriodStart: rangeMatch?.[1] ? normalizeDateToken(rangeMatch[1]) : null,
    billingPeriodEnd: rangeMatch?.[2] ? normalizeDateToken(rangeMatch[2]) : null,
    supplierName: detectSupplier(compact),
  };
}

export function mergeEnergyFields(
  manual: ParsedEnergyInvoiceFields,
  fromPdf: ParsedEnergyInvoiceFields,
): ParsedEnergyInvoiceFields {
  return {
    totalKwh: manual.totalKwh ?? fromPdf.totalKwh,
    totalCostPln: manual.totalCostPln ?? fromPdf.totalCostPln,
    billingPeriodStart: manual.billingPeriodStart ?? fromPdf.billingPeriodStart,
    billingPeriodEnd: manual.billingPeriodEnd ?? fromPdf.billingPeriodEnd,
    supplierName: manual.supplierName ?? fromPdf.supplierName,
  };
}

export function excerptPdfText(text: string, maxChars = 4000) {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}…`;
}
