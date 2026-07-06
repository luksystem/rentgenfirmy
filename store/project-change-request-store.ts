"use client";

import { create } from "zustand";
import type {
  ProjectChangeRequest,
  ProjectChangeRequestInput,
} from "@/lib/dashboard/change-request-types";
import {
  cancelProjectChangeRequest,
  createProjectChangeRequest,
  deleteProjectChangeRequest,
  deleteProjectChangeRequestDraft,
  fetchProjectChangeRequests,
  respondToProjectChangeRequest,
  submitProjectChangeRequestForClient,
  updateProjectChangeRequest,
  updateProjectChangeRequestDraft,
} from "@/lib/supabase/project-change-request-repository";

const loadPromises = new Map<string, Promise<ProjectChangeRequest[]>>();

type ProjectChangeRequestStore = {
  byProject: Record<string, ProjectChangeRequest[]>;
  loadingProjects: Record<string, boolean>;
  ensureChangeRequests: (
    projectId: string,
    options?: { force?: boolean },
  ) => Promise<ProjectChangeRequest[]>;
  createChangeRequest: (
    projectId: string,
    input: ProjectChangeRequestInput,
    author: { name: string; side: "team" | "client" },
  ) => Promise<ProjectChangeRequest>;
  updateDraft: (projectId: string, id: string, input: ProjectChangeRequestInput) => Promise<void>;
  updateChangeRequest: (projectId: string, id: string, input: ProjectChangeRequestInput) => Promise<void>;
  submitForClient: (projectId: string, id: string) => Promise<void>;
  respond: (
    projectId: string,
    id: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) => Promise<ProjectChangeRequest>;
  cancel: (projectId: string, id: string) => Promise<void>;
  removeDraft: (projectId: string, id: string) => Promise<void>;
  removeChangeRequest: (projectId: string, id: string) => Promise<void>;
  invalidateProject: (projectId: string) => void;
};

function setProjectChangeRequests(
  projectId: string,
  entries: ProjectChangeRequest[],
  set: (partial: Partial<ProjectChangeRequestStore>) => void,
  get: () => ProjectChangeRequestStore,
) {
  set({
    byProject: { ...get().byProject, [projectId]: entries },
    loadingProjects: { ...get().loadingProjects, [projectId]: false },
  });
}

export const useProjectChangeRequestStore = create<ProjectChangeRequestStore>((set, get) => ({
  byProject: {},
  loadingProjects: {},

  ensureChangeRequests: async (projectId, options) => {
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

    const promise = fetchProjectChangeRequests(projectId)
      .then((entries) => {
        setProjectChangeRequests(projectId, entries, set, get);
        return entries;
      })
      .catch((error) => {
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

  createChangeRequest: async (projectId, input, author) => {
    const created = await createProjectChangeRequest(projectId, input, author);
    await get().ensureChangeRequests(projectId, { force: true });
    return created;
  },

  updateDraft: async (projectId, id, input) => {
    const updated = await updateProjectChangeRequestDraft(id, input);
    const list = (get().byProject[projectId] ?? []).map((entry) => (entry.id === id ? updated : entry));
    setProjectChangeRequests(projectId, list, set, get);
  },

  updateChangeRequest: async (projectId, id, input) => {
    const updated = await updateProjectChangeRequest(id, input);
    const list = (get().byProject[projectId] ?? []).map((entry) => (entry.id === id ? updated : entry));
    setProjectChangeRequests(projectId, list, set, get);
  },

  submitForClient: async (projectId, id) => {
    const updated = await submitProjectChangeRequestForClient(id);
    const list = (get().byProject[projectId] ?? []).map((entry) => (entry.id === id ? updated : entry));
    setProjectChangeRequests(projectId, list, set, get);
  },

  respond: async (projectId, id, input) => {
    const updated = await respondToProjectChangeRequest(id, input);
    const list = (get().byProject[projectId] ?? []).map((entry) => (entry.id === id ? updated : entry));
    setProjectChangeRequests(projectId, list, set, get);
    return updated;
  },

  cancel: async (projectId, id) => {
    const updated = await cancelProjectChangeRequest(id);
    const list = (get().byProject[projectId] ?? []).map((entry) => (entry.id === id ? updated : entry));
    setProjectChangeRequests(projectId, list, set, get);
  },

  removeDraft: async (projectId, id) => {
    await deleteProjectChangeRequestDraft(id);
    const list = (get().byProject[projectId] ?? []).filter((entry) => entry.id !== id);
    setProjectChangeRequests(projectId, list, set, get);
  },

  removeChangeRequest: async (projectId, id) => {
    await deleteProjectChangeRequest(id);
    const list = (get().byProject[projectId] ?? []).filter((entry) => entry.id !== id);
    setProjectChangeRequests(projectId, list, set, get);
  },

  invalidateProject: (projectId) => {
    loadPromises.delete(projectId);
    const byProject = { ...get().byProject };
    delete byProject[projectId];
    set({ byProject });
  },
}));
