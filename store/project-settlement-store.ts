"use client";

import { create } from "zustand";
import {
  buildMoneyPayload,
  buildSettlementSummary,
  emptyBillingSettings,
  type ProjectBillingSettings,
  type ProjectBillingSettingsInput,
  type ProjectContractQuota,
  type ProjectContractQuotaInput,
  type ProjectHourlyReport,
  type ProjectHourlyReportInput,
  type ProjectSettlementEntry,
  type ProjectSettlementEntryInput,
  type ProjectSettlementSummary,
  type ProjectSettlementsBundle,
} from "@/lib/settlements/types";
import {
  createProjectContractQuota,
  createProjectHourlyReport,
  deleteProjectContractQuota,
  deleteProjectHourlyReport,
  updateProjectContractQuota,
  updateProjectHourlyReport,
  upsertProjectBillingSettings,
} from "@/lib/supabase/project-billing-repository";
import {
  createProjectSettlementEntry,
  deleteAutoChargeBySource,
  deleteProjectSettlementEntry,
  fetchProjectSettlementsBundle,
  syncProjectSettlementCharges,
  updateProjectSettlementEntry,
} from "@/lib/supabase/project-settlement-repository";

const loadPromises = new Map<string, Promise<ProjectSettlementsBundle>>();

type ProjectSettlementStore = {
  byProject: Record<string, ProjectSettlementsBundle>;
  loadingProjects: Record<string, boolean>;
  ensureSettlements: (
    projectId: string,
    options?: { force?: boolean; showLoading?: boolean; sync?: boolean },
  ) => Promise<ProjectSettlementsBundle>;
  getSummary: (projectId: string) => ProjectSettlementSummary | null;
  saveBillingSettings: (
    projectId: string,
    input: ProjectBillingSettingsInput,
  ) => Promise<ProjectBillingSettings>;
  addQuota: (projectId: string, input: ProjectContractQuotaInput) => Promise<ProjectContractQuota>;
  updateQuota: (
    projectId: string,
    quotaId: string,
    input: ProjectContractQuotaInput,
  ) => Promise<void>;
  removeQuota: (projectId: string, quotaId: string) => Promise<void>;
  addHourlyReport: (
    projectId: string,
    input: ProjectHourlyReportInput,
    createdByName: string,
  ) => Promise<ProjectHourlyReport>;
  updateHourlyReport: (
    projectId: string,
    reportId: string,
    input: ProjectHourlyReportInput,
  ) => Promise<void>;
  removeHourlyReport: (projectId: string, reportId: string) => Promise<void>;
  addEntry: (
    projectId: string,
    input: ProjectSettlementEntryInput,
    createdByName: string,
  ) => Promise<ProjectSettlementEntry>;
  updateEntry: (
    projectId: string,
    entryId: string,
    input: ProjectSettlementEntryInput,
  ) => Promise<void>;
  removeEntry: (projectId: string, entryId: string) => Promise<void>;
  seedBundle: (projectId: string, bundle: ProjectSettlementsBundle) => void;
  invalidateProject: (projectId: string) => void;
};

function setBundle(
  projectId: string,
  bundle: ProjectSettlementsBundle,
  set: (partial: Partial<ProjectSettlementStore>) => void,
  get: () => ProjectSettlementStore,
) {
  set({
    byProject: { ...get().byProject, [projectId]: bundle },
    loadingProjects: { ...get().loadingProjects, [projectId]: false },
  });
}

function patchBundle(
  projectId: string,
  patch: Partial<ProjectSettlementsBundle>,
  get: () => ProjectSettlementStore,
  set: (partial: Partial<ProjectSettlementStore>) => void,
) {
  const current = get().byProject[projectId] ?? {
    settings: emptyBillingSettings(projectId),
    quotas: [],
    hourlyReports: [],
    entries: [],
  };
  setBundle(projectId, { ...current, ...patch }, set, get);
}

