import type { ProjectTradeInput } from "@/lib/dashboard/trade-types";
import type { TradeCatalogItem } from "@/lib/field-options";
import type {
  TradeCompanyItem,
  TradeCompanyProjectLink,
  TradeCompanyWithProjects,
} from "@/lib/trades/company-types";

export function tradeCompanyKey(item: Pick<TradeCompanyItem, "tradeName" | "company">) {
  const trade = item.tradeName.trim().toLowerCase();
  const company = item.company.trim().toLowerCase();
  return `${trade}::${company}`;
}

export function projectTradeToCompanyItem(input: ProjectTradeInput): TradeCompanyItem | null {
  const tradeName = input.name.trim();
  const company = (input.company ?? "").trim();
  if (!tradeName || !company) {
    return null;
  }

  return {
    tradeName,
    company,
    contactName: input.contactName?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    description: input.description?.trim() || undefined,
  };
}

export function tradeCatalogItemToCompanyItem(item: TradeCatalogItem): TradeCompanyItem | null {
  const tradeName = item.name.trim();
  const company = (item.company ?? "").trim();
  if (!tradeName || !company) {
    return null;
  }

  return {
    tradeName,
    company,
    contactName: item.contactName?.trim() || undefined,
    email: item.email?.trim() || undefined,
    phone: item.phone?.trim() || undefined,
    addressStreet: item.addressStreet?.trim() || undefined,
    addressCity: item.addressCity?.trim() || undefined,
    addressPostalCode: item.addressPostalCode?.trim() || undefined,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    description: item.description?.trim() || undefined,
  };
}

export function companyItemToCatalogShape(item: TradeCompanyItem): TradeCatalogItem {
  return {
    name: item.tradeName,
    company: item.company,
    contactName: item.contactName,
    email: item.email,
    phone: item.phone,
    addressStreet: item.addressStreet,
    addressCity: item.addressCity,
    addressPostalCode: item.addressPostalCode,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    description: item.description ?? "",
    communicationProtocols: [],
  };
}

export function normalizeTradeCompanyItems(input?: unknown): TradeCompanyItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();

  return input
    .map((value): TradeCompanyItem | null => {
      if (!value || typeof value !== "object") {
        return null;
      }

      const row = value as Partial<TradeCompanyItem> & { name?: string };
      const tradeName = String(row.tradeName ?? row.name ?? "").trim();
      const company = String(row.company ?? "").trim();
      if (!tradeName || !company) {
        return null;
      }

      const key = tradeCompanyKey({ tradeName, company });
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      return {
        tradeName,
        company,
        contactName: String(row.contactName ?? "").trim() || undefined,
        email: String(row.email ?? "").trim() || undefined,
        phone: String(row.phone ?? "").trim() || undefined,
        addressStreet: String(row.addressStreet ?? "").trim() || undefined,
        addressCity: String(row.addressCity ?? "").trim() || undefined,
        addressPostalCode: String(row.addressPostalCode ?? "").trim() || undefined,
        lat:
          typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
        lng:
          typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
        description: String(row.description ?? "").trim() || undefined,
      };
    })
    .filter((item): item is TradeCompanyItem => item !== null);
}

/** Scala firmy z wielu źródeł (ustawienia + projekty) bez duplikatów. */
export function mergeTradeCompanyPools(...pools: TradeCompanyItem[][]): TradeCompanyItem[] {
  const map = new Map<string, TradeCompanyItem>();

  for (const pool of pools) {
    for (const item of pool) {
      const key = tradeCompanyKey(item);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item });
        continue;
      }
      map.set(key, {
        ...existing,
        contactName: existing.contactName?.trim() || item.contactName,
        email: existing.email?.trim() || item.email,
        phone: existing.phone?.trim() || item.phone,
        addressStreet: existing.addressStreet?.trim() || item.addressStreet,
        addressCity: existing.addressCity?.trim() || item.addressCity,
        addressPostalCode: existing.addressPostalCode?.trim() || item.addressPostalCode,
        lat: existing.lat ?? item.lat ?? null,
        lng: existing.lng ?? item.lng ?? null,
        description: existing.description?.trim() || item.description,
      });
    }
  }

  return [...map.values()].sort((left, right) => {
    const tradeDiff = left.tradeName.localeCompare(right.tradeName, "pl");
    if (tradeDiff !== 0) {
      return tradeDiff;
    }
    return left.company.localeCompare(right.company, "pl");
  });
}

