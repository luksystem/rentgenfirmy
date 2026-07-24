import { isAdministratorRole, type UserRole } from "@/lib/auth/types";
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/navigation/role-nav-defaults";
import { ALL_NAV_MODULE_KEYS, type NavModuleKey } from "@/lib/navigation/nav-modules";
import {
  getSupportedActionsForModule,
  type PermissionActionKey,
} from "@/lib/permissions/module-actions";

export const ROLE_NAV_PERMISSIONS_SETTINGS_ID = "role_nav_permissions";

export type RoleModulePermissions = {
  modules: NavModuleKey[];
  actions: Partial<Record<NavModuleKey, PermissionActionKey[]>>;
};

export type RoleNavPermissionsConfig = {
  version: 2;
  roles: Partial<Record<UserRole, RoleModulePermissions>>;
};

export const EMPTY_ROLE_NAV_PERMISSIONS_CONFIG: RoleNavPermissionsConfig = {
  version: 2,
  roles: {},
};

/** Moduły, których dostępu nie da się ograniczyć per rola — muszą działać dla każdego zalogowanego. */
export const ALWAYS_ALLOWED_NAV_MODULES: NavModuleKey[] = ["account-settings", "change-password"];

type LegacyV1Config = {
  version?: 1;
  roles?: Partial<Record<UserRole, NavModuleKey[]>>;
};

function normalizeModuleList(raw: unknown): NavModuleKey[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const allowedKeySet = new Set(ALL_NAV_MODULE_KEYS);
  const normalized = raw.filter(
    (key): key is NavModuleKey => typeof key === "string" && allowedKeySet.has(key as NavModuleKey),
  );
  return [...new Set(normalized)];
}

function normalizeActionList(raw: unknown, moduleKey: NavModuleKey): PermissionActionKey[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const supported = new Set(getSupportedActionsForModule(moduleKey));
  const normalized = raw.filter(
    (key): key is PermissionActionKey =>
      typeof key === "string" && supported.has(key as PermissionActionKey),
  );
  return [...new Set(normalized)];
}

function migrateV1ToV2(input: LegacyV1Config): RoleNavPermissionsConfig {
  const roles: Partial<Record<UserRole, RoleModulePermissions>> = {};

  for (const role of CONFIGURABLE_ROLES) {
    const modules = normalizeModuleList(input.roles?.[role]);
    if (!modules) {
      continue;
    }
    const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
    for (const moduleKey of modules) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[role].actions[moduleKey];
      actions[moduleKey] = defaults?.length
        ? defaults
        : getSupportedActionsForModule(moduleKey).includes("view")
          ? ["view"]
          : [getSupportedActionsForModule(moduleKey)[0]];
    }
    roles[role] = { modules, actions };
  }

  return { version: 2, roles };
}

function remapLegacyRoleKeys(
  roles: Partial<Record<string, unknown>> | undefined,
): Partial<Record<UserRole, unknown>> {
  if (!roles || typeof roles !== "object") {
    return {};
  }
  const next: Partial<Record<string, unknown>> = { ...roles };
  // Historyczna rola „pracownik” → „instalator”
  if (next.pracownik != null && next.instalator == null) {
    next.instalator = next.pracownik;
  }
  delete next.pracownik;
  return next as Partial<Record<UserRole, unknown>>;
}

export function normalizeRoleNavPermissionsConfig(raw: unknown): RoleNavPermissionsConfig {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_ROLE_NAV_PERMISSIONS_CONFIG };
  }

  const inputRaw = raw as LegacyV1Config & Partial<RoleNavPermissionsConfig>;
  const input = {
    ...inputRaw,
    roles: remapLegacyRoleKeys(inputRaw.roles as Partial<Record<string, unknown>> | undefined),
  } as LegacyV1Config & Partial<RoleNavPermissionsConfig>;

  if (input.version === 1 || (input.roles && !("version" in input))) {
    const firstValue = Object.values(input.roles ?? {})[0];
    if (Array.isArray(firstValue)) {
      return migrateV1ToV2(input);
    }
  }

  const roles: Partial<Record<UserRole, RoleModulePermissions>> = {};

  for (const role of CONFIGURABLE_ROLES) {
    const roleEntry = input.roles?.[role];
    if (!roleEntry) {
      continue;
    }

    if (Array.isArray(roleEntry)) {
      const modules = normalizeModuleList(roleEntry);
      if (!modules) {
        continue;
      }
      const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
      for (const moduleKey of modules) {
        const defaults = DEFAULT_ROLE_PERMISSIONS[role].actions[moduleKey];
        actions[moduleKey] = defaults?.length ? defaults : ["view"];
      }
      roles[role] = { modules, actions };
      continue;
    }

    const rolePermissions = roleEntry as RoleModulePermissions;
    const modules = normalizeModuleList(rolePermissions.modules);
    if (!modules) {
      continue;
    }

    const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};
    for (const moduleKey of modules) {
      const normalizedActions = normalizeActionList(rolePermissions.actions?.[moduleKey], moduleKey);
      if (normalizedActions) {
        actions[moduleKey] = normalizedActions;
      } else {
        const defaults = DEFAULT_ROLE_PERMISSIONS[role].actions[moduleKey];
        actions[moduleKey] = defaults?.length
          ? defaults
          : getSupportedActionsForModule(moduleKey).includes("view")
            ? ["view"]
            : [getSupportedActionsForModule(moduleKey)[0]];
      }
    }

    roles[role] = { modules, actions };
  }

  return { version: 2, roles };
}

