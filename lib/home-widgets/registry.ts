import type { UserRole } from "@/lib/auth/types";
import type { NavModuleKey } from "@/lib/navigation/nav-modules";
import { canAccessNavModule, type RoleNavPermissionsConfig } from "@/lib/navigation/role-nav-permissions";

export type HomeWidgetCategory = "ogolne" | "finanse" | "projekty" | "moja-praca";

export const HOME_WIDGET_CATEGORY_LABELS: Record<HomeWidgetCategory, string> = {
  ogolne: "Ogólne",
  finanse: "Finanse",
  projekty: "Projekty",
  "moja-praca": "Moja praca",
};

export type HomeWidgetDefinition = {
  id: string;
  label: string;
  description: string;
  category: HomeWidgetCategory;
  /** Rola musi mieć dostęp do tego modułu nawigacji, żeby móc wybrać ten widżet. */
  requiredModule?: NavModuleKey;
  /** Dodatkowe ograniczenie: widżet dostępny tylko dla wskazanych ról (np. dane finansowe). */
  allowedRoles?: UserRole[];
};

export const HOME_WIDGETS: HomeWidgetDefinition[] = [
  {
    id: "quick-status",
    label: "Szybki status",
    description: "Wdrożenia po terminie i ustalenia czekające na akceptację.",
    category: "ogolne",
    requiredModule: "implementation-boards",
  },
  {
    id: "budget",
    label: "Budżet firmy",
    description: "Przychód, zaległe należności, faktury do wystawienia, prognoza płynności.",
    category: "finanse",
    allowedRoles: ["administrator"],
  },
  {
    id: "sales",
    label: "Sprzedaż i cashflow",
    description: "Oferty oczekujące na klienta, rozliczenia, zapotrzebowania.",
    category: "finanse",
    allowedRoles: ["administrator"],
  },
  {
    id: "project-metrics",
    label: "Liczniki projektów",
    description: "Aktywne, oczekujące i krytyczne projekty.",
    category: "projekty",
    requiredModule: "projects",
  },
  {
    id: "critical-projects",
    label: "Co wymaga uwagi",
    description: "Lista projektów o priorytecie krytycznym.",
    category: "projekty",
    requiredModule: "projects",
  },
  {
    id: "deployment",
    label: "Wdrożenia",
    description: "Tablice kanban i kamienie milowe procesów — cała firma.",
    category: "projekty",
    allowedRoles: ["administrator", "manager"],
  },
  {
    id: "team",
    label: "Zespół i czas",
    description: "Zadania, plan pracy, urlopy, nadgodziny — cała firma.",
    category: "projekty",
    allowedRoles: ["administrator", "manager"],
  },
  {
    id: "my-tasks",
    label: "Moje zadania",
    description: "Twoje otwarte i przeterminowane zadania.",
    category: "moja-praca",
    requiredModule: "my-work-tasks",
  },
  {
    id: "my-kanban",
    label: "Moje zadania na tablicach",
    description: "Zadania kanban przypisane do Ciebie na tablicach wdrożeń.",
    category: "moja-praca",
    requiredModule: "implementation-boards",
  },
  {
    id: "my-time",
    label: "Mój czas pracy",
    description: "Bilans godzin w bieżącym tygodniu.",
    category: "moja-praca",
    requiredModule: "my-work-time",
  },
  {
    id: "my-availability",
    label: "Moja dostępność",
    description: "Wnioski urlopowe oczekujące i najbliższy zaakceptowany urlop.",
    category: "moja-praca",
    requiredModule: "my-work-availability",
  },
  {
    id: "my-xp",
    label: "Punkty XP",
    description: "Twój poziom i postęp XP.",
    category: "moja-praca",
    requiredModule: "my-work-xp",
  },
  {
    id: "my-review",
    label: "Ocena miesięczna",
    description: "Status bieżącej samooceny i oceny przełożonego.",
    category: "moja-praca",
    requiredModule: "my-work-reviews",
  },
];

const HOME_WIDGETS_BY_ID = new Map(HOME_WIDGETS.map((widget) => [widget.id, widget]));

export function getHomeWidgetDefinition(id: string): HomeWidgetDefinition | undefined {
  return HOME_WIDGETS_BY_ID.get(id);
}

export function isHomeWidgetAllowed(
  widget: HomeWidgetDefinition,
  role: UserRole,
  navConfig: RoleNavPermissionsConfig,
): boolean {
  if (widget.allowedRoles && !widget.allowedRoles.includes(role)) {
    return false;
  }
  if (widget.requiredModule && !canAccessNavModule(role, widget.requiredModule, navConfig)) {
    return false;
  }
  return true;
}

export function getAllowedHomeWidgets(
  role: UserRole,
  navConfig: RoleNavPermissionsConfig,
): HomeWidgetDefinition[] {
  return HOME_WIDGETS.filter((widget) => isHomeWidgetAllowed(widget, role, navConfig));
}

/** Domyślny zestaw widżetów wg roli, gdy user nie zapisał jeszcze własnego wyboru. */
export const HOME_WIDGET_ROLE_DEFAULTS: Partial<Record<UserRole, string[]>> = {
  administrator: ["quick-status", "budget", "sales"],
  manager: ["quick-status", "project-metrics", "critical-projects", "deployment", "team"],
  instalator: ["my-tasks", "my-kanban", "my-time"],
};

/** Filtruje zapisany/domyślny wybór do tego, na co rola faktycznie ma dziś uprawnienia. */
export function resolveHomeWidgetIds(
  role: UserRole,
  saved: string[] | null | undefined,
  navConfig: RoleNavPermissionsConfig,
): string[] {
  const allowedIds = new Set(getAllowedHomeWidgets(role, navConfig).map((widget) => widget.id));
  const base = saved ?? HOME_WIDGET_ROLE_DEFAULTS[role] ?? [];
  return base.filter((id) => allowedIds.has(id));
}
