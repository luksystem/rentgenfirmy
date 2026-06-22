"use client";

import { create } from "zustand";
import type { ProjectAgreementInput, ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import {
  cancelProjectAgreement,
  createProjectAgreement,
  deleteProjectAgreementDraft,
  fetchProjectAgreements,
  respondToProjectAgreement,
  submitProjectAgreementForClient,
  updateProjectAgreementDraft,
} from "@/lib/supabase/project-agreement-repository";

const loadPromises = new Map<string, Promise<ProjectClientAgreement[]>>();

type ProjectAgreementStore = {
  byProject: Record<string, ProjectClientAgreement[]>;
  loadingProjects: Record<string, boolean>;
  ensureAgreements: (projectId: string, options?: { force?: boolean }) => Promise<ProjectClientAgreement[]>;
  createAgreement: (
    projectId: string,
    input: ProjectAgreementInput,
    author: { name: string; side: "team" | "client" },
  ) => Promise<ProjectClientAgreement>;
  updateDraft: (projectId: string, agreementId: string, input: ProjectAgreementInput) => Promise<void>;
  submitForClient: (projectId: string, agreementId: string) => Promise<void>;
  respond: (
    projectId: string,
    agreementId: string,
    input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
  ) => Promise<ProjectClientAgreement>;
  cancel: (projectId: string, agreementId: string) => Promise<void>;
  removeDraft: (projectId: string, agreementId: string) => Promise<void>;
  invalidateProject: (projectId: string) => void;
};

function setProjectAgreements(
  projectId: string,
  agreements: ProjectClientAgreement[],
  set: (partial: Partial<ProjectAgreementStore>) => void,
  get: () => ProjectAgreementStore,
) {
  set({
    byProject: { ...get().byProject, [projectId]: agreements },
    loadingProjects: { ...get().loadingProjects, [projectId]: false },
  });
}

export const useProjectAgreementStore = create<ProjectAgreementStore>((set, get) => ({
  byProject: {},
  loadingProjects: {},

  ensureAgreements: async (projectId, options) => {
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

    const promise = fetchProjectAgreements(projectId)
      .then((agreements) => {
        setProjectAgreements(projectId, agreements, set, get);
        return agreements;
      })
      .finally(() => {
        loadPromises.delete(projectId);
      });

    loadPromises.set(projectId, promise);
    return promise;
  },

  createAgreement: async (projectId, input, author) => {
    const created = await createProjectAgreement(projectId, input, author);
    const list = [...(get().byProject[projectId] ?? []), created];
    setProjectAgreements(projectId, list, set, get);
    return created;
  },

  updateDraft: async (projectId, agreementId, input) => {
    const updated = await updateProjectAgreementDraft(agreementId, input);
    const list = (get().byProject[projectId] ?? []).map((entry) =>
      entry.id === agreementId ? updated : entry,
    );
    setProjectAgreements(projectId, list, set, get);
  },

  submitForClient: async (projectId, agreementId) => {
    const updated = await submitProjectAgreementForClient(agreementId);
    const list = (get().byProject[projectId] ?? []).map((entry) =>
      entry.id === agreementId ? updated : entry,
    );
    setProjectAgreements(projectId, list, set, get);
  },

  respond: async (projectId, agreementId, input) => {
    const updated = await respondToProjectAgreement(agreementId, input);
    const list = (get().byProject[projectId] ?? []).map((entry) =>
      entry.id === agreementId ? updated : entry,
    );
    setProjectAgreements(projectId, list, set, get);
    return updated;
  },

  cancel: async (projectId, agreementId) => {
    const updated = await cancelProjectAgreement(agreementId);
    const list = (get().byProject[projectId] ?? []).map((entry) =>
      entry.id === agreementId ? updated : entry,
    );
    setProjectAgreements(projectId, list, set, get);
  },

  removeDraft: async (projectId, agreementId) => {
    await deleteProjectAgreementDraft(agreementId);
    const list = (get().byProject[projectId] ?? []).filter((entry) => entry.id !== agreementId);
    setProjectAgreements(projectId, list, set, get);
  },

  invalidateProject: (projectId) => {
    loadPromises.delete(projectId);
    const byProject = { ...get().byProject };
    delete byProject[projectId];
    set({ byProject });
  },
}));
