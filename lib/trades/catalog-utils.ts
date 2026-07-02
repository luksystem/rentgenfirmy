import type { TradeCatalogItem } from "@/lib/field-options";

export function tradeCatalogEntryKey(item: Pick<TradeCatalogItem, "name" | "company">) {
  const trade = item.name.trim().toLowerCase();
  const company = (item.company ?? "").trim().toLowerCase();
  return `${trade}::${company}`;
}

export function groupCatalogByTrade(items: TradeCatalogItem[]) {
  const groups = new Map<string, TradeCatalogItem[]>();

  for (const item of items) {
    const trade = item.name.trim();
    if (!trade) {
      continue;
    }
    const bucket = groups.get(trade) ?? [];
    bucket.push(item);
    groups.set(trade, bucket);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "pl"))
    .map(([tradeName, companies]) => ({
      tradeName,
      companies: companies.sort((left, right) =>
        (left.company ?? "").localeCompare(right.company ?? "", "pl"),
      ),
    }));
}

export function uniqueTradeNames(items: TradeCatalogItem[]) {
  return [...new Set(items.map((item) => item.name.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "pl"),
  );
}

export function companiesForTrade(tradeName: string, items: TradeCatalogItem[]) {
  const normalized = tradeName.trim().toLowerCase();
  return items.filter((item) => item.name.trim().toLowerCase() === normalized);
}

export function formatCatalogCompanyLabel(item: TradeCatalogItem) {
  return item.company?.trim() || item.contactName?.trim() || item.name;
}