export function mergeCompanyIntoPool(
  items: TradeCompanyItem[],
  trade: ProjectTradeInput,
): TradeCompanyItem[] {
  const nextItem = projectTradeToCompanyItem(trade);
  if (!nextItem) {
    return items;
  }
  return mergeTradeCompanyPools(items, [nextItem]);
}

export function companiesForTradeName<T extends TradeCompanyItem>(tradeName: string, companies: T[]) {
  const normalized = tradeName.trim().toLowerCase();
  return companies.filter((item) => item.tradeName.trim().toLowerCase() === normalized);
}

export function uniqueTradeCategoryNames(categories: TradeCatalogItem[]) {
  return [...new Set(categories.map((item) => item.name.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pl"),
  );
}

export function groupTradeDirectory<T extends TradeCompanyItem>(
  categories: TradeCatalogItem[],
  companies: T[],
): Array<{ tradeName: string; category: TradeCatalogItem; companies: T[] }> {
  const categoryNames = new Set(categories.map((item) => item.name.trim().toLowerCase()));
  const orphanCompanies = companies.filter(
    (item) => !categoryNames.has(item.tradeName.trim().toLowerCase()),
  );

  const groups = categories.map((category) => ({
    tradeName: category.name,
    category,
    companies: companiesForTradeName(category.name, companies),
  }));

  for (const company of orphanCompanies) {
    const key = company.tradeName.trim().toLowerCase();
    let group = groups.find((entry) => entry.tradeName.trim().toLowerCase() === key);
    if (!group) {
      group = {
        tradeName: company.tradeName,
        category: {
          name: company.tradeName,
          communicationProtocols: [],
          description: "",
        },
        companies: [],
      };
      groups.push(group);
    }
    if (!group.companies.some((entry) => tradeCompanyKey(entry) === tradeCompanyKey(company))) {
      group.companies.push(company);
    }
  }

  return groups.sort((left, right) => left.tradeName.localeCompare(right.tradeName, "pl"));
}

function mergeProjectLinks(
  left: TradeCompanyProjectLink[],
  right: TradeCompanyProjectLink[],
): TradeCompanyProjectLink[] {
  const map = new Map<string, TradeCompanyProjectLink>();
  for (const link of [...left, ...right]) {
    const existing = map.get(link.projectId);
    if (!existing) {
      map.set(link.projectId, { ...link });
      continue;
    }
    map.set(link.projectId, {
      ...existing,
      contactName: existing.contactName?.trim() || link.contactName,
      email: existing.email?.trim() || link.email,
      phone: existing.phone?.trim() || link.phone,
    });
  }
  return [...map.values()].sort((a, b) => a.projectName.localeCompare(b.projectName, "pl"));
}

/** Scala firmy z wielu źródeł wraz z listą projektów, w których występują. */
export function mergeTradeCompaniesWithProjects(
  ...pools: TradeCompanyWithProjects[][]
): TradeCompanyWithProjects[] {
  const map = new Map<string, TradeCompanyWithProjects>();

  for (const pool of pools) {
    for (const item of pool) {
      const key = tradeCompanyKey(item);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item, projects: [...item.projects] });
        continue;
      }
      map.set(key, {
        ...existing,
        contactName: existing.contactName?.trim() || item.contactName,
        email: existing.email?.trim() || item.email,
        phone: existing.phone?.trim() || item.phone,
        addressStreet: existing.addressStreet?.trim() || item.addressStreet,
        addressCity: existing.addressCity?.trim() || item.addressCity,
        addressPostalCode: existing.addressPostalCode?.trim() || item.addressPostalCode,
        lat: existing.lat ?? item.lat ?? null,
        lng: existing.lng ?? item.lng ?? null,
        description: existing.description?.trim() || item.description,
        projects: mergeProjectLinks(existing.projects, item.projects),
      });
    }
  }

  return [...map.values()].sort((left, right) => {
    const tradeDiff = left.tradeName.localeCompare(right.tradeName, "pl");
    if (tradeDiff !== 0) {
      return tradeDiff;
    }
    return left.company.localeCompare(right.company, "pl");
  });
}

export function tradeCompanyItemWithProjects(item: TradeCompanyItem): TradeCompanyWithProjects {
  return { ...item, projects: [] };
}
