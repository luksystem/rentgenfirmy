import {
  AGREEMENT_VAT_RATES,
  computeGrossFromNet,
  DEFAULT_AGREEMENT_VAT_RATE,
  normalizeAgreementVatRate,
  type AgreementVatRate,
} from "@/lib/dashboard/agreement-cost";
import type { ProjectHourBudgetSummary } from "@/lib/time-tracking/project-hour-budget";

export { AGREEMENT_VAT_RATES, computeGrossFromNet, DEFAULT_AGREEMENT_VAT_RATE, normalizeAgreementVatRate };
export type { AgreementVatRate };

export const SETTLEMENT_KINDS = ["charge", "sales_invoice", "payment", "schedule"] as const;
export type SettlementKind = (typeof SETTLEMENT_KINDS)[number];

export const SETTLEMENT_KIND_LABELS: Record<SettlementKind, string> = {
  charge: "Należność",
  sales_invoice: "Faktura sprzedażowa",
  payment: "Spłata",
  schedule: "Harmonogram spłat",
};

export const SETTLEMENT_SOURCES = [
  "contract",
  "offer",
  "change_request",
  "hourly",
  "agreement",
  "manual",
  "none",
] as const;
export type SettlementSource = (typeof SETTLEMENT_SOURCES)[number];

export const SETTLEMENT_SOURCE_LABELS: Record<SettlementSource, string> = {
  contract: "Umowa główna",
  offer: "Oferta",
  change_request: "Zmiana projektu",
  hourly: "Godziny",
  agreement: "Ustalenie",
  manual: "Ręcznie",
  none: "—",
};

export const CONTRACT_QUOTA_UNITS = ["hours", "visits", "other"] as const;
export type ContractQuotaUnit = (typeof CONTRACT_QUOTA_UNITS)[number];

export const CONTRACT_QUOTA_UNIT_LABELS: Record<ContractQuotaUnit, string> = {
  hours: "godziny",
  visits: "przyjazdy",
  other: "inne",
};

