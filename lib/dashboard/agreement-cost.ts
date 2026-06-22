export const AGREEMENT_VAT_RATES = [0, 8, 23] as const;

export type AgreementVatRate = (typeof AGREEMENT_VAT_RATES)[number];

export const DEFAULT_AGREEMENT_VAT_RATE: AgreementVatRate = 23;

export function isAgreementVatRate(value: number | null | undefined): value is AgreementVatRate {
  return value === 0 || value === 8 || value === 23;
}

export function normalizeAgreementVatRate(value: number | null | undefined): AgreementVatRate {
  if (isAgreementVatRate(value)) {
    return value;
  }
  return DEFAULT_AGREEMENT_VAT_RATE;
}

export function computeGrossFromNet(net: number, vatRate: AgreementVatRate) {
  return Math.round(net * (1 + vatRate / 100) * 100) / 100;
}

export function inferAgreementVatRate(
  net: number | null | undefined,
  gross: number | null | undefined,
  storedRate?: number | null,
): AgreementVatRate {
  if (isAgreementVatRate(storedRate)) {
    return storedRate;
  }
  if (net == null || gross == null || net <= 0) {
    return DEFAULT_AGREEMENT_VAT_RATE;
  }
  const implied = Math.round((gross / net - 1) * 100);
  if (isAgreementVatRate(implied)) {
    return implied;
  }
  return AGREEMENT_VAT_RATES.reduce((best, rate) =>
    Math.abs(rate - implied) < Math.abs(best - implied) ? rate : best,
  );
}

export function buildAgreementCostPayload(
  net: number | null | undefined,
  vatRate: AgreementVatRate,
): {
  proposedCostNet: number | null;
  proposedCostGross: number | null;
  proposedCostVatRate: AgreementVatRate | null;
} {
  if (net == null || !Number.isFinite(net) || net < 0) {
    return { proposedCostNet: null, proposedCostGross: null, proposedCostVatRate: null };
  }
  return {
    proposedCostNet: net,
    proposedCostGross: computeGrossFromNet(net, vatRate),
    proposedCostVatRate: vatRate,
  };
}

export function formatVatRateLabel(vatRate: AgreementVatRate) {
  return `${vatRate}%`;
}
