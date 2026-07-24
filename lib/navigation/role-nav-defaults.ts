import { USER_ROLES, type UserRole } from "@/lib/auth/types";
import { ALL_NAV_MODULE_KEYS, type NavModuleKey } from "@/lib/navigation/nav-modules";
import {
  getSupportedActionsForModule,
  type PermissionActionKey,
} from "@/lib/permissions/module-actions";

/** Wszystkie role z enum user_role — każda ma wpis w managerze uprawnień. */
export const CONFIGURABLE_ROLES = USER_ROLES;

export type ConfigurableRole = UserRole;

const FULL_NAV_ACCESS: NavModuleKey[] = [...ALL_NAV_MODULE_KEYS];

const PODWYKONAWCA_NAV_ACCESS: NavModuleKey[] = [
  "start",
  "chat",
  "my-work-tasks",
  "my-work-dashboard",
  "my-work-time",
  "my-work-availability",
  "my-work-reviews",
  "my-work-xp",
  "projects",
  "work-orders",
  "documents",
  "smart-home-knowledge",
  "requisitions",
  "account-settings",
  "change-password",
];

/** Kadry i Płace — ludzie, czas, urlopy, faktury, raporty. */
const OFFICE_NAV_ACCESS: NavModuleKey[] = [
  "start",
  "chat",
  "my-work-tasks",
  "my-work-dashboard",
  "my-work-time",
  "my-work-availability",
  "my-work-reviews",
  "my-work-xp",
  "employees",
  "resource-plan",
  "invoices",
  "documents",
  "smart-home-knowledge",
  "requisitions",
  "reports",
  "budget-forecast",
  "settings",
  "account-settings",
  "change-password",
];

/** Domyślny dostęp do modułów menu per rola. */
/** Dane kosztowe/płacowe modułu Prognoza finansowa nie trafiają do instalatora mimo pełnego dostępu. */
const INSTALATOR_NAV_ACCESS: NavModuleKey[] = FULL_NAV_ACCESS.filter(
  (key) => key !== "budget-forecast",
);

export const DEFAULT_ROLE_NAV_ACCESS: Record<UserRole, NavModuleKey[]> = {
  administrator: FULL_NAV_ACCESS,
  manager: FULL_NAV_ACCESS,
  instalator: INSTALATOR_NAV_ACCESS,
  office: OFFICE_NAV_ACCESS,
  podwykonawca: PODWYKONAWCA_NAV_ACCESS,
  klient: ["chat", "visualizations", "smart-home-knowledge", "account-settings", "change-password"],
  gosc: ["chat"],
};

function allActionsForModules(modules: NavModuleKey[]): Partial<Record<NavModuleKey, PermissionActionKey[]>> {
  const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
  for (const moduleKey of modules) {
    actions[moduleKey] = [...getSupportedActionsForModule(moduleKey)];
  }
  return actions;
}

function viewOnlyForModules(modules: NavModuleKey[]): Partial<Record<NavModuleKey, PermissionActionKey[]>> {
  const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
  for (const moduleKey of modules) {
    const supported = getSupportedActionsForModule(moduleKey);
    actions[moduleKey] = supported.includes("view") ? ["view"] : [supported[0]];
  }
  return actions;
}

function instalatorActions(modules: NavModuleKey[]): Partial<Record<NavModuleKey, PermissionActionKey[]>> {
  const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
  const noDeleteModules: NavModuleKey[] = [
    "invoices",
    "clients",
    "processes",
    "settings",
    "service-rates",
    "employees",
  ];

  for (const moduleKey of modules) {
    const supported = getSupportedActionsForModule(moduleKey);
    if (noDeleteModules.includes(moduleKey)) {
      actions[moduleKey] = supported.filter((a) => a !== "delete");
    } else {
      actions[moduleKey] = [...supported];
    }
  }
  return actions;
}

