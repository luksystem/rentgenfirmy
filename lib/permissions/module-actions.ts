import { ALL_NAV_MODULE_KEYS, type NavModuleKey } from "@/lib/navigation/nav-modules";

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "manage_settings",
] as const;

export type PermissionActionKey = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_ACTION_LABELS: Record<PermissionActionKey, string> = {
  view: "Podgląd",
  create: "Tworzenie",
  edit: "Edycja",
  delete: "Usuwanie",
  export: "Eksport",
  manage_settings: "Ustawienia modułu",
};

const VIEW_ONLY: PermissionActionKey[] = ["view"];
const CRUD: PermissionActionKey[] = ["view", "create", "edit", "delete"];
const CRUD_EXPORT: PermissionActionKey[] = [...CRUD, "export"];
const VIEW_EDIT: PermissionActionKey[] = ["view", "edit"];
const VIEW_EXPORT: PermissionActionKey[] = ["view", "export"];

/** Akcje dostępne do konfiguracji w danym module menu. */
export const NAV_MODULE_SUPPORTED_ACTIONS: Record<NavModuleKey, PermissionActionKey[]> = {
  start: VIEW_ONLY,
  "my-work-tasks": CRUD,
  "my-work-dashboard": VIEW_ONLY,
  "my-work-time": CRUD_EXPORT,
  "my-work-availability": CRUD,
  "my-work-reviews": VIEW_EDIT,
  "my-work-xp": VIEW_ONLY,
  contacts: CRUD_EXPORT,
  "service-offers": CRUD_EXPORT,
  "sales-calculations": CRUD,
  invoices: CRUD_EXPORT,
  clients: CRUD,
  processes: CRUD,
  "resource-plan": CRUD,
  projects: CRUD,
  audit: CRUD_EXPORT,
  "work-orders": CRUD,
  documents: CRUD,
  "trades-catalog": CRUD,
  visualizations: CRUD,
  "smart-home-knowledge": CRUD,
  inspections: CRUD,
  "service-requests": CRUD,
  "knowledge-base": CRUD,
  "service-rates": ["view", "manage_settings"],
  "client-form": VIEW_ONLY,
  spaces: CRUD,
  "implementation-boards": CRUD,
  "goal-boards": CRUD,
  interruptions: CRUD,
  employees: VIEW_EDIT,
  reports: VIEW_EXPORT,
  "view-to-close": VIEW_ONLY,
  "view-no-contact": VIEW_ONLY,
  "view-waiting": VIEW_ONLY,
  settings: ["view", "manage_settings"],
  "change-password": VIEW_ONLY,
  "account-settings": VIEW_ONLY,
};

export function getSupportedActionsForModule(moduleKey: NavModuleKey): PermissionActionKey[] {
  return NAV_MODULE_SUPPORTED_ACTIONS[moduleKey] ?? VIEW_ONLY;
}

export function allModulesSupportActions(): NavModuleKey[] {
  return ALL_NAV_MODULE_KEYS.filter(
    (key) => getSupportedActionsForModule(key).length > 1 || getSupportedActionsForModule(key)[0] !== "view",
  );
}
