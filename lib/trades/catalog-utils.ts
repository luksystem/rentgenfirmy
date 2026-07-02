import type { ProjectTradeInput } from "@/lib/dashboard/trade-types";
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

export function projectTradeToCatalogItem(input: ProjectTradeInput): TradeCatalogItem | null {
  const name = input.name.trim();
  const company = (input.company ?? "").trim();
  if (!name || !company) {
    return null;
  }

  return {
    name,
    company,
    contactName: input.contactName?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    description: input.description?.trim() || "",
    communicationProtocols: [],
  };
}

/** Dodaje brakującą firmę do katalogu; uzupełnia puste pola istniejącego wpisu. */
export function mergeTradeIntoCatalogItems(
  items: TradeCatalogItem[],
  trade: ProjectTradeInput,
): TradeCatalogItem[] {
  const nextItem = projectTradeToCatalogItem(trade);
  if (!nextItem) {
    return items;
  }

  const key = tradeCatalogEntryKey(nextItem);
  const index = items.findIndex((item) => tradeCatalogEntryKey(item) === key);
  if (index === -1) {
    return [...items, nextItem];
  }

  const existing = items[index];
  const merged: TradeCatalogItem = {
    ...existing,
    contactName: existing.contactName?.trim() || nextItem.contactName,
    email: existing.email?.trim() || nextItem.email,
    phone: existing.phone?.trim() || nextItem.phone,
    description: existing.description?.trim() || nextItem.description,
  };

  return items.map((item, itemIndex) => (itemIndex === index ? merged : item));
}
