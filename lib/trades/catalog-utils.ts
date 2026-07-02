import type { ProjectTradeInput } from "@/lib/dashboard/trade-types";
import type { TradeCatalogItem } from "@/lib/field-options";
import {
  companiesForTradeName,
  companyItemToCatalogShape,
  mergeCompanyIntoPool,
  tradeCompanyKey,
  uniqueTradeCategoryNames,
} from "@/lib/trades/company-pool";
import type { TradeCompanyItem } from "@/lib/trades/company-types";

export { tradeCompanyKey, mergeCompanyIntoPool, companiesForTradeName, uniqueTradeCategoryNames, companyItemToCatalogShape };

export function tradeCatalogEntryKey(item: Pick<TradeCatalogItem, "name" | "company">) {
  const trade = item.name.trim().toLowerCase();
  const company = (item.company ?? "").trim().toLowerCase();
  return `${trade}::${company}`;
}

export function groupCatalogByTrade(categories: TradeCatalogItem[], companies: TradeCompanyItem[]) {
  return categories.map((category) => ({
    tradeName: category.name,
    category,
    companies: companiesForTradeName(category.name, companies).map(companyItemToCatalogShape),
  }));
}

export function uniqueTradeNames(categories: TradeCatalogItem[]) {
  return uniqueTradeCategoryNames(categories);
}

export function companiesForTrade(tradeName: string, companies: TradeCompanyItem[]) {
  return companiesForTradeName(tradeName, companies).map(companyItemToCatalogShape);
}

export function formatCatalogCompanyLabel(item: Pick<TradeCatalogItem, "company" | "contactName" | "name">) {
  return item.company?.trim() || item.contactName?.trim() || item.name;
}

export function projectTradeToCatalogItem(input: ProjectTradeInput): TradeCatalogItem | null {
  const companies = companiesForTrade(input.name, []);
  void companies;
  const company = (input.company ?? "").trim();
  if (!input.name.trim() || !company) {
    return null;
  }
  return companyItemToCatalogShape({
    tradeName: input.name.trim(),
    company,
    contactName: input.contactName?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    description: input.description?.trim() || undefined,
  });
}

/** @deprecated Użyj mergeCompanyIntoPool na tradeCompanies. */
export function mergeTradeIntoCatalogItems(
  items: TradeCatalogItem[],
  trade: ProjectTradeInput,
): TradeCatalogItem[] {
  void items;
  void trade;
  return items;
}
