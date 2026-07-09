"use client";

import { create } from "zustand";
import type { DictionaryItem, DictionaryItemInput, DictionaryKey } from "@/lib/resource-plan/dictionary-types";
import {
  createDictionaryItem,
  deleteDictionaryItem,
  fetchAllDictionaryItems,
  reorderDictionaryItems,
  updateDictionaryItem,
} from "@/lib/supabase/dictionary-repository";

let inFlight: Promise<DictionaryItem[]> | null = null;

type DictionaryStore = {
  items: DictionaryItem[];
  hydrated: boolean;
  loading: boolean;
  ensure: (options?: { force?: boolean }) => Promise<DictionaryItem[]>;
  invalidate: () => void;
  byKey: (key: DictionaryKey, options?: { activeOnly?: boolean }) => DictionaryItem[];
  itemLabel: (id: string | null | undefined) => string;
  createItem: (input: DictionaryItemInput) => Promise<DictionaryItem>;
  updateItem: (id: string, input: Partial<DictionaryItemInput>) => Promise<DictionaryItem>;
  removeItem: (id: string) => Promise<void>;
  reorder: (key: DictionaryKey, orderedIds: string[]) => Promise<void>;
};

export const useDictionaryStore = create<DictionaryStore>((set, get) => ({
  items: [],
  hydrated: false,
  loading: false,

  ensure: async (options) => {
    const force = options?.force ?? false;
    if (get().hydrated && !force) {
      return get().items;
    }
    if (inFlight && !force) {
      return inFlight;
    }

    set({ loading: !get().hydrated });
    const promise = fetchAllDictionaryItems()
      .then((items) => {
        set({ items, hydrated: true, loading: false });
        return items;
      })
      .finally(() => {
        inFlight = null;
      });

    inFlight = promise;
    return promise;
  },

  invalidate: () => set({ hydrated: false }),

  byKey: (key, options) => {
    const activeOnly = options?.activeOnly ?? true;
    return get()
      .items.filter((item) => item.dictionaryKey === key && (!activeOnly || item.isActive))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  itemLabel: (id) => {
    if (!id) return "—";
    return get().items.find((item) => item.id === id)?.name ?? "—";
  },

  createItem: async (input) => {
    const created = await createDictionaryItem(input);
    set({ items: [...get().items, created] });
    return created;
  },

  updateItem: async (id, input) => {
    const updated = await updateDictionaryItem(id, input);
    set({ items: get().items.map((item) => (item.id === id ? updated : item)) });
    return updated;
  },

  removeItem: async (id) => {
    await deleteDictionaryItem(id);
    set({ items: get().items.filter((item) => item.id !== id) });
  },

  reorder: async (key, orderedIds) => {
    const current = get().byKey(key, { activeOnly: false });
    const payload = orderedIds.map((id, index) => ({ id, sortOrder: index * 10 }));
    set({
      items: get().items.map((item) => {
        const match = payload.find((entry) => entry.id === item.id);
        return match ? { ...item, sortOrder: match.sortOrder } : item;
      }),
    });
    await reorderDictionaryItems(payload).catch(() => {
      set({ items: get().items });
    });
    void current;
  },
}));