export type ProjectBillingSettings = {
  projectId: string;
  fixedPriceEnabled: boolean;
  hourlyEnabled: boolean;
  contractAmountNet: number | null;
  contractVatRate: AgreementVatRate | null;
  contractAmountGross: number | null;
  hourlyRateNet: number | null;
  currency: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectBillingSettingsInput = {
  fixedPriceEnabled: boolean;
  hourlyEnabled: boolean;
  contractAmountNet?: number | null;
  contractVatRate?: number | null;
  contractAmountGross?: number | null;
  hourlyRateNet?: number | null;
  currency?: string;
  notes?: string;
};

export type ProjectContractQuota = {
  id: string;
  projectId: string;
  label: string;
  quantity: number;
  unit: ContractQuotaUnit;
  position: number;
  notes: string;
  /** Kategoria czasu pracy — zużycie w rozliczeniu liczone z wpisów tej kategorii */
  timeCategoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectContractQuotaInput = {
  label: string;
  quantity: number;
  unit: ContractQuotaUnit;
  notes?: string;
  timeCategoryId?: string | null;
  position?: number;
};

export type ProjectHourlyReport = {
  id: string;
  projectId: string;
  workDate: string;
  hours: number;
  roleLabel: string;
  amountNet: number | null;
  vatRate: number | null;
  amountGross: number | null;
  notes: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectHourlyReportInput = {
  workDate: string;
  hours: number;
  roleLabel?: string;
  amountNet?: number | null;
  vatRate?: number | null;
  amountGross?: number | null;
  notes?: string;
};

export type ProjectSettlementEntry = {
  id: string;
  projectId: string;
  kind: SettlementKind;
  source: SettlementSource;
  sourceId: string | null;
  processStageId: string | null;
  title: string;
  amountNet: number;
  vatRate: number;
  amountGross: number;
  currency: string;
  entryDate: string | null;
  dueDate: string | null;
  invoiceNumber: string;
  externalRef: string;
  notes: string;
  isAuto: boolean;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSettlementEntryInput = {
  kind: SettlementKind;
  source?: SettlementSource;
  sourceId?: string | null;
  processStageId?: string | null;
  title: string;
  amountNet: number;
  vatRate: number;
  amountGross?: number;
  currency?: string;
  entryDate?: string | null;
  dueDate?: string | null;
  invoiceNumber?: string;
  externalRef?: string;
  notes?: string;
  isAuto?: boolean;
};

export type ProjectSettlementsBundle = {
  settings: ProjectBillingSettings | null;
  quotas: ProjectContractQuota[];
  hourlyReports: ProjectHourlyReport[];
  entries: ProjectSettlementEntry[];
  /** Zużycie godzin z time_entries — gdy model godzinowy włączony */
  hourBudget?: ProjectHourBudgetSummary | null;
};

export type ProjectSettlementSummary = {
  chargesNet: number;
  chargesGross: number;
  invoicedNet: number;
  invoicedGross: number;
  paidNet: number;
  paidGross: number;
  scheduleNet: number;
  scheduleGross: number;
  /** Saldo netto: należności − spłaty */
  balanceNet: number;
  balanceGross: number;
  /** Harmonogram vs należności (netto) */
  scheduleCoverageNet: number;
  chargesCount: number;
  invoicesCount: number;
  paymentsCount: number;
  scheduleCount: number;
};

export function isSettlementKind(value: string): value is SettlementKind {
  return (SETTLEMENT_KINDS as readonly string[]).includes(value);
}

export function isSettlementSource(value: string): value is SettlementSource {
  return (SETTLEMENT_SOURCES as readonly string[]).includes(value);
}

export function isContractQuotaUnit(value: string): value is ContractQuotaUnit {
  return (CONTRACT_QUOTA_UNITS as readonly string[]).includes(value);
}

export function buildMoneyPayload(
  net: number | null | undefined,
  vatRate: number | null | undefined,
): { amountNet: number; vatRate: AgreementVatRate; amountGross: number } | null {
  if (net == null || !Number.isFinite(net) || net < 0) {
    return null;
  }
  const rate = normalizeAgreementVatRate(vatRate);
  return {
    amountNet: Math.round(net * 100) / 100,
    vatRate: rate,
    amountGross: computeGrossFromNet(net, rate),
  };
}

export function normalizeSettlementEntryInput(
  input: ProjectSettlementEntryInput,
): ProjectSettlementEntryInput {
  const rate = normalizeAgreementVatRate(input.vatRate);
  const net = Math.max(0, Number.isFinite(input.amountNet) ? input.amountNet : 0);
  return {
    ...input,
    title: input.title.trim(),
    amountNet: net,
    vatRate: rate,
    amountGross: input.amountGross ?? computeGrossFromNet(net, rate),
    currency: input.currency?.trim() || "PLN",
    entryDate: input.entryDate?.trim() || null,
    dueDate: input.dueDate?.trim() || null,
    invoiceNumber: input.invoiceNumber?.trim() ?? "",
    externalRef: input.externalRef?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    source: input.source ?? (input.kind === "charge" ? "manual" : "none"),
    sourceId: input.sourceId ?? null,
    processStageId: input.processStageId ?? null,
  };
}

export function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildSettlementSummary(entries: ProjectSettlementEntry[]): ProjectSettlementSummary {
  let chargesNet = 0;
  let chargesGross = 0;
  let invoicedNet = 0;
  let invoicedGross = 0;
  let paidNet = 0;
  let paidGross = 0;
  let scheduleNet = 0;
  let scheduleGross = 0;
  let chargesCount = 0;
  let invoicesCount = 0;
  let paymentsCount = 0;
  let scheduleCount = 0;

  for (const entry of entries) {
    if (entry.kind === "charge") {
      chargesNet += entry.amountNet;
      chargesGross += entry.amountGross;
      chargesCount += 1;
    } else if (entry.kind === "sales_invoice") {
      invoicedNet += entry.amountNet;
      invoicedGross += entry.amountGross;
      invoicesCount += 1;
    } else if (entry.kind === "payment") {
      paidNet += entry.amountNet;
      paidGross += entry.amountGross;
      paymentsCount += 1;
    } else if (entry.kind === "schedule") {
      scheduleNet += entry.amountNet;
      scheduleGross += entry.amountGross;
      scheduleCount += 1;
    }
  }

  const round = (value: number) => Math.round(value * 100) / 100;

  const balanceNet = round(chargesNet - paidNet);
  const scheduleCoverageNet = round(scheduleNet - chargesNet);

  return {
    chargesNet: round(chargesNet),
    chargesGross: round(chargesGross),
    invoicedNet: round(invoicedNet),
    invoicedGross: round(invoicedGross),
    paidNet: round(paidNet),
    paidGross: round(paidGross),
    scheduleNet: round(scheduleNet),
    scheduleGross: round(scheduleGross),
    balanceNet,
    balanceGross: round(chargesGross - paidGross),
    scheduleCoverageNet,
    chargesCount,
    invoicesCount,
    paymentsCount,
    scheduleCount,
  };
}

export type SettlementChargeSourceBreakdown = {
  contractNet: number;
  extraNet: number;
  otherNet: number;
};

/** Rozbicie kwoty "Do zapłaty" wg pochodzenia — umowa główna vs zmiany/oferty vs inne (bez alokacji wpłat). */
export function buildSettlementChargeSourceBreakdown(
  entries: ProjectSettlementEntry[],
): SettlementChargeSourceBreakdown {
  let contractNet = 0;
  let extraNet = 0;
  let otherNet = 0;

  for (const entry of entries) {
    if (entry.kind !== "charge") {
      continue;
    }
    if (entry.source === "contract") {
      contractNet += entry.amountNet;
    } else if (entry.source === "change_request" || entry.source === "offer") {
      extraNet += entry.amountNet;
    } else {
      otherNet += entry.amountNet;
    }
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    contractNet: round(contractNet),
    extraNet: round(extraNet),
    otherNet: round(otherNet),
  };
}

export function emptyBillingSettings(projectId: string): ProjectBillingSettings {
  const now = new Date().toISOString();
  return {
    projectId,
    fixedPriceEnabled: false,
    hourlyEnabled: false,
    contractAmountNet: null,
    contractVatRate: DEFAULT_AGREEMENT_VAT_RATE,
    contractAmountGross: null,
    hourlyRateNet: null,
    currency: "PLN",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}
