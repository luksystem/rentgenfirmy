"use client";

import { useMemo } from "react";
import type { UserRole } from "@/lib/auth/types";
import type { NavModuleKey } from "@/lib/navigation/nav-modules";
import { canPerformModuleAction } from "@/lib/navigation/role-nav-permissions";
import type { PermissionActionKey } from "@/lib/permissions/module-actions";
import { useAuthStore } from "@/store/auth-store";
import { useRoleNavPermissionsStore } from "@/store/role-nav-permissions-store";

export function useCanModuleAction(moduleKey: NavModuleKey, action: PermissionActionKey): boolean {
  const role = useAuthStore((state) => state.profile?.role);
  const config = useRoleNavPermissionsStore((state) => state.config);
  const hydrated = useRoleNavPermissionsStore((state) => state.hydrated);

  return useMemo(() => {
    if (!role) {
      return false;
    }
    if (!hydrated) {
      return canPerformModuleAction(role, moduleKey, action);
    }
    return canPerformModuleAction(role, moduleKey, action, config);
  }, [role, moduleKey, action, config, hydrated]);
}

export function useModulePermissions(moduleKey: NavModuleKey) {
  const role = useAuthStore((state) => state.profile?.role) as UserRole | undefined;
  const config = useRoleNavPermissionsStore((state) => state.config);
  const hydrated = useRoleNavPermissionsStore((state) => state.hydrated);

  return useMemo(() => {
    const check = (action: PermissionActionKey) => {
      if (!role) return false;
      return canPerformModuleAction(role, moduleKey, action, hydrated ? config : undefined);
    };

    return {
      canView: check("view"),
      canCreate: check("create"),
      canEdit: check("edit"),
      canDelete: check("delete"),
      canExport: check("export"),
      canManageSettings: check("manage_settings"),
    };
  }, [role, moduleKey, config, hydrated]);
}
