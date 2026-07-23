"use client";

import { create } from "zustand";
import {
  fetchClientRecentViews,
  recordClientView,
  setClientPin,
  type ClientRecentView,
} from "@/lib/supabase/client-recent-views-repository";
import { useAuthStore } from "@/store/auth-store";

type ClientRecentViewsState = {
  views: ClientRecentView[];
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  recordView: (clientId: string) => Promise<void>;
  togglePin: (clientId: string) => Promise<void>;
};

function currentUserId() {
  const state = useAuthStore.getState();
  return state.profile?.id ?? state.user?.id ?? null;
}

export const useClientRecentViewsStore = create<ClientRecentViewsState>((set, get) => ({
  views: [],
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }
    const userId = currentUserId();
    if (!userId) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const views = await fetchClientRecentViews(userId);
      set({ views, hydrated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać historii odwiedzin",
        isLoading: false,
      });
    }
  },

  recordView: async (clientId) => {
    if (!currentUserId()) {
      return;
    }
    try {
      const updated = await recordClientView(clientId);
      set((state) => ({
        views: [updated, ...state.views.filter((view) => view.clientId !== clientId)],
      }));
    } catch {
      // Cicha porażka — brak wpisu w historii nie blokuje otwarcia klienta.
    }
  },

  togglePin: async (clientId) => {
    const userId = currentUserId();
    if (!userId) {
      return;
    }

    const existing = get().views.find((view) => view.clientId === clientId) ?? null;
    const nextPinned = !existing?.pinnedAt;

    set((state) => ({
      views: existing
        ? state.views.map((view) =>
            view.clientId === clientId
              ? { ...view, pinnedAt: nextPinned ? new Date().toISOString() : null }
              : view,
          )
        : [
            ...state.views,
            { clientId, viewCount: 0, lastViewedAt: null, pinnedAt: new Date().toISOString() },
          ],
    }));

    try {
      const updated = await setClientPin(userId, clientId, nextPinned);
      set((state) => ({
        views: state.views.map((view) => (view.clientId === clientId ? updated : view)),
      }));
    } catch (error) {
      set((state) => ({
        views: existing
          ? state.views.map((view) => (view.clientId === clientId ? existing : view))
          : state.views.filter((view) => view.clientId !== clientId),
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować przypięcia",
      }));
    }
  },
}));
