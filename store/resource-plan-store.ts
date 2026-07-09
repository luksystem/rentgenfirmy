"use client";

import { create } from "zustand";
import type { ResourcePlanItem, ResourcePlanItemInput } from "@/lib/resource-plan/types";
import {
  createResourcePlanItem,
  deleteResourcePlanItem,
  fetchResourcePlanItemsInRange,
  updateResourcePlanItem,
} from "@/lib/supabase/resource-plan-repository";

const loadPromises = new Map<string, Promise<void>>();

function rangeKey(from: string, to: string) {
  return `${from}__${to}`;
}

// Memoizacja wg referencji `items`: `allItems` jest wołane bezpośrednio jako selektor
// Zustand (`useResourcePlanStore((state) => state.allItems())`). Bez cache zwracałoby
// nową tablicę przy każdym renderze, co przy React 18/19 `useSyncExternalStore`
// powoduje nieskończoną pętlę renderowania (React error #185).
let allItemsCache: { items: Record<string, ResourcePlanItem>; result: ResourcePlanItem[] } | null = null;

function memoizedAllItems(items: Record<string, ResourcePlanItem>): ResourcePlanItem[] {
  if (allItemsCache && allItemsCache.items === items) {
    return allItemsCache.result;
  }
  const result = Object.values(items);
  allItemsCache = { items, result };
  return result;
}

type ResourcePlanStore = {
  items: Record<string, ResourcePlanItem>;
  loadedRanges: string[];
  loading: boolean;
  ensureRange: (from: string, to: string, options?: { force?: boolean }) => Promise<ResourcePlanItem[]>;
  createItem: (input: ResourcePlanItemInput) => Promise<ResourcePlanItem>;
  updateItem: (id: string, input: ResourcePlanItemInput) => Promise<ResourcePlanItem>;
  removeItem: (id: string) => Promise<void>;
  allItems: () => ResourcePlanItem[];
};

export const useResourcePlanStore = create<ResourcePlanStore>((set, get) => ({
  items: {},
  loadedRanges: [],
  loading: false,

  ensureRange: async (from, to, options) => {
    const force = options?.force ?? false;
    const key = rangeKey(from, to);
    if (get().loadedRanges.includes(key) && !force) {
      return get().allItems();
    }

    const inFlight = loadPromises.get(key);
    if (inFlight && !force) {
      await inFlight;
      return get().allItems();
    }

    set({ loading: true });
    const promise = fetchResourcePlanItemsInRange(from, to)
      .then((fetched) => {
        const nextItems = { ...get().items };
        fetched.forEach((item) => {
          nextItems[item.id] = item;
        });
        set({
          items: nextItems,
          loadedRanges: [...get().loadedRanges, key],
          loading: false,
        });
      })
      .finally(() => {
        loadPromises.delete(key);
      });

    loadPromises.set(key, promise);
    await promise;
    return get().allItems();
  },

  createItem: async (input) => {
    const created = await createResourcePlanItem(input);
    set({ items: { ...get().items, [created.id]: created } });
    return created;
  },

  updateItem: async (id, input) => {
    const updated = await updateResourcePlanItem(id, input);
    set({ items: { ...get().items, [id]: updated } });
    return updated;
  },

  removeItem: async (id) => {
    await deleteResourcePlanItem(id);
    const next = { ...get().items };
    delete next[id];
    set({ items: next });
  },

  allItems: () => memoizedAllItems(get().items),
}));
