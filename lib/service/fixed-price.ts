import {
  VAT_RATES,
  type ServiceDiscounts,
  type ServiceFixedPriceRow,
  type ServiceFixedPriceTable,
  type VatRate,
} from "@/lib/service/types";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function computeFixedPriceRowNetValue(row: Pick<ServiceFixedPriceRow, "quantity" | "netUnitPrice">) {
  return roundMoney(Math.max(0, row.quantity) * Math.max(0, row.netUnitPrice));
}

export function createFixedPriceRow(): ServiceFixedPriceRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: 1,
    unit: "szt.",
    netUnitPrice: 0,
    netValue: 0,
    vatRate: null,
    active: true,
    showDescription: false,
    productId: null,
    description: "",
  };
}

export function createFixedPriceTable(): ServiceFixedPriceTable {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    showProductDescriptions: false,
    rows: [],
  };
}

export function normalizeFixedPriceRow(value: unknown): ServiceFixedPriceRow | null {
  const data = asObject(value);
  const id = typeof data.id === "string" && data.id.trim() ? data.id : crypto.randomUUID();
  const vatRaw = data.vatRate;
  const vatRate =
    vatRaw === null || vatRaw === undefined
      ? null
      : (VAT_RATES as readonly number[]).includes(Number(vatRaw))
        ? (Number(vatRaw) as VatRate)
        : null;

  const quantity = Math.max(0, asNumber(data.quantity, 1));
  const netUnitPrice = Math.max(0, asNumber(data.netUnitPrice));

  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    quantity,
    unit: typeof data.unit === "string" ? data.unit : "szt.",
    netUnitPrice,
    netValue: computeFixedPriceRowNetValue({ quantity, netUnitPrice }),
    vatRate,
    active: data.active !== false,
    showDescription: data.showDescription === true,
    productId: typeof data.productId === "string" ? data.productId : null,
    description: typeof data.description === "string" ? data.description : "",
  };
}

export function normalizeFixedPriceTables(value: unknown): ServiceFixedPriceTable[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const data = asObject(entry);
      const id = typeof data.id === "string" && data.id.trim() ? data.id : crypto.randomUUID();
      const rows = Array.isArray(data.rows)
        ? data.rows
            .map(normalizeFixedPriceRow)
            .filter((row): row is ServiceFixedPriceRow => row !== null)
        : [];

      return {
        id,
        title: typeof data.title === "string" ? data.title : "",
        description: typeof data.description === "string" ? data.description : "",
        showProductDescriptions: data.showProductDescriptions === true,
        rows,
      } satisfies ServiceFixedPriceTable;
    })
    .filter((table) => table.title.trim() || table.rows.length > 0 || table.description.trim());
}

export type FixedPriceVatLine = {
  vatRate: VatRate;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
};

export type FixedPriceTableBreakdown = {
  table: ServiceFixedPriceTable;
  netTotal: number;
  vatLines: FixedPriceVatLine[];
  grossTotal: number;
};

export type FixedPriceBreakdown = {
  tables: FixedPriceTableBreakdown[];
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
};

function effectiveVatRate(row: ServiceFixedPriceRow, defaultVat: VatRate): VatRate {
  return row.vatRate ?? defaultVat;
}

export function calculateFixedPriceTableBreakdown(
  table: ServiceFixedPriceTable,
  defaultVat: VatRate,
): FixedPriceTableBreakdown {
  const activeRows = table.rows.filter((row) => row.active && row.name.trim());
  const netTotal = roundMoney(
    activeRows.reduce((sum, row) => sum + computeFixedPriceRowNetValue(row), 0),
  );

  const vatBuckets = new Map<VatRate, number>();
  for (const row of activeRows) {
    const vat = effectiveVatRate(row, defaultVat);
    const net = computeFixedPriceRowNetValue(row);
    vatBuckets.set(vat, roundMoney((vatBuckets.get(vat) ?? 0) + net));
  }

  const vatLines: FixedPriceVatLine[] = [...vatBuckets.entries()].map(([vatRate, netAmount]) => {
    const vatAmount = roundMoney((netAmount * vatRate) / 100);
    return {
      vatRate,
      netAmount,
      vatAmount,
      grossAmount: roundMoney(netAmount + vatAmount),
    };
  });

  const grossTotal = roundMoney(vatLines.reduce((sum, line) => sum + line.grossAmount, 0));

  return { table, netTotal, vatLines, grossTotal };
}

export function hasActiveFixedPriceRows(tables: ServiceFixedPriceTable[]) {
  return tables.some((table) =>
    table.rows.some((row) => row.active && row.name.trim() && row.netUnitPrice > 0),
  );
}

export function calculateFixedPriceBreakdown(
  tables: ServiceFixedPriceTable[],
  discounts: ServiceDiscounts,
): FixedPriceBreakdown {
  const defaultVat = discounts.vatRate;
  const tableBreakdowns = tables.map((table) =>
    calculateFixedPriceTableBreakdown(table, defaultVat),
  );

  const netBeforeDiscount = roundMoney(tableBreakdowns.reduce((sum, t) => sum + t.netTotal, 0));
  const percentDiscountAmount = roundMoney(
    (netBeforeDiscount * Math.max(0, discounts.percentDiscount)) / 100,
  );
  const netAfterDiscount = roundMoney(
    Math.max(0, netBeforeDiscount - percentDiscountAmount - Math.max(0, discounts.specialDiscountPln)),
  );

  const discountRatio = netBeforeDiscount > 0 ? netAfterDiscount / netBeforeDiscount : 1;

  const vatLines: FixedPriceVatLine[] = [];
  for (const table of tableBreakdowns) {
    for (const line of table.vatLines) {
      const adjustedNet = roundMoney(line.netAmount * discountRatio);
      const vatAmount = roundMoney((adjustedNet * line.vatRate) / 100);
      const existing = vatLines.find((entry) => entry.vatRate === line.vatRate);
      if (existing) {
        existing.netAmount = roundMoney(existing.netAmount + adjustedNet);
        existing.vatAmount = roundMoney(existing.vatAmount + vatAmount);
        existing.grossAmount = roundMoney(existing.grossAmount + adjustedNet + vatAmount);
      } else {
        vatLines.push({
          vatRate: line.vatRate,
          netAmount: adjustedNet,
          vatAmount,
          grossAmount: roundMoney(adjustedNet + vatAmount),
        });
      }
    }
  }

  const netTotal = netAfterDiscount;
  const vatTotal = roundMoney(vatLines.reduce((sum, line) => sum + line.vatAmount, 0));
  const grossTotal = roundMoney(netTotal + vatTotal);

  return {
    tables: tableBreakdowns,
    netTotal,
    vatTotal,
    grossTotal,
  };
}
