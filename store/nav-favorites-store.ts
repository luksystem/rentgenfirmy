"use client";

import { create } from "zustand";
import {
  addNavFavorite,
  fetchNavFavoriteHrefs,
  removeNavFavorite,
} from "@/lib/supabase/nav-favorites-repository";
import { useAuthStore } from "@/store/auth-store";

let inFlight: Promise<string[]> | null = null;

type NavFavoritesState = {
  hrefs: string[];
  hydrated: boolean;
  loading: boolean;
  userId: string | null;
  ensure: (options?: { force?: boolean }) => Promise<string[]>;
  invalidate: () => void;
  isFavorite: (href: string) => boolean;
  toggle: (href: string) => Promise<void>;
};

export const useNavFavoritesStore = create<NavFavoritesState>((set, get) => ({
  hrefs: [],
  hydrated: false,
  loading: false,
  userId: null,

  ensure: async (options) => {
    const force = options?.force ?? false;
    const userId = useAuthStore.getState().profile?.id ?? null;

    if (!userId) {
      set({ hrefs: [], hydrated: false, loading: false, userId: null });
      return [];
    }

    if (get().hydrated && !force && get().userId === userId) {
      return get().hrefs;
    }
    if (inFlight && !force) {
      return inFlight;
    }

    set({ loading: !get().hydrated });
    const promise = fetchNavFavoriteHrefs(userId)
      .then((hrefs) => {
        set({ hrefs, hydrated: true, loading: false, userId });
        return hrefs;
      })
      .catch((error) => {
        set({ loading: false });
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });

    inFlight = promise;
    return promise;
  },

  invalidate: () => set({ hydrated: false }),

  isFavorite: (href) => get().hrefs.includes(href),

  toggle: async (href) => {
    const userId = useAuthStore.getState().profile?.id ?? null;
    if (!userId) {
      return;
    }

    const wasFavorite = get().hrefs.includes(href);
    set({
      hrefs: wasFavorite ? get().hrefs.filter((item) => item !== href) : [...get().hrefs, href],
      userId,
      hydrated: true,
    });

    try {
      if (wasFavorite) {
        await removeNavFavorite(userId, href);
      } else {
        await addNavFavorite(userId, href);
      }
    } catch (error) {
      set((state) => ({
        hrefs: wasFavorite
          ? [...state.hrefs, href]
          : state.hrefs.filter((item) => item !== href),
      }));
      throw error;
    }
  },
}));
