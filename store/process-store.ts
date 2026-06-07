"use client";

import { create } from "zustand";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { getProcessProgress } from "@/lib/process/types";
import {
  ensureDefaultProcessTemplates,
  fetchProcessTemplates,
  fetchProjectProcesses,
  getOrCreateProjectProcess,
  updateProjectProcessCompletion,
} from "@/lib/supabase/process-repository";

type ProcessStore = {
  templates: ProcessTemplate[];
  projectProcesses: Record<string, ProjectProcess>;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: (projectTypes: string[]) => Promise<void>;
  refresh: (projectTypes: string[]) => Promise<void>;
  getTemplateByProjectType: (projectType: string) => ProcessTemplate | undefined;
  getProjectProcess: (projectId: string) => ProjectProcess | undefined;
  getProjectProgress: (projectId: string, projectType: string) => { completed: number; total: number; percent: number } | null;
  ensureProjectProcess: (projectId: string, projectType: string) => Promise<ProjectProcess>;
  toggleItemCompletion: (
    projectId: string,
    itemId: string,
    completed: boolean,
    completedBy?: string,
  ) => Promise<void>;
};

export const useProcessStore = create<ProcessStore>((set, get) => ({
  templates: [],
  projectProcesses: {},
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async (projectTypes) => {
    set({ isLoading: true, error: null });
    try {
      await ensureDefaultProcessTemplates(projectTypes);
      const [templates, processes] = await Promise.all([
        fetchProcessTemplates(),
        fetchProjectProcesses(),
      ]);
      set({
        templates,
        projectProcesses: Object.fromEntries(processes.map((process) => [process.projectId, process])),
        hydrated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Błąd ładowania procesów.",
        isLoading: false,
      });
    }
  },

  refresh: async (projectTypes) => {
    await get().hydrate(projectTypes);
  },

  getTemplateByProjectType: (projectType) =>
    get().templates.find((template) => template.projectType === projectType),

  getProjectProcess: (projectId) => get().projectProcesses[projectId],

  getProjectProgress: (projectId, projectType) => {
    const template = get().getTemplateByProjectType(projectType);
    const process = get().getProjectProcess(projectId);
    if (!template || !process) {
      return null;
    }
    return getProcessProgress(template, process);
  },

  ensureProjectProcess: async (projectId, projectType) => {
    const existing = get().getProjectProcess(projectId);
    if (existing) {
      return existing;
    }

    const created = await getOrCreateProjectProcess(projectId, projectType);
    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: created },
    }));
    return created;
  },

  toggleItemCompletion: async (projectId, itemId, completed, completedBy) => {
    const updated = await updateProjectProcessCompletion(
      projectId,
      itemId,
      completed,
      completedBy,
    );
    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: updated },
    }));
  },
}));
