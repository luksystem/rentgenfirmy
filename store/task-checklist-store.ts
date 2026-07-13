"use client";

import { create } from "zustand";
import type { TaskChecklistItem, TaskChecklistParent } from "@/lib/task-checklist/types";
import {
  createTaskChecklistItem,
  deleteTaskChecklistItem,
  fetchTaskChecklistItems,
  updateTaskChecklistItem,
} from "@/lib/supabase/task-checklist-repository";

const loadPromises = new Map<string, Promise<TaskChecklistItem[]>>();

export function taskChecklistParentKey(parent: TaskChecklistParent) {
  return `${parent.kind}:${parent.id}`;
}

type EnsureTaskChecklistOptions = {
  force?: boolean;
  /** Domyślnie true tylko przy pierwszym ładowaniu rodzica; false = odświeżenie w tle. */
  showLoading?: boolean;
};

type TaskChecklistStore = {
  itemsByKey: Record<string, TaskChecklistItem[]>;
  hydratedKeys: string[];
  loadingKeys: Record<string, boolean>;
  ensureItems: (parent: TaskChecklistParent, options?: EnsureTaskChecklistOptions) => Promise<TaskChecklistItem[]>;
  itemsFor: (parent: TaskChecklistParent | null) => TaskChecklistItem[];
  isLoadingFor: (parent: TaskChecklistParent | null) => boolean;
  addItem: (parent: TaskChecklistParent, item: TaskChecklistItem) => void;
  replaceItem: (parent: TaskChecklistParent, item: TaskChecklistItem) => void;
  removeItem: (parent: TaskChecklistParent, itemId: string) => void;
};

export const useTaskChecklistStore = create<TaskChecklistStore>((set, get) => ({
  itemsByKey: {},
  hydratedKeys: [],
  loadingKeys: {},

  itemsFor: (parent) => {
    if (!parent) {
      return [];
    }
    return get().itemsByKey[taskChecklistParentKey(parent)] ?? [];
  },

  isLoadingFor: (parent) => {
    if (!parent) {
      return false;
    }
    const key = taskChecklistParentKey(parent);
    const hydrated = get().hydratedKeys.includes(key);
    return Boolean(get().loadingKeys[key]) && !hydrated;
  },

  ensureItems: async (parent, options) => {
    const key = taskChecklistParentKey(parent);
    const hydrated = get().hydratedKeys.includes(key);
    if (hydrated && !options?.force) {
      return get().itemsByKey[key] ?? [];
    }

    const showLoading = options?.showLoading ?? !hydrated;
    const inFlight = loadPromises.get(key);
    if (inFlight && !options?.force) {
      return inFlight;
    }
    if (options?.force && !showLoading && inFlight) {
      return inFlight;
    }

    if (showLoading) {
      set((state) => ({
        loadingKeys: { ...state.loadingKeys, [key]: true },
      }));
    }

    const promise = fetchTaskChecklistItems(parent)
      .then((items) => {
        set((state) => ({
          itemsByKey: { ...state.itemsByKey, [key]: items },
          hydratedKeys: state.hydratedKeys.includes(key) ? state.hydratedKeys : [...state.hydratedKeys, key],
          loadingKeys: { ...state.loadingKeys, [key]: false },
        }));
        return items;
      })
      .catch((error) => {
        set((state) => ({
          loadingKeys: { ...state.loadingKeys, [key]: false },
        }));
        throw error;
      })
      .finally(() => {
        loadPromises.delete(key);
      });

    loadPromises.set(key, promise);
    return promise;
  },

  addItem: (parent, item) => {
    const key = taskChecklistParentKey(parent);
    set((state) => ({
      itemsByKey: {
        ...state.itemsByKey,
        [key]: [...(state.itemsByKey[key] ?? []), item],
      },
      hydratedKeys: state.hydratedKeys.includes(key) ? state.hydratedKeys : [...state.hydratedKeys, key],
    }));
  },

  replaceItem: (parent, item) => {
    const key = taskChecklistParentKey(parent);
    set((state) => ({
      itemsByKey: {
        ...state.itemsByKey,
        [key]: (state.itemsByKey[key] ?? []).map((entry) => (entry.id === item.id ? item : entry)),
      },
    }));
  },

  removeItem: (parent, itemId) => {
    const key = taskChecklistParentKey(parent);
    set((state) => ({
      itemsByKey: {
        ...state.itemsByKey,
        [key]: (state.itemsByKey[key] ?? []).filter((entry) => entry.id !== itemId),
      },
    }));
  },
}));

export async function createTaskChecklistItemCached(
  parent: TaskChecklistParent,
  title: string,
): Promise<TaskChecklistItem> {
  const item = await createTaskChecklistItem({ parent, title });
  useTaskChecklistStore.getState().addItem(parent, item);
  return item;
}

export async function updateTaskChecklistItemCached(
  parent: TaskChecklistParent,
  id: string,
  input: Parameters<typeof updateTaskChecklistItem>[1],
): Promise<TaskChecklistItem> {
  const item = await updateTaskChecklistItem(id, input);
  useTaskChecklistStore.getState().replaceItem(parent, item);
  return item;
}

export async function deleteTaskChecklistItemCached(
  parent: TaskChecklistParent,
  id: string,
): Promise<void> {
  await deleteTaskChecklistItem(id);
  useTaskChecklistStore.getState().removeItem(parent, id);
}
