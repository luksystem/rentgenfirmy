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
    const ensureProjects = options?.projects;

    // Cache hit tylko gdy nie prosimy o ensure konkretnych projektów.
    if (state.hydrated && state.spaces.length && !force && !ensureProjects?.length) {
      return state.spaces;
    }

    if (hydratePromise && !force && !ensureProjects?.length) {
      return hydratePromise;
    }

    set({ isLoading: !state.spaces.length && !state.hydrated, error: null });

    let task!: Promise<DashboardSpace[]>;
    task = (async () => {
      try {
        let spaces: DashboardSpace[];

        if (ensureProjects?.length) {
          // Ensure wskazanych projektów i scal z cache (bez masowego ensure wszystkich na boot).
          const ensured = await ensureAllDashboardSpaces({
            projects: ensureProjects,
            profileId: options?.profileId,
            displayName: options?.displayName,
          });
          const byId = new Map(get().spaces.map((space) => [space.id, space]));
          for (const space of ensured) {
            byId.set(space.id, space);
          }
          spaces = [...byId.values()];
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
        if (hydratePromise === task) {
          hydratePromise = null;
        }
      }
    })();

    if (!ensureProjects?.length) {
      hydratePromise = task;
    }

    return task;
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
