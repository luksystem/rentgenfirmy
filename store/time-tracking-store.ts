"use client";

import { create } from "zustand";
import { hasFullAppAccess, type UserRole } from "@/lib/auth/types";
import { endOfWeekSunday, startOfWeekMonday, toDateInputValue } from "@/lib/time-tracking/format";
import type {
  CreateTimeEntryInput,
  TimeEntryFilters,
  TimeEntryView,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";
import {
  createTimeEntry,
  deleteTimeEntry,
  fetchTimeEntries,
  fetchTimeTrackingMeta,
  updateTimeEntry,
} from "@/lib/supabase/time-tracking-repository";

export type EnsureTimeEntriesOptions = {
  force?: boolean;
  showLoading?: boolean;
};

const today = new Date();
const defaultWeekStart = toDateInputValue(startOfWeekMonday(today));
const defaultWeekEnd = toDateInputValue(endOfWeekSunday(startOfWeekMonday(today)));

let metaPromise: Promise<TimeTrackingMeta> | null = null;
let entriesPromise: Promise<TimeEntryView[]> | null = null;
let entriesPromiseKey = "";

function buildEntriesKey(filters: TimeEntryFilters) {
  return JSON.stringify(filters);
}

type TimeTrackingStore = {
  meta: TimeTrackingMeta | null;
  metaHydrated: boolean;
  metaLoading: boolean;

  entries: TimeEntryView[];
  entriesHydrated: boolean;
  entriesLoading: boolean;
  filters: TimeEntryFilters;

  ensureMeta: (options?: EnsureTimeEntriesOptions) => Promise<TimeTrackingMeta>;
  ensureEntries: (options?: EnsureTimeEntriesOptions) => Promise<TimeEntryView[]>;
  setFilters: (patch: Partial<TimeEntryFilters>) => void;
  createEntry: (input: CreateTimeEntryInput) => Promise<TimeEntryView>;
  updateEntry: (id: string, input: UpdateTimeEntryInput) => Promise<TimeEntryView>;
  removeEntry: (id: string) => Promise<void>;
  invalidate: () => void;
};

export const useTimeTrackingStore = create<TimeTrackingStore>((set, get) => ({
  meta: null,
  metaHydrated: false,
  metaLoading: false,

  entries: [],
  entriesHydrated: false,
  entriesLoading: false,
  filters: {
    dateFrom: defaultWeekStart,
    dateTo: defaultWeekEnd,
  },

  ensureMeta: async (options = {}) => {
    const { force = false, showLoading = !get().metaHydrated } = options;
    if (!force && get().metaHydrated && get().meta) {
      return get().meta!;
    }
    if (!force && metaPromise) {
      return metaPromise;
    }

    if (showLoading) {
      set({ metaLoading: true });
    }

    metaPromise = fetchTimeTrackingMeta()
      .then((meta) => {
        set({ meta, metaHydrated: true, metaLoading: false });
        metaPromise = null;
        return meta;
      })
      .catch((error) => {
        set({ metaLoading: false });
        metaPromise = null;
        throw error;
      });

    return metaPromise;
  },

  ensureEntries: async (options = {}) => {
    const { force = false, showLoading = !get().entriesHydrated } = options;
    const filters = get().filters;
    const key = buildEntriesKey(filters);

    if (!force && get().entriesHydrated && entriesPromiseKey === key) {
      return get().entries;
    }
    if (!force && entriesPromise && entriesPromiseKey === key) {
      return entriesPromise;
    }

    if (showLoading) {
      set({ entriesLoading: true });
    }

    entriesPromiseKey = key;
    entriesPromise = fetchTimeEntries(filters)
      .then((entries) => {
        set({ entries, entriesHydrated: true, entriesLoading: false });
        entriesPromise = null;
        return entries;
      })
      .catch((error) => {
        set({ entriesLoading: false });
        entriesPromise = null;
        throw error;
      });

    return entriesPromise;
  },

  setFilters: (patch) => {
    set((state) => ({
      filters: { ...state.filters, ...patch },
      entriesHydrated: false,
    }));
  },

  createEntry: async (input) => {
    const entry = await createTimeEntry(input);
    set((state) => ({
      entries: [entry, ...state.entries.filter((item) => item.id !== entry.id)],
      entriesHydrated: true,
    }));
    return entry;
  },

  updateEntry: async (id, input) => {
    const entry = await updateTimeEntry(id, input);
    set((state) => ({
      entries: state.entries.map((item) => (item.id === id ? entry : item)),
    }));
    return entry;
  },

  removeEntry: async (id) => {
    await deleteTimeEntry(id);
    set((state) => ({
      entries: state.entries.filter((item) => item.id !== id),
    }));
  },

  invalidate: () => {
    metaPromise = null;
    entriesPromise = null;
    entriesPromiseKey = "";
    set({
      meta: null,
      metaHydrated: false,
      entries: [],
      entriesHydrated: false,
    });
  },
}));

export function useCanViewTeamTimeEntries(role: UserRole | undefined) {
  return role ? hasFullAppAccess(role) : false;
}
