import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

export type NavModuleKey =
  | "start"
  | "my-work-tasks"
  | "my-work-dashboard"
  | "my-work-time"
  | "my-work-availability"
  | "contacts"
  | "service-offers"
  | "sales-calculations"
  | "invoices"
  | "clients"
  | "processes"
  | "resource-plan"
  | "projects"
  | "audit"
  | "work-orders"
  | "documents"
  | "trades-catalog"
  | "inspections"
  | "service-requests"
  | "knowledge-base"
  | "service-rates"
  | "client-form"
  | "spaces"
  | "implementation-boards"
  | "goal-boards"
  | "interruptions"
  | "employees"
  | "reports"
  | "view-to-close"
  | "view-no-contact"
  | "view-waiting"
  | "settings"
  | "change-password";

export type NavModuleDefinition = {
  key: NavModuleKey;
  label: string;
  href: string;
  /** Ścieżki chronione middleware — najdłuższy prefix wygrywa. */
  routePrefixes: string[];
  external?: boolean;
  activeExcludePrefixes?: string[];
};

export type NavModuleGroupDefinition = {
  key: string;
  label: string;
  modules: NavModuleDefinition[];
};

export const NAV_MODULE_GROUPS: NavModuleGroupDefinition[] = [
  {
    key: "glowne",
    label: "Główne",
    modules: [
      {
        key: "start",
        label: "Start",
        href: "/",
        routePrefixes: ["/"],
      },
    ],
  },
  {
    key: "moja-praca",
    label: "Moja praca",
    modules: [
      {
        key: "my-work-tasks",
        label: "Zadania",
        href: "/moja-praca/zadania",
        routePrefixes: ["/moja-praca/zadania"],
      },
      {
        key: "my-work-dashboard",
        label: "Pulpit",
        href: "/moja-praca/pulpit",
        routePrefixes: ["/moja-praca/pulpit"],
      },
      {
        key: "my-work-time",
        label: "Czas pracy",
        href: "/moja-praca/czas-pracy",
        routePrefixes: ["/moja-praca/czas-pracy"],
      },
      {
        key: "my-work-availability",
        label: "Dostępność",
        href: "/moja-praca/dostepnosc",
        routePrefixes: ["/moja-praca/dostepnosc"],
      },
    ],
  },
  {
    key: "sprzedaz",
    label: "Sprzedaż",
    modules: [
      {
        key: "contacts",
        label: "Kontakty",
        href: "/kontakty",
        routePrefixes: ["/kontakty"],
      },
      {
        key: "service-offers",
        label: "Szybkie Oferty",
        href: COMMERCIAL_MODULES.serviceSettlement.href,
        routePrefixes: ["/oferty"],
        activeExcludePrefixes: ["/oferty/zgloszenia", "/oferty/ustawienia"],
      },
      {
        key: "sales-calculations",
        label: COMMERCIAL_MODULES.salesCalculations.label,
        href: COMMERCIAL_MODULES.salesCalculations.href,
        routePrefixes: ["/kalkulacje"],
      },
      {
        key: "invoices",
        label: "Faktury",
        href: "/faktury",
        routePrefixes: ["/faktury"],
      },
    ],
  },
  {
    key: "projekty",
    label: "Projekty",
    modules: [
      {
        key: "clients",
        label: "Klienci",
        href: "/klienci",
        routePrefixes: ["/klienci"],
      },
      {
        key: "processes",
        label: "Procesy",
        href: "/procesy",
        routePrefixes: ["/procesy"],
      },
      {
        key: "resource-plan",
        label: "Plan Zasobów",
        href: "/plan-zasobow",
        routePrefixes: ["/plan-zasobow"],
      },
      {
        key: "projects",
        label: "Projekty",
        href: "/projekty",
        routePrefixes: ["/projekty"],
      },
      {
        key: "audit",
        label: "SRI Audyt",
        href: "/audyt",
        routePrefixes: ["/audyt", "/sri"],
      },
      {
        key: "work-orders",
        label: "Zlecenia",
        href: "/zlecenia",
        routePrefixes: ["/zlecenia"],
      },
      {
        key: "documents",
        label: "Dokumenty",
        href: "/dokumenty",
        routePrefixes: ["/dokumenty"],
      },
      {
        key: "trades-catalog",
        label: "Katalog Branż",
        href: "/branze",
        routePrefixes: ["/branze"],
      },
    ],
  },
  {
    key: "serwisy",
    label: "Serwisy",
    modules: [
      {
        key: "inspections",
        label: "Przeglądy",
        href: "/przeglady",
        routePrefixes: ["/przeglady"],
      },
      {
        key: "service-requests",
        label: "Zgłoszenia",
        href: "/oferty/zgloszenia",
        routePrefixes: ["/oferty/zgloszenia"],
      },
      {
        key: "knowledge-base",
        label: "Baza wiedzy",
        href: "/baza-wiedzy",
        routePrefixes: ["/baza-wiedzy"],
      },
      {
        key: "service-rates",
        label: "Stawki serwisu",
        href: "/oferty/ustawienia",
        routePrefixes: ["/oferty/ustawienia"],
      },
      {
        key: "client-form",
        label: "Formularz klienta",
        href: "/zgloszenie",
        routePrefixes: ["/zgloszenie"],
        external: true,
      },
    ],
  },
  {
    key: "przestrzenie",
    label: "Przestrzenie",
    modules: [
      {
        key: "spaces",
        label: "Przestrzenie",
        href: "/przestrzenie",
        routePrefixes: ["/przestrzenie"],
      },
      {
        key: "implementation-boards",
        label: "Tablice wdrożeń",
        href: "/tablice-wdrozen",
        routePrefixes: ["/tablice-wdrozen"],
      },
      {
        key: "goal-boards",
        label: "Tablice celów",
        href: "/tablice-celow",
        routePrefixes: ["/tablice-celow"],
      },
      {
        key: "interruptions",
        label: "Przerwania",
        href: "/przerwania",
        routePrefixes: ["/przerwania"],
      },
      {
        key: "employees",
        label: "Pracownicy",
        href: "/pracownicy",
        routePrefixes: ["/pracownicy"],
      },
    ],
  },
  {
    key: "raporty",
    label: "Raporty",
    modules: [
      {
        key: "reports",
        label: "Raport",
        href: "/raport",
        routePrefixes: ["/raport"],
      },
    ],
  },
  {
    key: "widoki",
    label: "Widoki",
    modules: [
      {
        key: "view-to-close",
        label: "Do zamknięcia",
        href: "/do-zamkniecia",
        routePrefixes: ["/do-zamkniecia"],
      },
      {
        key: "view-no-contact",
        label: "Bez kontaktu",
        href: "/bez-kontaktu",
        routePrefixes: ["/bez-kontaktu"],
      },
      {
        key: "view-waiting",
        label: "Oczekujące",
        href: "/oczekujace",
        routePrefixes: ["/oczekujace"],
      },
    ],
  },
  {
    key: "ustawienia",
    label: "Ustawienia",
    modules: [
      {
        key: "settings",
        label: "Ustawienia",
        href: "/ustawienia",
        routePrefixes: ["/ustawienia"],
        activeExcludePrefixes: ["/ustawienia/uprawnienia"],
      },
      {
        key: "change-password",
        label: "Zmiana hasła",
        href: "/konto/haslo",
        routePrefixes: ["/konto/haslo"],
      },
    ],
  },
];

