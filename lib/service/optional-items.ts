import {
  VAT_RATES,
  type ServiceCostBreakdown,
  type ServiceOptionalItem,
  type ServiceRecord,
  type VatRate,
} from "@/lib/service/types";

function isSettled(service: ServiceRecord) {
  return service.status === "Rozliczony";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function createOptionalItem(vatRate: VatRate = 23): ServiceOptionalItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    netAmount: 0,
    vatRate,
    clientSelected: false,
    billable: false,
  };
}

export function normalizeOptionalItems(value: unknown): ServiceOptionalItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const vat = Number(row.vatRate);
      const id = typeof row.id === "string" && row.id.trim() ? row.id : crypto.randomUUID();

      return {
        id,
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : "",
        netAmount: Math.max(0, Number.isFinite(Number(row.netAmount)) ? Number(row.netAmount) : 0),
        vatRate: (VAT_RATES as readonly number[]).includes(vat) ? (vat as VatRate) : 23,
        clientSelected: row.clientSelected === true,
        billable: row.billable === true,
      } satisfies ServiceOptionalItem;
    })
    .filter((item): item is ServiceOptionalItem => item !== null);
}

export function optionalItemAmounts(item: ServiceOptionalItem) {
  const vatAmount = roundMoney((item.netAmount * item.vatRate) / 100);
  const grossAmount = roundMoney(item.netAmount + vatAmount);
  return { vatAmount, grossAmount };
}

export type OptionalItemsBreakdown = {
  lines: Array<{ item: ServiceOptionalItem; vatAmount: number; grossAmount: number }>;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
};

export function calculateOptionalItemsBreakdown(
  items: ServiceOptionalItem[],
  predicate: (item: ServiceOptionalItem) => boolean = () => true,
): OptionalItemsBreakdown {
  const lines = items.filter(predicate).map((item) => {
    const { vatAmount, grossAmount } = optionalItemAmounts(item);
    return { item, vatAmount, grossAmount };
  });

  return {
    lines,
    netTotal: roundMoney(lines.reduce((sum, line) => sum + line.item.netAmount, 0)),
    vatTotal: roundMoney(lines.reduce((sum, line) => sum + line.vatAmount, 0)),
    grossTotal: roundMoney(lines.reduce((sum, line) => sum + line.grossAmount, 0)),
  };
}

export type ServiceCombinedBilling = {
  base: ServiceCostBreakdown;
  optional: OptionalItemsBreakdown;
  netTotal: number;
  vatAmount: number;
  grossTotal: number;
};

export function getOptionalItemsFilter(
  service: ServiceRecord,
  clientPreviewSelection?: ReadonlySet<string> | null,
): (item: ServiceOptionalItem) => boolean {
  if (clientPreviewSelection) {
    return (item) => clientPreviewSelection.has(item.id);
  }

  if (isSettled(service)) {
    return (item) => item.billable;
  }

  if (service.clientOffer.status === "accepted") {
    return (item) => item.clientSelected;
  }

  if (
    service.status === "Do rozliczenia" ||
    service.status === "W trakcie" ||
    service.status === "Zaplanowany"
  ) {
    return (item) => item.billable;
  }

  return () => false;
}

export function buildCombinedBilling(
  service: ServiceRecord,
  base: ServiceCostBreakdown,
  clientPreviewSelection?: ReadonlySet<string> | null,
): ServiceCombinedBilling {
  const optional = calculateOptionalItemsBreakdown(
    service.optionalItems,
    getOptionalItemsFilter(service, clientPreviewSelection),
  );

  return {
    base,
    optional,
    netTotal: roundMoney(base.netTotal + optional.netTotal),
    vatAmount: roundMoney(base.vatAmount + optional.vatTotal),
    grossTotal: roundMoney(base.grossTotal + optional.grossTotal),
  };
}

export function applyClientOptionalSelection(
  service: ServiceRecord,
  selectedIds: string[],
): ServiceRecord {
  const selected = new Set(selectedIds);

  return {
    ...service,
    optionalItems: service.optionalItems.map((item) => ({
      ...item,
      clientSelected: selected.has(item.id),
      billable: selected.has(item.id),
    })),
  };
}

export function resetOptionalItemSelections(items: ServiceOptionalItem[]): ServiceOptionalItem[] {
  return items.map((item) => ({
    ...item,
    clientSelected: false,
    billable: false,
  }));
}

export function hasOptionalItems(items: ServiceOptionalItem[]) {
  return items.some((item) => item.title.trim() || item.netAmount > 0);
}
