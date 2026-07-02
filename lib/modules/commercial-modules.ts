import { Calculator, FileText, type LucideIcon } from "lucide-react";

export const COMMERCIAL_MODULES = {
  serviceSettlement: {
    id: "service-settlement",
    label: "Rozliczenia serwisu",
    shortLabel: "Szybkie Oferty",
    eyebrow: "Szybkie rozliczanie",
    description:
      "Wycena przed wyjazdem, koszty po realizacji, link dla klienta i raport do rozliczenia.",
    href: "/oferty",
    routesPrefix: "/oferty",
    available: true,
    icon: FileText,
  },
  salesCalculations: {
    id: "sales-calculations",
    label: "Kalkulacje sprzedażowe",
    shortLabel: "Kalkulacje",
    eyebrow: "Wyceny Smart Home",
    description:
      "Interaktywne kalkulacje sprzedażowe dla klientów Smart Home — moduł w przygotowaniu.",
    href: "/kalkulacje",
    routesPrefix: "/kalkulacje",
    available: false,
    icon: Calculator,
  },
} as const satisfies Record<
  string,
  {
    id: string;
    label: string;
    shortLabel: string;
    eyebrow: string;
    description: string;
    href: string;
    routesPrefix: string;
    available: boolean;
    icon: LucideIcon;
  }
>;

export type CommercialModule = (typeof COMMERCIAL_MODULES)[keyof typeof COMMERCIAL_MODULES];

export const COMMERCIAL_MODULE_LIST: CommercialModule[] = [
  COMMERCIAL_MODULES.serviceSettlement,
  COMMERCIAL_MODULES.salesCalculations,
];

export function getCommercialModuleByPath(pathname: string) {
  return COMMERCIAL_MODULE_LIST.find(
    (module) =>
      pathname === module.routesPrefix || pathname.startsWith(`${module.routesPrefix}/`),
  );
}
