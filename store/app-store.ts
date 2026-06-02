"use client";

import { create } from "zustand";
import {
  DEFAULT_FIELD_OPTIONS,
  normalizeFieldOptions,
  type FieldOptions,
} from "@/lib/field-options";
import {
  DEFAULT_PROJECTS_VIEW_FILTERS,
  type ProjectsViewFilters,
} from "@/lib/projects-view-filters";
import {
  createInterruption,
  createProject,
  deleteInterruptionRecord,
  deleteProjectRecord,
  fetchInterruptions,
  fetchProjects,
  updateInterruptionRecord,
  updateProjectRecord,
} from "@/lib/supabase/repository";
import {
  fetchProjectsViewFilters,
  saveProjectsViewFilters,
} from "@/lib/supabase/projects-view-filters-repository";
import { fetchFieldOptions, saveFieldOptions } from "@/lib/supabase/settings-repository";
import type { Interruption, Project, ProjectInput } from "@/lib/types";

const PROJECTS_VIEW_FILTERS_SAVE_DELAY_MS = 400;
let projectsViewFiltersSaveTimer: ReturnType<typeof setTimeout> | null = null;

type AppState = {
  projects: Project[];
  interruptions: Interruption[];
  fieldOptions: FieldOptions;
  projectsViewFilters: ProjectsViewFilters;
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  addProject: (project: ProjectInput) => Promise<void>;
  updateProject: (id: string, project: ProjectInput) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addInterruption: (interruption: Omit<Interruption, "id">) => Promise<void>;
  updateInterruption: (id: string, interruption: Omit<Interruption, "id">) => Promise<void>;
  deleteInterruption: (id: string) => Promise<void>;
  updateFieldOptions: (options: FieldOptions) => Promise<void>;
  updateProjectsViewFilters: (filters: ProjectsViewFilters) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  interruptions: [],
  fieldOptions: DEFAULT_FIELD_OPTIONS,
  projectsViewFilters: DEFAULT_PROJECTS_VIEW_FILTERS,
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const [projects, interruptions, fieldOptions, projectsViewFilters] = await Promise.all([
        fetchProjects(),
        fetchInterruptions(),
        fetchFieldOptions(),
        fetchProjectsViewFilters(),
      ]);

      set({
        projects,
        interruptions,
        fieldOptions,
        projectsViewFilters,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać danych",
        isLoading: false,
      });
    }
  },

  addProject: async (project) => {
    set({ isSaving: true, error: null });

    try {
      const created = await createProject(project);
      set((state) => ({
        projects: [created, ...state.projects],
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się dodać projektu",
        isSaving: false,
      });
      throw error;
    }
  },

  updateProject: async (id, project) => {
    const existing = get().projects.find((item) => item.id === id);

    if (!existing) {
      throw new Error("Projekt nie istnieje");
    }

    set({ isSaving: true, error: null });

    try {
      const updated = await updateProjectRecord(id, project, existing);
      set((state) => ({
        projects: state.projects.map((item) => (item.id === id ? updated : item)),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować projektu",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isSaving: true, error: null });

    try {
      await deleteProjectRecord(id);
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
        interruptions: state.interruptions.filter(
          (interruption) => interruption.projectId !== id,
        ),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć projektu",
        isSaving: false,
      });
      throw error;
    }
  },

  addInterruption: async (interruption) => {
    set({ isSaving: true, error: null });

    try {
      const created = await createInterruption(interruption);
      set((state) => ({
        interruptions: [created, ...state.interruptions],
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się dodać przerwania",
        isSaving: false,
      });
      throw error;
    }
  },

  updateInterruption: async (id, interruption) => {
    set({ isSaving: true, error: null });

    try {
      const updated = await updateInterruptionRecord(id, interruption);
      set((state) => ({
        interruptions: state.interruptions.map((item) => (item.id === id ? updated : item)),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować przerwania",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteInterruption: async (id) => {
    set({ isSaving: true, error: null });

    try {
      await deleteInterruptionRecord(id);
      set((state) => ({
        interruptions: state.interruptions.filter((item) => item.id !== id),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć przerwania",
        isSaving: false,
      });
      throw error;
    }
  },

  updateFieldOptions: async (options) => {
    set({ isSaving: true, error: null });

    try {
      const fieldOptions = await saveFieldOptions(normalizeFieldOptions(options));
      set({
        fieldOptions,
        isSaving: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień",
        isSaving: false,
      });
      throw error;
    }
  },

  updateProjectsViewFilters: (filters) => {
    set({ projectsViewFilters: filters, error: null });

    if (projectsViewFiltersSaveTimer) {
      clearTimeout(projectsViewFiltersSaveTimer);
    }

    projectsViewFiltersSaveTimer = setTimeout(async () => {
      set({ isSaving: true });

      try {
        const projectsViewFilters = await saveProjectsViewFilters(filters);
        set({
          projectsViewFilters,
          isSaving: false,
          error: null,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Nie udało się zapisać filtrów widoku",
          isSaving: false,
        });
      }
    }, PROJECTS_VIEW_FILTERS_SAVE_DELAY_MS);
  },
}));
