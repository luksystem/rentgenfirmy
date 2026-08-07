"use client";

import { create } from "zustand";
import { deleteCalculatorOffer, fetchCalculatorOffers, upsertCalculatorOffer } from "@/lib/supabase/calculator-repository";
import type { CalculatorOffer } from "@/lib/calculator/types";

type CalculatorStore = {
  offers: CalculatorOffer[];
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;

  getOfferById: (id: string) => CalculatorOffer | undefined;
  saveOffer: (offer: CalculatorOffer) => Promise<CalculatorOffer>;
  removeOffer: (id: string) => Promise<void>;
};

export const useCalculatorStore = create<CalculatorStore>((set, get) => ({
  offers: [],
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const offers = await fetchCalculatorOffers();
      set({ offers, hydrated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać kalkulacji.",
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    try {
      const offers = await fetchCalculatorOffers();
      set({ offers });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Nie udało się odświeżyć kalkulacji." });
    }
  },

  getOfferById: (id) => get().offers.find((offer) => offer.id === id),

  saveOffer: async (offer) => {
    const saved = await upsertCalculatorOffer(offer);
    set((state) => ({
      offers: state.offers.some((item) => item.id === saved.id)
        ? state.offers.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...state.offers],
    }));
    return saved;
  },

  removeOffer: async (id) => {
    await deleteCalculatorOffer(id);
    set((state) => ({ offers: state.offers.filter((item) => item.id !== id) }));
  },
}));
