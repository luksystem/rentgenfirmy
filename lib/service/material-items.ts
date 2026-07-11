import {
  VAT_RATES,
  type ServiceMaterialItem,
  type ServiceLineItems,
  type VatRate,
} from "@/lib/service/types";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function createMaterialItem(vatRate: VatRate = 23): ServiceMaterialItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    netAmount: 0,
    vatRate,
    billable: true,
  };
}

export function normalizeMaterialItems(value: unknown): ServiceMaterialItem[] {
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
        billable: row.billable !== false,
      } satisfies ServiceMaterialItem;
    })
    .filter((item): item is ServiceMaterialItem => item !== null);
}

export function sumMaterialItemsCost(items: ServiceMaterialItem[]) {
  return roundMoney(
    items.filter((item) => item.billable).reduce((sum, item) => sum + item.netAmount, 0),
  );
}

export function syncLineItemsMaterialsCost(items: ServiceLineItems): ServiceLineItems {
  const materialItems = items.materialItems ?? [];
  const computed = sumMaterialItemsCost(materialItems);
  const materialsCost =
    materialItems.length > 0 ? computed : roundMoney(items.materialsCost);

  return {
    ...items,
    materialItems,
    materialsCost,
  };
}

export function ensureMaterialItemsFromLegacyCost(items: ServiceLineItems): ServiceLineItems {
  if (items.materialItems.length > 0) {
    return syncLineItemsMaterialsCost(items);
  }

  if (items.materialsCost > 0) {
    return syncLineItemsMaterialsCost({
      ...items,
      materialItems: [
        {
          id: crypto.randomUUID(),
          title: "Materiały",
          description: items.materialsNote,
          netAmount: items.materialsCost,
          vatRate: 23,
          billable: items.billable.materials,
        },
      ],
    });
  }

  return { ...items, materialItems: [] };
}

export function hasMaterialItems(items: ServiceMaterialItem[]) {
  return items.some((item) => item.title.trim() || item.netAmount > 0);
}
