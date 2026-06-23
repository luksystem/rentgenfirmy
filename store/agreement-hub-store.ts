"use client";

import { create } from "zustand";
import type { AgreementHubSnapshot } from "@/lib/dashboard/agreement-hub-types";
import {
  EMPTY_AGREEMENT_ACTION_PENDING_COUNTS,
  type AgreementActionPendingCounts,
} from "@/lib/dashboard/agreement-hub-types";
import {
  fetchAgreementActionPendingCounts,
  fetchAgreementHubSnapshot,
  invalidateAgreementHubCache,
} from "@/lib/supabase/agreement-hub-repository";

let loadPromise: Promise<AgreementHubSnapshot> | null = null;
let pendingCountsPromise: Promise<AgreementActionPendingCounts> | null = null;

type AgreementHubStore = {
  snapshot: AgreementHubSnapshot | null;
  pendingCounts: AgreementActionPendingCounts;
  loading: boolean;
  pendingCountsLoading: boolean;
  hydrated: boolean;
  error: string | null;
  ensureSnapshot: (options?: { force?: boolean }) => Promise<AgreementHubSnapshot>;
  refreshPendingCounts: (options?: { force?: boolean }) => Promise<AgreementActionPendingCounts>;
  invalidate: () => void;
};

export const useAgreementHubStore = create<AgreementHubStore>((set, get) => ({
  snapshot: null,
  pendingCounts: EMPTY_AGREEMENT_ACTION_PENDING_COUNTS,
  loading: false,
  pendingCountsLoading: false,
  hydrated: false,
  error: null,

  ensureSnapshot: async (options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.hydrated && state.snapshot && !force) {
      return state.snapshot;
    }

    if (loadPromise && !force) {
      return loadPromise;
    }

    if (force) {
      invalidateAgreementHubCache();
      loadPromise = null;
    }

    set({ loading: true, error: null });

    const promise = fetchAgreementHubSnapshot({ force }).then(
      (snapshot) => {
        set({
          snapshot,
          loading: false,
          hydrated: true,
          error: null,
        });
        return snapshot;
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : "Nie udało się załadować ustaleń.";
        set({ loading: false, error: message });
        throw error;
      },
    );

    loadPromise = promise;
    try {
      return await promise;
    } finally {
      if (loadPromise === promise) {
        loadPromise = null;
      }
    }
  },

  refreshPendingCounts: async (options) => {
    const force = options?.force ?? false;

    if (pendingCountsPromise && !force) {
      return pendingCountsPromise;
    }

    if (force) {
      pendingCountsPromise = null;
    }

    set({ pendingCountsLoading: true });

    const promise = fetchAgreementActionPendingCounts({ force }).then(
      (counts) => {
        set({ pendingCounts: counts, pendingCountsLoading: false });
        return counts;
      },
      (error: unknown) => {
        set({ pendingCountsLoading: false });
        throw error;
      },
    );

    pendingCountsPromise = promise;
    try {
      return await promise;
    } finally {
      if (pendingCountsPromise === promise) {
        pendingCountsPromise = null;
      }
    }
  },

  invalidate: () => {
    invalidateAgreementHubCache();
    loadPromise = null;
    pendingCountsPromise = null;
    set({
      snapshot: null,
      hydrated: false,
      error: null,
      pendingCounts: EMPTY_AGREEMENT_ACTION_PENDING_COUNTS,
    });
  },
}));
