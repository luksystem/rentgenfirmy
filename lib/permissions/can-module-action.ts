import type { UserRole } from "@/lib/auth/types";
import { isAdministratorRole } from "@/lib/auth/types";
import type { NavModuleKey } from "@/lib/navigation/nav-modules";
import {
  canPerformModuleAction,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";
import type { PermissionActionKey } from "@/lib/permissions/module-actions";

/** Sprawdza uprawnienie akcji w module — do użycia w komponentach i API. */
export function canModuleAction(
  role: UserRole | null | undefined,
  moduleKey: NavModuleKey,
  action: PermissionActionKey,
  config?: RoleNavPermissionsConfig,
): boolean {
  if (!role) {
    return false;
  }
  return canPerformModuleAction(role, moduleKey, action, config);
}

export function canViewModule(
  role: UserRole | null | undefined,
  moduleKey: NavModuleKey,
  config?: RoleNavPermissionsConfig,
): boolean {
  return canModuleAction(role, moduleKey, "view", config);
}

export function canCreateInModule(
  role: UserRole | null | undefined,
  moduleKey: NavModuleKey,
  config?: RoleNavPermissionsConfig,
): boolean {
  return canModuleAction(role, moduleKey, "create", config);
}

export function canEditInModule(
  role: UserRole | null | undefined,
  moduleKey: NavModuleKey,
  config?: RoleNavPermissionsConfig,
): boolean {
  return canModuleAction(role, moduleKey, "edit", config);
}

export function canDeleteInModule(
  role: UserRole | null | undefined,
  moduleKey: NavModuleKey,
  config?: RoleNavPermissionsConfig,
): boolean {
  return canModuleAction(role, moduleKey, "delete", config);
}

export function isStaffRole(role: UserRole): boolean {
  return role !== "klient" && role !== "gosc";
}

export function bypassesNavConfig(role: UserRole): boolean {
  return isAdministratorRole(role);
}
