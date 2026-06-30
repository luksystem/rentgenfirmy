"use client";

import { create } from "zustand";
import type {
  IntegrationAuditEntry,
  IntegrationMeta,
  ProjectTelemetrySnapshot,
} from "@/lib/integrations/types";

type ProjectIntegrationsBundle = {
  integrations: IntegrationMeta[];
  telemetry: ProjectTelemetrySnapshot[];
  audit?: IntegrationAuditEntry[];
};

type IntegrationsState = {
  byProjectId: Record<string, ProjectIntegrationsBundle | undefined>;
  loadingProjectIds: Set<string>;
  inflight: Map<string, Promise<void>>;
  ensureProjectIntegrations: (
    projectId: string,
    options?: { force?: boolean; includeAudit?: boolean },
  ) => Promise<void>;
  invalidateProjectIntegrations: (projectId: string) => void;
  replaceProjectIntegrations: (projectId: string, bundle: ProjectIntegrationsBundle) => void;
};

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  byProjectId: {},
  loadingProjectIds: new Set(),
  inflight: new Map(),

  ensureProjectIntegrations: async (projectId, options) => {
    const cached = get().byProjectId[projectId];
    if (cached && !options?.force) {
      return;
    }

    const existing = get().inflight.get(projectId);
    if (existing) {
      await existing;
      return;
    }

    const promise = (async () => {
      set((state) => ({
        loadingProjectIds: new Set(state.loadingProjectIds).add(projectId),
      }));

      try {
        const params = new URLSearchParams();
        if (options?.includeAudit) {
          params.set("audit", "1");
        }
        const query = params.toString();
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/integrations${query ? `?${query}` : ""}`,
          { credentials: "include" },
        );
        const payload = (await response.json()) as ProjectIntegrationsBundle & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Błąd pobierania integracji.");
        }

        set((state) => ({
          byProjectId: {
            ...state.byProjectId,
            [projectId]: {
              integrations: payload.integrations ?? [],
              telemetry: payload.telemetry ?? [],
              audit: payload.audit,
            },
          },
        }));
      } finally {
        set((state) => {
          const loadingProjectIds = new Set(state.loadingProjectIds);
          loadingProjectIds.delete(projectId);
          const inflight = new Map(state.inflight);
          inflight.delete(projectId);
          return { loadingProjectIds, inflight };
        });
      }
    })();

    set((state) => ({
      inflight: new Map(state.inflight).set(projectId, promise),
    }));

    await promise;
  },

  invalidateProjectIntegrations: (projectId) => {
    set((state) => {
      const byProjectId = { ...state.byProjectId };
      delete byProjectId[projectId];
      return { byProjectId };
    });
  },

  replaceProjectIntegrations: (projectId, bundle) => {
    set((state) => ({
      byProjectId: {
        ...state.byProjectId,
        [projectId]: bundle,
      },
    }));
  },
}));