/** Moduł tylko dla administratora — nie konfigurowalny w macierzy. */
export const ADMIN_ONLY_NAV_MODULE: NavModuleDefinition = {
  key: "admin-users" as NavModuleKey,
  label: "Użytkownicy",
  href: "/admin/uzytkownicy",
  routePrefixes: ["/admin"],
};

export const ALL_NAV_MODULE_KEYS: NavModuleKey[] = NAV_MODULE_GROUPS.flatMap((group) =>
  group.modules.map((module) => module.key),
);

const navModuleByKey = new Map(
  NAV_MODULE_GROUPS.flatMap((group) => group.modules).map((module) => [module.key, module]),
);

export function getNavModuleDefinition(key: NavModuleKey): NavModuleDefinition | undefined {
  return navModuleByKey.get(key);
}

/** Dopasowanie ścieżki do modułu — najdłuższy pasujący prefix. */
export function resolveNavModuleForPath(pathname: string): NavModuleDefinition | null {
  let best: NavModuleDefinition | null = null;
  let bestLength = -1;

  const candidates = [
    ...NAV_MODULE_GROUPS.flatMap((group) => group.modules),
    ADMIN_ONLY_NAV_MODULE,
  ];

  for (const navModule of candidates) {
    for (const prefix of navModule.routePrefixes) {
      const matches =
        prefix === "/"
          ? pathname === "/"
          : pathname === prefix || pathname.startsWith(`${prefix}/`);

      if (matches && prefix.length > bestLength) {
        best = navModule;
        bestLength = prefix.length;
      }
    }
  }

  return best;
}
