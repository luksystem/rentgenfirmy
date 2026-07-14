"use client";

import { create } from "zustand";
import type { VizDashboardChart } from "@/lib/viz/chart-types";
import type { VizDashboardLiveResponse } from "@/lib/viz/live-types";
import type { VizDashboardPermissions } from "@/lib/viz/types";

const LIVE_POLL_MS = 60_000;

type DashboardSession = {
  permissions: VizDashboardPermissions;
  canManage: boolean;
  accessRole?: string;
};

type VizDashboardCacheStore = {
  liveByDashboard: Record<string, VizDashboardLiveResponse>;
  sessionByDashboard: Record<string, DashboardSession>;
  widgetChartsByDashboard: Record<string, VizDashboardChart[]>;
  liveLoadingByDashboard: Record<string, boolean>;
  liveInflight: Record<string, Promise<VizDashboardLiveResponse | null>>;
  sessionInflight: Record<string, Promise<DashboardSession | null>>;
  chartsInflight: Record<string, Promise<VizDashboardChart[]>>;
  getLive: (dashboardId: string) => VizDashboardLiveResponse | null;
  getSession: (dashboardId: string) => DashboardSession | null;
  getWidgetCharts: (dashboardId: string) => VizDashboardChart[];
  isLiveLoading: (dashboardId: string) => boolean;
  ensureLive: (
    dashboardId: string,
    options?: { force?: boolean; showLoading?: boolean },
  ) => Promise<VizDashboardLiveResponse | null>;
  ensureSession: (
    dashboardId: string,
    options?: { force?: boolean },
  ) => Promise<DashboardSession | null>;
  ensureWidgetCharts: (
    dashboardId: string,
    options?: { force?: boolean },
  ) => Promise<VizDashboardChart[]>;
  invalidateLive: (dashboardId: string) => void;
  invalidateDashboard: (dashboardId: string) => void;
};

async function fetchLive(dashboardId: string, refresh = false) {
  const response = await fetch(`/api/viz/dashboards/${dashboardId}/live`, {
    method: refresh ? "POST" : "GET",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Nie udało się pobrać danych dashboardu.");
  }
  return response.json() as Promise<VizDashboardLiveResponse>;
}

async function fetchSession(dashboardId: string) {
  const response = await fetch(`/api/viz/dashboards/${dashboardId}/session`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Brak dostępu do dashboardu.");
  }
  return response.json() as Promise<DashboardSession>;
}

async function fetchWidgetCharts(dashboardId: string) {
  const response = await fetch(`/api/viz/dashboards/${dashboardId}/charts`);
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { charts?: VizDashboardChart[] };
  return (data.charts ?? []).filter((chart) => chart.isWidget);
}

export const useVizDashboardCacheStore = create<VizDashboardCacheStore>((set, get) => ({
  liveByDashboard: {},
  sessionByDashboard: {},
  widgetChartsByDashboard: {},
  liveLoadingByDashboard: {},
  liveInflight: {},
  sessionInflight: {},
  chartsInflight: {},

  getLive: (dashboardId) => get().liveByDashboard[dashboardId] ?? null,
  getSession: (dashboardId) => get().sessionByDashboard[dashboardId] ?? null,
  getWidgetCharts: (dashboardId) => get().widgetChartsByDashboard[dashboardId] ?? [],
  isLiveLoading: (dashboardId) => get().liveLoadingByDashboard[dashboardId] === true,

  ensureLive: async (dashboardId, options) => {
    const force = options?.force ?? false;
    const showLoading = options?.showLoading ?? !get().liveByDashboard[dashboardId];
    const cached = get().liveByDashboard[dashboardId];

    if (cached && !force) {
      return cached;
    }

    const inFlight = get().liveInflight[dashboardId];
    if (inFlight && !force) {
      return inFlight;
    }

    if (showLoading) {
      set((state) => ({
        liveLoadingByDashboard: { ...state.liveLoadingByDashboard, [dashboardId]: true },
      }));
    }

    const promise = (async () => {
      try {
        const data = await fetchLive(dashboardId, force);
        set((state) => ({
          liveByDashboard: { ...state.liveByDashboard, [dashboardId]: data },
          liveLoadingByDashboard: { ...state.liveLoadingByDashboard, [dashboardId]: false },
        }));
        return data;
      } catch {
        set((state) => ({
          liveLoadingByDashboard: { ...state.liveLoadingByDashboard, [dashboardId]: false },
        }));
        return cached ?? null;
      } finally {
        const nextInflight = { ...get().liveInflight };
        delete nextInflight[dashboardId];
        set({ liveInflight: nextInflight });
      }
    })();

    set((state) => ({
      liveInflight: { ...state.liveInflight, [dashboardId]: promise },
    }));

    return promise;
  },

  ensureSession: async (dashboardId, options) => {
    const force = options?.force ?? false;
    const cached = get().sessionByDashboard[dashboardId];

    if (cached && !force) {
      return cached;
    }

    const inFlight = get().sessionInflight[dashboardId];
    if (inFlight && !force) {
      return inFlight;
    }

    const promise = (async () => {
      try {
        const data = await fetchSession(dashboardId);
        set((state) => ({
          sessionByDashboard: { ...state.sessionByDashboard, [dashboardId]: data },
        }));
        return data;
      } catch {
        return cached ?? null;
      } finally {
        const nextInflight = { ...get().sessionInflight };
        delete nextInflight[dashboardId];
        set({ sessionInflight: nextInflight });
      }
    })();

    set((state) => ({
      sessionInflight: { ...state.sessionInflight, [dashboardId]: promise },
    }));

    return promise;
  },

  ensureWidgetCharts: async (dashboardId, options) => {
    const force = options?.force ?? false;
    const cached = get().widgetChartsByDashboard[dashboardId];

    if (cached !== undefined && !force) {
      return cached;
    }

    const inFlight = get().chartsInflight[dashboardId];
    if (inFlight && !force) {
      return inFlight;
    }

    const promise = (async () => {
      const charts = await fetchWidgetCharts(dashboardId);
      set((state) => ({
        widgetChartsByDashboard: { ...state.widgetChartsByDashboard, [dashboardId]: charts },
      }));
      return charts;
    })();

    set((state) => ({
      chartsInflight: { ...state.chartsInflight, [dashboardId]: promise },
    }));

    try {
      return await promise;
    } finally {
      const nextInflight = { ...get().chartsInflight };
      delete nextInflight[dashboardId];
      set({ chartsInflight: nextInflight });
    }
  },

  invalidateLive: (dashboardId) => {
    set((state) => {
      const liveByDashboard = { ...state.liveByDashboard };
      delete liveByDashboard[dashboardId];
      return { liveByDashboard };
    });
  },

  invalidateDashboard: (dashboardId) => {
    set((state) => {
      const liveByDashboard = { ...state.liveByDashboard };
      const sessionByDashboard = { ...state.sessionByDashboard };
      const widgetChartsByDashboard = { ...state.widgetChartsByDashboard };
      delete liveByDashboard[dashboardId];
      delete sessionByDashboard[dashboardId];
      delete widgetChartsByDashboard[dashboardId];
      return { liveByDashboard, sessionByDashboard, widgetChartsByDashboard };
    });
  },
}));

export { LIVE_POLL_MS };
