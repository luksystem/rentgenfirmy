"use client";

import { create } from "zustand";
import type {
  ChecklistItemPayload,
  ProcessTemplate,
  ProjectProcess,
  ProjectProcessItem,
} from "@/lib/process/types";
import { getProcessProgress } from "@/lib/process/types";
import {
  ensureProjectProcessItems,
  mapProjectProcessItemsByTemplateId,
  saveProjectProcessItemChecklist,
} from "@/lib/supabase/process-item-repository";
import {
  ensureDefaultProcessTemplates,
  ensureProcessTemplateForProjectType,
  fetchProcessTemplates,
  fetchProjectProcess,
  fetchProjectProcesses,
  getOrCreateProjectProcess,
  saveProcessTemplate,
  updateProjectProcessCompletion,
} from "@/lib/supabase/process-repository";

type ProcessStore = {
  templates: ProcessTemplate[];
  projectProcesses: Record<string, ProjectProcess>;
  projectProcessItems: Record<string, Record<string, ProjectProcessItem>>;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: (projectTypes: string[]) => Promise<void>;
  refresh: (projectTypes: string[]) => Promise<void>;
  getTemplateByProjectType: (projectType: string) => ProcessTemplate | undefined;
  getProjectProcess: (projectId: string) => ProjectProcess | undefined;
  getProjectProcessItem: (projectId: string, templateItemId: string) => ProjectProcessItem | undefined;
  getProjectProgress: (projectId: string, projectType: string) => { completed: number; total: number; percent: number } | null;
  ensureProjectProcess: (projectId: string, projectType: string) => Promise<ProjectProcess>;
  ensureProjectProcessItems: (projectId: string, template: ProcessTemplate) => Promise<void>;
  ensureTemplateForProjectType: (projectType: string) => Promise<ProcessTemplate>;
  saveTemplate: (template: ProcessTemplate) => Promise<void>;
  saveChecklistPayload: (
    projectId: string,
    templateItemId: string,
    payload: ChecklistItemPayload,
    actorName?: string,
  ) => Promise<void>;
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
  projectProcessItems: {},
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

  getProjectProcessItem: (projectId, templateItemId) =>
    get().projectProcessItems[projectId]?.[templateItemId],

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
    const templates = await fetchProcessTemplates();
    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: created },
      templates,
    }));
    return created;
  },

  ensureProjectProcessItems: async (projectId, template) => {
    const items = await ensureProjectProcessItems(projectId, template);
    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: mapProjectProcessItemsByTemplateId(items),
      },
    }));
  },

  ensureTemplateForProjectType: async (projectType) => {
    const existing = get().getTemplateByProjectType(projectType);
    if (existing) {
      return existing;
    }

    const created = await ensureProcessTemplateForProjectType(projectType);
    if (!created) {
      throw new Error(`Nie udało się utworzyć szablonu dla typu „${projectType}”.`);
    }

    set((state) => ({
      templates: [...state.templates.filter((template) => template.projectType !== projectType), created],
    }));
    return created;
  },

  saveTemplate: async (template) => {
    const saved = await saveProcessTemplate(template);
    if (!saved) {
      throw new Error("Nie udało się zapisać szablonu.");
    }
    set((state) => ({
      templates: state.templates.map((entry) =>
        entry.projectType === saved.projectType ? saved : entry,
      ),
    }));
  },

  saveChecklistPayload: async (projectId, templateItemId, payload, actorName) => {
    const saved = await saveProjectProcessItemChecklist(
      projectId,
      templateItemId,
      payload,
      actorName,
    );
    const process = await fetchProjectProcess(projectId);

    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: {
          ...state.projectProcessItems[projectId],
          [templateItemId]: saved,
        },
      },
      projectProcesses: process
        ? { ...state.projectProcesses, [projectId]: process }
        : state.projectProcesses,
    }));
  },

  toggleItemCompletion: async (projectId, itemId, completed, completedBy) => {
    const current = get().projectProcesses[projectId];
    if (!current) {
      throw new Error("Nie znaleziono procesu projektu.");
    }

    const optimisticCompletions = { ...current.completions };
    if (completed) {
      optimisticCompletions[itemId] = {
        completedAt: new Date().toISOString(),
        completedBy,
      };
    } else {
      delete optimisticCompletions[itemId];
    }

    const optimistic: ProjectProcess = {
      ...current,
      completions: optimisticCompletions,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: optimistic },
    }));

    try {
      const updated = await updateProjectProcessCompletion(
        projectId,
        itemId,
        completed,
        completedBy,
      );
      set((state) => ({
        projectProcesses: { ...state.projectProcesses, [projectId]: updated },
      }));
    } catch (error) {
      set((state) => ({
        projectProcesses: { ...state.projectProcesses, [projectId]: current },
        error: error instanceof Error ? error.message : "Błąd zapisu postępu procesu.",
      }));
      throw error;
    }
  },
}));