function officeActions(modules: NavModuleKey[]): Partial<Record<NavModuleKey, PermissionActionKey[]>> {
  const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
  const fullEditModules: NavModuleKey[] = [
    "my-work-tasks",
    "my-work-time",
    "my-work-availability",
    "my-work-reviews",
    "employees",
    "invoices",
    "documents",
    "settings",
  ];

  for (const moduleKey of modules) {
    const supported = getSupportedActionsForModule(moduleKey);
    if (moduleKey === "budget-forecast") {
      // Office widzi i edytuje koszty/pipeline, ale saldo otwarcia i wagi (manage_settings)
      // oraz usuwanie zostają zastrzeżone dla administrator/manager.
      actions[moduleKey] = supported.filter((a) => a === "view" || a === "create" || a === "edit");
    } else if (fullEditModules.includes(moduleKey)) {
      actions[moduleKey] = supported.filter((a) => a !== "delete" || moduleKey === "documents");
    } else {
      actions[moduleKey] = supported.includes("view") ? ["view"] : [supported[0]];
    }
  }
  return actions;
}

function podwykonawcaActions(modules: NavModuleKey[]): Partial<Record<NavModuleKey, PermissionActionKey[]>> {
  const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
  const editModules: NavModuleKey[] = [
    "my-work-tasks",
    "my-work-time",
    "my-work-availability",
    "my-work-reviews",
    "work-orders",
    "documents",
  ];

  for (const moduleKey of modules) {
    const supported = getSupportedActionsForModule(moduleKey);
    if (editModules.includes(moduleKey)) {
      actions[moduleKey] = supported.filter((a) => a === "view" || a === "edit" || a === "create");
    } else {
      actions[moduleKey] = supported.includes("view") ? ["view"] : [supported[0]];
    }
  }
  return actions;
}

export type RolePermissionDefaults = {
  modules: NavModuleKey[];
  actions: Partial<Record<NavModuleKey, PermissionActionKey[]>>;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissionDefaults> = {
  administrator: {
    modules: DEFAULT_ROLE_NAV_ACCESS.administrator,
    actions: allActionsForModules(DEFAULT_ROLE_NAV_ACCESS.administrator),
  },
  manager: {
    modules: DEFAULT_ROLE_NAV_ACCESS.manager,
    actions: allActionsForModules(DEFAULT_ROLE_NAV_ACCESS.manager),
  },
  instalator: {
    modules: DEFAULT_ROLE_NAV_ACCESS.instalator,
    actions: instalatorActions(DEFAULT_ROLE_NAV_ACCESS.instalator),
  },
  office: {
    modules: DEFAULT_ROLE_NAV_ACCESS.office,
    actions: officeActions(DEFAULT_ROLE_NAV_ACCESS.office),
  },
  podwykonawca: {
    modules: DEFAULT_ROLE_NAV_ACCESS.podwykonawca,
    actions: podwykonawcaActions(DEFAULT_ROLE_NAV_ACCESS.podwykonawca),
  },
  klient: {
    modules: DEFAULT_ROLE_NAV_ACCESS.klient,
    actions: viewOnlyForModules(DEFAULT_ROLE_NAV_ACCESS.klient),
  },
  gosc: {
    modules: DEFAULT_ROLE_NAV_ACCESS.gosc,
    actions: viewOnlyForModules(DEFAULT_ROLE_NAV_ACCESS.gosc),
  },
};

export function getDefaultAllowedNavKeys(role: UserRole): NavModuleKey[] {
  return DEFAULT_ROLE_PERMISSIONS[role].modules;
}

export function getDefaultModuleActions(
  role: UserRole,
  moduleKey: NavModuleKey,
): PermissionActionKey[] {
  return DEFAULT_ROLE_PERMISSIONS[role].actions[moduleKey] ?? [];
}

/** @deprecated Użyj CONFIGURABLE_ROLES */
export const MANAGED_STAFF_ROLES = CONFIGURABLE_ROLES;
/** @deprecated Użyj ConfigurableRole */
export type ManagedStaffRole = ConfigurableRole;
