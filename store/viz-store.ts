"use client";

import { create } from "zustand";
import type {
  VizDashboard,
  VizDashboardInput,
  VizDashboardTemplate,
  VizIntegratedSystem,
  VizVariableRole,
} from "@/lib/viz/types";

let hydratePromise: Promise<void> | null = null;

type VizStore = {
  dashboards: VizDashboard[];
  templates: VizDashboardTemplate[];
  systems: VizIntegratedSystem[];
  variableRoles: VizVariableRole[];
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: (options?: { force?: boolean }) => Promise<void>;
  invalidate: () => void;
  createDashboard: (input: VizDashboardInput) => Promise<VizDashboard>;
  updateDashboard: (id: string, input: Partial<VizDashboardInput>) => Promise<VizDashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  getDashboardById: (id: string) => VizDashboard | undefined;
};

async function fetchVizBootstrap() {
  const response = await fetch("/api/viz/dashboards");
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Nie udało się pobrać dashboardów.");
  }
  return response.json() as Promise<{
    dashboards: VizDashboard[];
    templates: VizDashboardTemplate[];
    systems: VizIntegratedSystem[];
    variableRoles: VizVariableRole[];
  }>;
}

export const useVizStore = create<VizStore>((set, get) => ({
  dashboards: [],
  templates: [],
  systems: [],
  variableRoles: [],
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async (options) => {
    if (!options?.force && get().hydrated) {
      return;
    }
    if (!options?.force && hydratePromise) {
      return hydratePromise;
    }

    set({ isLoading: !get().hydrated, error: null });

    hydratePromise = (async () => {
      try {
        const data = await fetchVizBootstrap();
        set({
          dashboards: data.dashboards,
          templates: data.templates,
          systems: data.systems,
          variableRoles: data.variableRoles,
          hydrated: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Błąd ładowania modułu Wizualizacje",
          isLoading: false,
        });
      } finally {
        hydratePromise = null;
      }
    })();

    return hydratePromise;
  },

  invalidate: () => {
    hydratePromise = null;
    set({ hydrated: false, dashboards: [], templates: [], systems: [], variableRoles: [] });
  },

  createDashboard: async (input) => {
    const response = await fetch("/api/viz/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się utworzyć dashboardu.");
    }
    const { dashboard } = (await response.json()) as { dashboard: VizDashboard };
    set((state) => ({ dashboards: [dashboard, ...state.dashboards] }));
    return dashboard;
  },

  updateDashboard: async (id, input) => {
    const response = await fetch(`/api/viz/dashboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się zaktualizować dashboardu.");
    }
    const { dashboard } = (await response.json()) as { dashboard: VizDashboard };
    set((state) => ({
      dashboards: state.dashboards.map((item) => (item.id === id ? dashboard : item)),
    }));
    return dashboard;
  },

  deleteDashboard: async (id) => {
    const response = await fetch(`/api/viz/dashboards/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się usunąć dashboardu.");
    }
    set((state) => ({
      dashboards: state.dashboards.filter((item) => item.id !== id),
    }));
  },

  getDashboardById: (id) => get().dashboards.find((item) => item.id === id),
}));
