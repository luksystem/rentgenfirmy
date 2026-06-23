"use client";

import { create } from "zustand";
import type {
  AgreementFulfillmentInput,
  ProjectSatisfactionBundle,
  ProjectSatisfactionOverviewInput,
  SpecificationFulfillmentInput,
  StageSatisfactionInput,
} from "@/lib/dashboard/satisfaction-types";
import {
  fetchProjectSatisfactionBundle,
  upsertAgreementFulfillment,
  upsertProjectSatisfactionOverview,
  upsertSpecificationFulfillment,
  upsertStageSatisfaction,
} from "@/lib/supabase/project-satisfaction-repository";

const EMPTY_BUNDLE: ProjectSatisfactionBundle = {
  agreementFulfillments: [],
  specificationFulfillments: [],
  stageSatisfactions: [],
  overview: null,
};

const loadPromises = new Map<string, Promise<ProjectSatisfactionBundle>>();

type ProjectSatisfactionStore = {
  byProject: Record<string, ProjectSatisfactionBundle>;
  loadingProjects: Record<string, boolean>;
  ensureSatisfaction: (
    projectId: string,
    options?: { force?: boolean },
  ) => Promise<ProjectSatisfactionBundle>;
  seedSatisfaction: (projectId: string, bundle: ProjectSatisfactionBundle) => void;
  saveAgreementFulfillment: (projectId: string, input: AgreementFulfillmentInput) => Promise<void>;
  saveSpecificationFulfillment: (
    projectId: string,
    input: SpecificationFulfillmentInput,
  ) => Promise<void>;
  saveStageSatisfaction: (projectId: string, input: StageSatisfactionInput) => Promise<void>;
  saveOverview: (projectId: string, input: ProjectSatisfactionOverviewInput) => Promise<void>;
};

function mergeFulfillment<T extends { id: string }>(list: T[], entry: T) {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    return [...list, entry];
  }
  const next = [...list];
  next[index] = entry;
  return next;
}

export const useProjectSatisfactionStore = create<ProjectSatisfactionStore>((set, get) => ({
  byProject: {},
  loadingProjects: {},

  seedSatisfaction: (projectId, bundle) => {
    set({
      byProject: { ...get().byProject, [projectId]: bundle },
      loadingProjects: { ...get().loadingProjects, [projectId]: false },
    });
  },

  ensureSatisfaction: async (projectId, options) => {
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

    const promise = fetchProjectSatisfactionBundle(projectId)
      .then((bundle) => {
        set({
          byProject: { ...get().byProject, [projectId]: bundle },
          loadingProjects: { ...get().loadingProjects, [projectId]: false },
        });
        return bundle;
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

  saveAgreementFulfillment: async (projectId, input) => {
    const saved = await upsertAgreementFulfillment(projectId, input);
    const current = get().byProject[projectId] ?? EMPTY_BUNDLE;
    set({
      byProject: {
        ...get().byProject,
        [projectId]: {
          ...current,
          agreementFulfillments: mergeFulfillment(
            current.agreementFulfillments.filter((entry) => entry.agreementId !== input.agreementId),
            saved,
          ),
        },
      },
    });
  },

  saveSpecificationFulfillment: async (projectId, input) => {
    const saved = await upsertSpecificationFulfillment(projectId, input);
    const current = get().byProject[projectId] ?? EMPTY_BUNDLE;
    set({
      byProject: {
        ...get().byProject,
        [projectId]: {
          ...current,
          specificationFulfillments: mergeFulfillment(
            current.specificationFulfillments.filter(
              (entry) => entry.specificationItemId !== input.specificationItemId,
            ),
            saved,
          ),
        },
      },
    });
  },

  saveStageSatisfaction: async (projectId, input) => {
    const saved = await upsertStageSatisfaction(projectId, input);
    const current = get().byProject[projectId] ?? EMPTY_BUNDLE;
    set({
      byProject: {
        ...get().byProject,
        [projectId]: {
          ...current,
          stageSatisfactions: mergeFulfillment(
            current.stageSatisfactions.filter(
              (entry) => !(entry.stageId === input.stageId && entry.authorSide === input.authorSide),
            ),
            saved,
          ),
        },
      },
    });
  },

  saveOverview: async (projectId, input) => {
    const saved = await upsertProjectSatisfactionOverview(projectId, input);
    const current = get().byProject[projectId] ?? EMPTY_BUNDLE;
    set({
      byProject: {
        ...get().byProject,
        [projectId]: { ...current, overview: saved },
      },
    });
  },
}));
