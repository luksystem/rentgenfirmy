"use client";

import { create } from "zustand";
import type { FunctionalitySurveyBundle } from "@/lib/client-functionality/types";

const loadPromises = new Map<string, Promise<FunctionalitySurveyBundle>>();

type FunctionalitySurveyStore = {
  byProject: Record<string, FunctionalitySurveyBundle>;
  loadingProjects: Record<string, boolean>;
  ensureBundle: (projectId: string, options?: { force?: boolean }) => Promise<FunctionalitySurveyBundle>;
  setBundle: (projectId: string, bundle: FunctionalitySurveyBundle) => void;
};

export const useFunctionalitySurveyStore = create<FunctionalitySurveyStore>((set, get) => ({
  byProject: {},
  loadingProjects: {},

  ensureBundle: async (projectId, options) => {
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
      loadingProjects: { ...get().loadingProjects, [projectId]: !cached },
    });

    const promise = fetch(`/api/projects/${encodeURIComponent(projectId)}/functionality-survey`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          bundle?: FunctionalitySurveyBundle;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Błąd pobierania ankiety.");
        }
        const bundle = payload.bundle ?? {
          survey: null,
          questions: [],
          responses: [],
          tasks: [],
          projectName: "",
          clientName: "",
        };
        set({
          byProject: { ...get().byProject, [projectId]: bundle },
          loadingProjects: { ...get().loadingProjects, [projectId]: false },
        });
        return bundle;
      })
      .catch((error: unknown) => {
        set({
          loadingProjects: { ...get().loadingProjects, [projectId]: false },
        });
        throw error;
      })
      .finally(() => {
        loadPromises.delete(projectId);
      });

    loadPromises.set(projectId, promise);
    return promise;
  },

  setBundle: (projectId, bundle) => {
    set({ byProject: { ...get().byProject, [projectId]: bundle } });
  },
}));

async function postSurveyAction(projectId: string, action: string, input?: Record<string, unknown>) {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/functionality-survey`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    },
  );
  const payload = (await response.json()) as {
    bundle?: FunctionalitySurveyBundle;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Błąd operacji ankiety.");
  }
  return payload;
}

export async function ensureProjectFunctionalitySurvey(projectId: string) {
  return postSurveyAction(projectId, "ensure");
}

export async function sendProjectFunctionalitySurvey(projectId: string) {
  return postSurveyAction(projectId, "send");
}

export async function suggestProjectFunctionalityAi(projectId: string) {
  return postSurveyAction(projectId, "ai_suggest");
}

export async function reviewProjectFunctionalityAi(
  projectId: string,
  suggestions: import("@/lib/client-functionality/types").FunctionalityAiSuggestion[],
) {
  return postSurveyAction(projectId, "ai_review", { suggestions });
}

export async function regenerateProjectFunctionalityTasks(projectId: string) {
  return postSurveyAction(projectId, "regenerate_tasks");
}

export async function updateProjectFunctionalityTaskStatus(
  projectId: string,
  taskId: string,
  status: import("@/lib/client-functionality/types").FunctionalityTaskStatus,
) {
  return postSurveyAction(projectId, "task_status", { taskId, status });
}

export async function markProjectFunctionalitySurveyReviewed(projectId: string) {
  const payload = await postSurveyAction(projectId, "mark_reviewed");
  if (payload.bundle) {
    useFunctionalitySurveyStore.getState().setBundle(projectId, payload.bundle);
  }
  return payload;
}
