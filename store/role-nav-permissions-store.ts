"use client";

import { create } from "zustand";
import type { UserRole } from "@/lib/auth/types";
import {
  applyGroupAccessChange,
  applyModuleAccessChange,
  applyModuleActionChange,
  EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";
import { CONFIGURABLE_ROLES } from "@/lib/navigation/role-nav-defaults";
import type { NavModuleKey } from "@/lib/navigation/nav-modules";
import type { PermissionActionKey } from "@/lib/permissions/module-actions";
import {
  fetchRoleNavPermissionsConfig,
  saveRoleNavPermissionsConfig,
} from "@/lib/supabase/role-nav-permissions-repository";

type RoleNavPermissionsState = {
  config: RoleNavPermissionsConfig;
  hydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hydrate: (options?: { force?: boolean }) => Promise<RoleNavPermissionsConfig>;
  saveConfig: (config: RoleNavPermissionsConfig) => Promise<RoleNavPermissionsConfig>;
  setModuleAccess: (role: UserRole, moduleKey: NavModuleKey, allowed: boolean) => void;
  setGroupAccess: (role: UserRole, moduleKeys: NavModuleKey[], allowed: boolean) => void;
  setModuleActionAccess: (
    role: UserRole,
    moduleKey: NavModuleKey,
    action: PermissionActionKey,
    allowed: boolean,
  ) => void;
  resetToDefaults: () => void;
  invalidate: () => void;
};

let hydratePromise: Promise<RoleNavPermissionsConfig> | null = null;

export const useRoleNavPermissionsStore = create<RoleNavPermissionsState>((set, get) => ({
  config: { ...EMPTY_ROLE_NAV_PERMISSIONS_CONFIG },
  hydrated: false,
  isLoading: false,
  isSaving: false,
  error: null,

  hydrate: async (options) => {
    const { hydrated, config } = get();
    if (hydrated && !options?.force) {
      return config;
    }

    if (hydratePromise && !options?.force) {
      return hydratePromise;
    }

    set({ isLoading: !hydrated, error: null });

    hydratePromise = fetchRoleNavPermissionsConfig()
      .then((loaded) => {
        set({
          config: loaded,
          hydrated: true,
          isLoading: false,
          error: null,
        });
        return loaded;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Nie udało się wczytać uprawnień.";
        set({ isLoading: false, error: message });
        throw error;
      })
      .finally(() => {
        hydratePromise = null;
      });

    return hydratePromise;
  },

  saveConfig: async (nextConfig) => {
    set({ isSaving: true, error: null });
    try {
      const saved = await saveRoleNavPermissionsConfig(nextConfig);
      set({ config: saved, isSaving: false, hydrated: true });
      return saved;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Nie udało się zapisać uprawnień.";
      set({ isSaving: false, error: message });
      throw error;
    }
  },

  setModuleAccess: (role, moduleKey, allowed) => {
    set({ config: applyModuleAccessChange(get().config, role, moduleKey, allowed) });
  },

  setGroupAccess: (role, moduleKeys, allowed) => {
    set({ config: applyGroupAccessChange(get().config, role, moduleKeys, allowed) });
  },

  setModuleActionAccess: (role, moduleKey, action, allowed) => {
    set({ config: applyModuleActionChange(get().config, role, moduleKey, action, allowed) });
  },

  resetToDefaults: () => {
    set({ config: { version: 2, roles: {} } });
  },

  invalidate: () => {
    hydratePromise = null;
    set({
      config: { ...EMPTY_ROLE_NAV_PERMISSIONS_CONFIG },
      hydrated: false,
      isLoading: false,
      isSaving: false,
      error: null,
    });
  },
}));

export function useRoleNavPermissionsHydrated() {
  return useRoleNavPermissionsStore((state) => state.hydrated);
}

export { CONFIGURABLE_ROLES };