export function resolveRolePermissions(
  role: UserRole,
  config: RoleNavPermissionsConfig = EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
): RoleModulePermissions {
  if (isAdministratorRole(role)) {
    return DEFAULT_ROLE_PERMISSIONS.administrator;
  }

  const override = config.roles[role];
  if (override) {
    return override;
  }

  return DEFAULT_ROLE_PERMISSIONS[role];
}

export function resolveAllowedNavKeys(
  role: UserRole,
  config: RoleNavPermissionsConfig = EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
): NavModuleKey[] {
  return resolveRolePermissions(role, config).modules;
}

export function resolveModuleActions(
  role: UserRole,
  moduleKey: NavModuleKey,
  config: RoleNavPermissionsConfig = EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
): PermissionActionKey[] {
  const permissions = resolveRolePermissions(role, config);
  if (!permissions.modules.includes(moduleKey)) {
    return [];
  }
  return permissions.actions[moduleKey] ?? getDefaultActionsForRoleModule(role, moduleKey);
}

function getDefaultActionsForRoleModule(role: UserRole, moduleKey: NavModuleKey): PermissionActionKey[] {
  return DEFAULT_ROLE_PERMISSIONS[role].actions[moduleKey] ?? [];
}

export function canAccessNavModule(
  role: UserRole,
  moduleKey: NavModuleKey,
  config: RoleNavPermissionsConfig = EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
): boolean {
  if (isAdministratorRole(role) || ALWAYS_ALLOWED_NAV_MODULES.includes(moduleKey)) {
    return true;
  }
  return resolveAllowedNavKeys(role, config).includes(moduleKey);
}

export function canPerformModuleAction(
  role: UserRole,
  moduleKey: NavModuleKey,
  action: PermissionActionKey,
  config: RoleNavPermissionsConfig = EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
): boolean {
  if (isAdministratorRole(role)) {
    return getSupportedActionsForModule(moduleKey).includes(action);
  }
  return resolveModuleActions(role, moduleKey, config).includes(action);
}

export function buildRoleNavMatrix(
  config: RoleNavPermissionsConfig,
): Record<UserRole, Record<NavModuleKey, boolean>> {
  const matrix = {} as Record<UserRole, Record<NavModuleKey, boolean>>;

  for (const role of CONFIGURABLE_ROLES) {
    const allowed = new Set(resolveAllowedNavKeys(role, config));
    matrix[role] = Object.fromEntries(
      ALL_NAV_MODULE_KEYS.map((key) => [key, allowed.has(key)]),
    ) as Record<NavModuleKey, boolean>;
  }

  return matrix;
}

export function buildRoleActionMatrix(
  config: RoleNavPermissionsConfig,
): Record<UserRole, Record<NavModuleKey, Record<PermissionActionKey, boolean>>> {
  const matrix = {} as Record<UserRole, Record<NavModuleKey, Record<PermissionActionKey, boolean>>>;

  for (const role of CONFIGURABLE_ROLES) {
    matrix[role] = {} as Record<NavModuleKey, Record<PermissionActionKey, boolean>>;
    for (const moduleKey of ALL_NAV_MODULE_KEYS) {
      const supported = getSupportedActionsForModule(moduleKey);
      const allowed = new Set(resolveModuleActions(role, moduleKey, config));
      matrix[role][moduleKey] = Object.fromEntries(
        supported.map((action) => [action, allowed.has(action)]),
      ) as Record<PermissionActionKey, boolean>;
    }
  }

  return matrix;
}

