"use client";

import { create } from "zustand";
import type { ProjectTrade, ProjectTradeInput } from "@/lib/dashboard/trade-types";
import {
  addProjectTrade,
  deleteProjectTrade,
  fetchProjectTrades,
  updateProjectTrade,
} from "@/lib/supabase/project-trade-repository";

const loadPromises = new Map<string, Promise<ProjectTrade[]>>();

type ProjectTradeStore = {
  byProject: Record<string, ProjectTrade[]>;
  loadingProjects: Record<string, boolean>;
  ensureTrades: (projectId: string, options?: { force?: boolean }) => Promise<ProjectTrade[]>;
  seedProjectTrades: (projectId: string, trades: ProjectTrade[]) => void;
  addTrade: (projectId: string, input: ProjectTradeInput) => Promise<void>;
  updateTrade: (projectId: string, tradeId: string, input: ProjectTradeInput) => Promise<void>;
  removeTrade: (projectId: string, tradeId: string) => Promise<void>;
};

export const useProjectTradeStore = create<ProjectTradeStore>((set, get) => ({
  byProject: {},
  loadingProjects: {},

  seedProjectTrades: (projectId, trades) => {
    set({
      byProject: { ...get().byProject, [projectId]: trades },
      loadingProjects: { ...get().loadingProjects, [projectId]: false },
    });
  },

  ensureTrades: async (projectId, options) => {
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

    const promise = fetchProjectTrades(projectId)
      .then((trades) => {
        set({
          byProject: { ...get().byProject, [projectId]: trades },
          loadingProjects: { ...get().loadingProjects, [projectId]: false },
        });
        return trades;
      })
      .finally(() => {
        loadPromises.delete(projectId);
      });

    loadPromises.set(projectId, promise);
    return promise;
  },

  addTrade: async (projectId, input) => {
    const created = await addProjectTrade(projectId, input);
    const list = [...(get().byProject[projectId] ?? []), created];
    set({ byProject: { ...get().byProject, [projectId]: list } });
  },

  updateTrade: async (projectId, tradeId, input) => {
    const updated = await updateProjectTrade(tradeId, input);
    const list = (get().byProject[projectId] ?? []).map((entry) =>
      entry.id === tradeId ? updated : entry,
    );
    set({ byProject: { ...get().byProject, [projectId]: list } });
  },

  removeTrade: async (projectId, tradeId) => {
    await deleteProjectTrade(tradeId);
    const list = (get().byProject[projectId] ?? []).filter((entry) => entry.id !== tradeId);
    set({ byProject: { ...get().byProject, [projectId]: list } });
  },
}));