export const useProjectSettlementStore = create<ProjectSettlementStore>((set, get) => ({
  byProject: {},
  loadingProjects: {},

  ensureSettlements: async (projectId, options) => {
    const force = options?.force ?? false;
    const showLoading = options?.showLoading ?? true;
    const sync = options?.sync ?? true;
    const cached = get().byProject[projectId];
    if (cached && !force) {
      return cached;
    }

    const inFlight = loadPromises.get(projectId);
    if (inFlight && !force) {
      return inFlight;
    }

    if (showLoading && !cached) {
      set({
        loadingProjects: { ...get().loadingProjects, [projectId]: true },
      });
    }

    const promise = fetchProjectSettlementsBundle(projectId, { sync })
      .then((bundle) => {
        setBundle(projectId, bundle, set, get);
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

  getSummary: (projectId) => {
    const bundle = get().byProject[projectId];
    if (!bundle) {
      return null;
    }
    return buildSettlementSummary(bundle.entries);
  },

  saveBillingSettings: async (projectId, input) => {
    const money = buildMoneyPayload(input.contractAmountNet, input.contractVatRate);
    const saved = await upsertProjectBillingSettings(projectId, {
      ...input,
      contractAmountNet: money?.amountNet ?? input.contractAmountNet ?? null,
      contractVatRate: money?.vatRate ?? input.contractVatRate ?? null,
      contractAmountGross: money?.amountGross ?? input.contractAmountGross ?? null,
      hourlyRateNet: input.hourlyRateNet ?? null,
    });
    patchBundle(projectId, { settings: saved }, get, set);
    await syncProjectSettlementCharges(projectId);
    await get().ensureSettlements(projectId, { force: true, showLoading: false, sync: false });
    return saved;
  },

  addQuota: async (projectId, input) => {
    const created = await createProjectContractQuota(projectId, input);
    const current = get().byProject[projectId];
    patchBundle(
      projectId,
      { quotas: [...(current?.quotas ?? []), created] },
      get,
      set,
    );
    return created;
  },

  updateQuota: async (projectId, quotaId, input) => {
    const updated = await updateProjectContractQuota(quotaId, input);
    const current = get().byProject[projectId];
    patchBundle(
      projectId,
      {
        quotas: (current?.quotas ?? []).map((quota) => (quota.id === quotaId ? updated : quota)),
      },
      get,
      set,
    );
  },

  removeQuota: async (projectId, quotaId) => {
    await deleteProjectContractQuota(quotaId);
    const current = get().byProject[projectId];
    patchBundle(
      projectId,
      { quotas: (current?.quotas ?? []).filter((quota) => quota.id !== quotaId) },
      get,
      set,
    );
  },

  addHourlyReport: async (projectId, input, createdByName) => {
    const money = buildMoneyPayload(input.amountNet, input.vatRate);
    const created = await createProjectHourlyReport(
      projectId,
      {
        ...input,
        amountNet: money?.amountNet ?? input.amountNet ?? null,
        vatRate: money?.vatRate ?? input.vatRate ?? null,
        amountGross: money?.amountGross ?? input.amountGross ?? null,
      },
      createdByName,
    );
    await syncProjectSettlementCharges(projectId);
    await get().ensureSettlements(projectId, { force: true, showLoading: false, sync: false });
    return created;
  },

  updateHourlyReport: async (projectId, reportId, input) => {
    const money = buildMoneyPayload(input.amountNet, input.vatRate);
    await updateProjectHourlyReport(reportId, {
      ...input,
      amountNet: money?.amountNet ?? input.amountNet ?? null,
      vatRate: money?.vatRate ?? input.vatRate ?? null,
      amountGross: money?.amountGross ?? input.amountGross ?? null,
    });
    await syncProjectSettlementCharges(projectId);
    await get().ensureSettlements(projectId, { force: true, showLoading: false, sync: false });
  },

  removeHourlyReport: async (projectId, reportId) => {
    await deleteProjectHourlyReport(reportId);
    await deleteAutoChargeBySource(projectId, "hourly", reportId).catch(() => undefined);
    await get().ensureSettlements(projectId, { force: true, showLoading: false, sync: false });
  },

  addEntry: async (projectId, input, createdByName) => {
    const created = await createProjectSettlementEntry(projectId, input, createdByName);
    const current = get().byProject[projectId];
    patchBundle(
      projectId,
      { entries: [created, ...(current?.entries ?? [])] },
      get,
      set,
    );
    return created;
  },

  updateEntry: async (projectId, entryId, input) => {
    const updated = await updateProjectSettlementEntry(entryId, input);
    const current = get().byProject[projectId];
    patchBundle(
      projectId,
      {
        entries: (current?.entries ?? []).map((entry) => (entry.id === entryId ? updated : entry)),
      },
      get,
      set,
    );
  },

  removeEntry: async (projectId, entryId) => {
    await deleteProjectSettlementEntry(entryId);
    const current = get().byProject[projectId];
    patchBundle(
      projectId,
      { entries: (current?.entries ?? []).filter((entry) => entry.id !== entryId) },
      get,
      set,
    );
  },

  seedBundle: (projectId, bundle) => {
    setBundle(projectId, bundle, set, get);
  },

  invalidateProject: (projectId) => {
    const next = { ...get().byProject };
    delete next[projectId];
    set({ byProject: next });
    loadPromises.delete(projectId);
  },
}));