export function matrixToConfig(
  navMatrix: Record<UserRole, Record<NavModuleKey, boolean>>,
  actionMatrix: Record<UserRole, Record<NavModuleKey, Record<PermissionActionKey, boolean>>>,
): RoleNavPermissionsConfig {
  const roles: Partial<Record<UserRole, RoleModulePermissions>> = {};

  for (const role of CONFIGURABLE_ROLES) {
    const modules = ALL_NAV_MODULE_KEYS.filter((key) => navMatrix[role][key]);
    const actions: Partial<Record<NavModuleKey, PermissionActionKey[]>> = {};

    for (const moduleKey of modules) {
      const supported = getSupportedActionsForModule(moduleKey);
      const enabled = supported.filter((action) => actionMatrix[role][moduleKey][action]);
      if (enabled.length > 0) {
        actions[moduleKey] = enabled;
      }
    }

    roles[role] = { modules, actions };
  }

  return { version: 2, roles };
}

export function configToMatrices(config: RoleNavPermissionsConfig): {
  nav: Record<UserRole, Record<NavModuleKey, boolean>>;
  actions: Record<UserRole, Record<NavModuleKey, Record<PermissionActionKey, boolean>>>;
} {
  return {
    nav: buildRoleNavMatrix(config),
    actions: buildRoleActionMatrix(config),
  };
}

export function configDiffersFromDefaults(config: RoleNavPermissionsConfig): boolean {
  for (const role of CONFIGURABLE_ROLES) {
    const current = resolveRolePermissions(role, config);
    const defaults = DEFAULT_ROLE_PERMISSIONS[role];

    const currentModules = new Set(current.modules.slice().sort());
    const defaultModules = new Set(defaults.modules.slice().sort());
    if (currentModules.size !== defaultModules.size) {
      return true;
    }
    for (const key of currentModules) {
      if (!defaultModules.has(key)) {
        return true;
      }
    }

    for (const moduleKey of current.modules) {
      const currentActions = new Set((current.actions[moduleKey] ?? []).slice().sort());
      const defaultActions = new Set((defaults.actions[moduleKey] ?? []).slice().sort());
      if (currentActions.size !== defaultActions.size) {
        return true;
      }
      for (const action of currentActions) {
        if (!defaultActions.has(action)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function applyModuleAccessChange(
  config: RoleNavPermissionsConfig,
  role: UserRole,
  moduleKey: NavModuleKey,
  allowed: boolean,
): RoleNavPermissionsConfig {
  const { nav, actions } = configToMatrices(config);
  nav[role][moduleKey] = allowed;

  if (allowed) {
    const supported = getSupportedActionsForModule(moduleKey);
    const defaults = DEFAULT_ROLE_PERMISSIONS[role].actions[moduleKey] ?? ["view"];
    for (const action of supported) {
      actions[role][moduleKey][action] = defaults.includes(action);
    }
    if (!supported.some((a) => actions[role][moduleKey][a])) {
      if (supported.includes("view")) {
        actions[role][moduleKey].view = true;
      }
    }
  } else {
    for (const action of getSupportedActionsForModule(moduleKey)) {
      actions[role][moduleKey][action] = false;
    }
  }

  return matrixToConfig(nav, actions);
}

export function applyModuleActionChange(
  config: RoleNavPermissionsConfig,
  role: UserRole,
  moduleKey: NavModuleKey,
  action: PermissionActionKey,
  allowed: boolean,
): RoleNavPermissionsConfig {
  const { nav, actions } = configToMatrices(config);
  actions[role][moduleKey][action] = allowed;

  if (allowed && action !== "view" && getSupportedActionsForModule(moduleKey).includes("view")) {
    actions[role][moduleKey].view = true;
    nav[role][moduleKey] = true;
  }

  if (allowed) {
    nav[role][moduleKey] = true;
  } else if (action === "view") {
    const hasAny = getSupportedActionsForModule(moduleKey).some((a) => actions[role][moduleKey][a]);
    if (!hasAny) {
      nav[role][moduleKey] = false;
    }
  } else {
    const hasView = actions[role][moduleKey].view;
    const hasOther = getSupportedActionsForModule(moduleKey).some(
      (a) => a !== "view" && actions[role][moduleKey][a],
    );
    if (!hasView && !hasOther) {
      nav[role][moduleKey] = false;
    }
  }

  return matrixToConfig(nav, actions);
}

export function applyGroupAccessChange(
  config: RoleNavPermissionsConfig,
  role: UserRole,
  moduleKeys: NavModuleKey[],
  allowed: boolean,
): RoleNavPermissionsConfig {
  let next = config;
  for (const moduleKey of moduleKeys) {
    next = applyModuleAccessChange(next, role, moduleKey, allowed);
  }
  return next;
}
