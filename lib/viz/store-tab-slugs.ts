export const STORE_TABS = [
  "Podsumowanie",
  "Serwis",
  "Przeglądy",
  "Umowa serwisowa",
  "Kontakty",
  "Zmienne",
  "Wykresy",
  "Alarmy",
  "Energia",
  "Potencjał rozbudowy",
  "Historia sterowania",
] as const;

export type StoreTab = (typeof STORE_TABS)[number];

export const STORE_TAB_SLUGS: Record<StoreTab, string> = {
  Podsumowanie: "podsumowanie",
  Serwis: "serwis",
  Przeglądy: "przeglady",
  "Umowa serwisowa": "umowa",
  Kontakty: "kontakty",
  Zmienne: "zmienne",
  Wykresy: "wykresy",
  Alarmy: "alarmy",
  Energia: "energia",
  "Potencjał rozbudowy": "potencjal",
  "Historia sterowania": "historia",
};

const SLUG_TO_TAB = Object.fromEntries(
  Object.entries(STORE_TAB_SLUGS).map(([tab, slug]) => [slug, tab]),
) as Record<string, StoreTab>;

export function storeTabFromSlug(slug: string | null | undefined): StoreTab {
  if (slug && SLUG_TO_TAB[slug]) {
    return SLUG_TO_TAB[slug];
  }
  return "Podsumowanie";
}

export function storeTabHref(
  dashboardId: string,
  projectId: string,
  tab: StoreTab,
) {
  const slug = STORE_TAB_SLUGS[tab];
  return `/wizualizacje/${dashboardId}/sklep/${projectId}?tab=${slug}`;
}

export const STORE_QUICK_LINK_TABS: StoreTab[] = ["Zmienne", "Wykresy", "Energia", "Alarmy"];
