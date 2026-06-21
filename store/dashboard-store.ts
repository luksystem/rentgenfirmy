"use client";

import { create } from "zustand";
import type { DashboardSpace } from "@/lib/dashboard/types";
import {
  ensureAllDashboardSpaces,
  fetchDashboardSpaces,
  setDashboardPublicEnabled,
} from "@/lib/supabase/dashboard-repository";

let hydratePromise: Promise<DashboardSpace[]> | null = null;

type DashboardStore = {
  spaces: DashboardSpace[];
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: (options?: {
    force?: boolean;
    projects?: Array<{ id: string; name: string; clientId?: string | null }>;
    profileId?: string | null;
    displayName?: string;
  }) => Promise<DashboardSpace[]>;
  getSpaceByProject: (projectId: string, kind: "client" | "team") => DashboardSpace | null;
  getGlobalSpace: (kind: "owner" | "manager" | "office" | "installer") => DashboardSpace | null;
  getEmployeeSpace: (profileId: string) => DashboardSpace | null;
  togglePublicLink: (spaceId: string, enabled: boolean) => Promise<DashboardSpace>;
  invalidate: () => void;
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  spaces: [],
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async (options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.hydrated && state.spaces.length && !force && !options?.projects) {
      return state.spaces;
    }

    if (hydratePromise && !force) {
      return hydratePromise;
    }

    set({ isLoading: !state.spaces.length, error: null });

    hydratePromise = (async () => {
      try {
        let spaces: DashboardSpace[];

        if (options?.projects?.length) {
          spaces = await ensureAllDashboardSpaces({
            projects: options.projects,
            profileId: options.profileId,
            displayName: options.displayName,
          });
        } else if (state.spaces.length && !force) {
          spaces = state.spaces;
        } else {
          spaces = await fetchDashboardSpaces();
        }

        set({
          spaces,
          hydrated: true,
          isLoading: false,
          error: null,
        });
        return spaces;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Błąd ładowania przestrzeni",
          isLoading: false,
        });
        throw error;
      } finally {
        hydratePromise = null;
      }
    })();

    return hydratePromise;
  },

  getSpaceByProject: (projectId, kind) => {
    return (
      get().spaces.find((space) => space.projectId === projectId && space.kind === kind) ?? null
    );
  },

  getGlobalSpace: (kind) => {
    return get().spaces.find((space) => space.kind === kind && !space.projectId) ?? null;
  },

  getEmployeeSpace: (profileId) => {
    return (
      get().spaces.find((space) => space.kind === "employee" && space.profileId === profileId) ??
      null
    );
  },

  togglePublicLink: async (spaceId, enabled) => {
    const updated = await setDashboardPublicEnabled(spaceId, enabled);
    set({
      spaces: get().spaces.map((space) => (space.id === updated.id ? updated : space)),
    });
    return updated;
  },

  invalidate: () => {
    hydratePromise = null;
    set({
      spaces: [],
      hydrated: false,
      isLoading: false,
      error: null,
    });
  },
}));

export function getClientProjectSpaces(
  spaces: DashboardSpace[],
  clientId: string,
  projectIds: string[],
) {
  const projectIdSet = new Set(projectIds);
  return spaces.filter(
    (space) =>
      space.kind === "client" &&
      space.projectId &&
      projectIdSet.has(space.projectId) &&
      (space.clientId === clientId || !space.clientId),
  );
}
