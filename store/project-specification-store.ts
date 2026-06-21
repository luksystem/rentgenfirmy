"use client";

import { create } from "zustand";
import type {
  ProjectSpecificationInput,
  ProjectSpecificationItem,
  SpecificationCatalogItem,
} from "@/lib/dashboard/specification-types";
import {
  addProjectSpecificationItem,
  deleteProjectSpecificationItem,
  fetchProjectSpecificationItems,
  fetchSpecificationCatalog,
  updateProjectSpecificationItem,
} from "@/lib/supabase/project-specification-repository";

const loadPromises = new Map<string, Promise<ProjectSpecificationItem[]>>();

type ProjectSpecificationStore = {
  catalog: SpecificationCatalogItem[];
  catalogLoaded: boolean;
  byProject: Record<string, ProjectSpecificationItem[]>;
  loadingProjects: Record<string, boolean>;
  ensureCatalog: () => Promise<SpecificationCatalogItem[]>;
  ensureItems: (projectId: string, options?: { force?: boolean }) => Promise<ProjectSpecificationItem[]>;
  addItem: (projectId: string, input: ProjectSpecificationInput) => Promise<void>;
  updateItem: (projectId: string, itemId: string, input: ProjectSpecificationInput) => Promise<void>;
  removeItem: (projectId: string, itemId: string) => Promise<void>;
};

export const useProjectSpecificationStore = create<ProjectSpecificationStore>((set, get) => ({
  catalog: [],
  catalogLoaded: false,
  byProject: {},
  loadingProjects: {},

  ensureCatalog: async () => {
    if (get().catalogLoaded) {
      return get().catalog;
    }
    const catalog = await fetchSpecificationCatalog();
    set({ catalog, catalogLoaded: true });
    return catalog;
  },

  ensureItems: async (projectId, options) => {
    const force = options?.force ?? false;
    const cached = get().byProject[projectId];
    if (cached && !force) {
      return cached;
    }

    const inFlight = loadPromises.get(projectId);
    if (inFlight && !force) {
      return inFlight;
    }

    set({
      loadingProjects: { ...get().loadingProjects, [projectId]: !cached?.length },
    });

    const promise = fetchProjectSpecificationItems(projectId)
      .then((items) => {
        set({
          byProject: { ...get().byProject, [projectId]: items },
          loadingProjects: { ...get().loadingProjects, [projectId]: false },
        });
        return items;
      })
      .finally(() => {
        loadPromises.delete(projectId);
      });

    loadPromises.set(projectId, promise);
    return promise;
  },

  addItem: async (projectId, input) => {
    const created = await addProjectSpecificationItem(projectId, input);
    const list = [...(get().byProject[projectId] ?? []), created];
    set({ byProject: { ...get().byProject, [projectId]: list } });
  },

  updateItem: async (projectId, itemId, input) => {
    const updated = await updateProjectSpecificationItem(itemId, input);
    const list = (get().byProject[projectId] ?? []).map((entry) =>
      entry.id === itemId ? updated : entry,
    );
    set({ byProject: { ...get().byProject, [projectId]: list } });
  },

  removeItem: async (projectId, itemId) => {
    await deleteProjectSpecificationItem(itemId);
    const list = (get().byProject[projectId] ?? []).filter((entry) => entry.id !== itemId);
    set({ byProject: { ...get().byProject, [projectId]: list } });
  },
}));
