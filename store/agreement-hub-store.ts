"use client";

import { create } from "zustand";
import type { AgreementHubSnapshot } from "@/lib/dashboard/agreement-hub-types";
import {
  fetchAgreementHubSnapshot,
  invalidateAgreementHubCache,
} from "@/lib/supabase/agreement-hub-repository";

let loadPromise: Promise<AgreementHubSnapshot> | null = null;

type AgreementHubStore = {
  snapshot: AgreementHubSnapshot | null;
  loading: boolean;
  hydrated: boolean;
  error: string | null;
  ensureSnapshot: (options?: { force?: boolean }) => Promise<AgreementHubSnapshot>;
  invalidate: () => void;
};

export const useAgreementHubStore = create<AgreementHubStore>((set, get) => ({
  snapshot: null,
  loading: false,
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

  invalidate: () => {
    invalidateAgreementHubCache();
    loadPromise = null;
    set({ snapshot: null, hydrated: false, error: null });
  },
}));
