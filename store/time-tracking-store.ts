"use client";

import { create } from "zustand";
import { hasFullAppAccess, type UserRole } from "@/lib/auth/types";
import { endOfWeekSunday, startOfWeekMonday, toDateInputValue } from "@/lib/time-tracking/format";
import type {
  ActiveTimerView,
  CreateTimeEntryInput,
  StartTimerInput,
  StopTimerInput,
  TimeEntryFilters,
  TimeEntryLog,
  TimeEntryView,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";
import {
  cancelTimer,
  createTimeEntry,
  deleteTimeEntry,
  fetchActiveTimer,
  fetchTimeEntries,
  fetchTimeEntryLogs,
  fetchTimeTrackingMeta,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
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
let timerPromise: Promise<ActiveTimerView | null> | null = null;

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

  activeTimer: ActiveTimerView | null;
  timerHydrated: boolean;
  timerLoading: boolean;

  ensureMeta: (options?: EnsureTimeEntriesOptions) => Promise<TimeTrackingMeta>;
  ensureEntries: (options?: EnsureTimeEntriesOptions) => Promise<TimeEntryView[]>;
  ensureTimer: (options?: EnsureTimeEntriesOptions) => Promise<ActiveTimerView | null>;
  setFilters: (patch: Partial<TimeEntryFilters>) => void;
  createEntry: (input: CreateTimeEntryInput) => Promise<TimeEntryView>;
  updateEntry: (id: string, input: UpdateTimeEntryInput) => Promise<TimeEntryView>;
  removeEntry: (id: string) => Promise<void>;
  startActiveTimer: (input: StartTimerInput) => Promise<ActiveTimerView>;
  pauseActiveTimer: () => Promise<ActiveTimerView>;
  resumeActiveTimer: () => Promise<ActiveTimerView>;
  stopActiveTimer: (input?: StopTimerInput) => Promise<TimeEntryView>;
  cancelActiveTimer: () => Promise<void>;
  fetchEntryLogs: (entryId: string) => Promise<TimeEntryLog[]>;
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

  activeTimer: null,
  timerHydrated: false,
  timerLoading: false,

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

  ensureTimer: async (options = {}) => {
    const { force = false, showLoading = !get().timerHydrated } = options;
    if (!force && get().timerHydrated) {
      return get().activeTimer;
    }
    if (!force && timerPromise) {
      return timerPromise;
    }

    if (showLoading) {
      set({ timerLoading: true });
    }

    timerPromise = fetchActiveTimer()
      .then((timer) => {
        set({ activeTimer: timer, timerHydrated: true, timerLoading: false });
        timerPromise = null;
        return timer;
      })
      .catch((error) => {
        set({ timerLoading: false });
        timerPromise = null;
        throw error;
      });

    return timerPromise;
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

  startActiveTimer: async (input) => {
    const timer = await startTimer(input);
    set({ activeTimer: timer, timerHydrated: true });
    return timer;
  },

  pauseActiveTimer: async () => {
    const timer = await pauseTimer();
    set({ activeTimer: timer, timerHydrated: true });
    return timer;
  },

  resumeActiveTimer: async () => {
    const timer = await resumeTimer();
    set({ activeTimer: timer, timerHydrated: true });
    return timer;
  },

  stopActiveTimer: async (input) => {
    const entry = await stopTimer(input);
    set((state) => ({
      activeTimer: null,
      timerHydrated: true,
      entries: [entry, ...state.entries.filter((item) => item.id !== entry.id)],
      entriesHydrated: true,
    }));
    return entry;
  },

  cancelActiveTimer: async () => {
    await cancelTimer();
    set({ activeTimer: null, timerHydrated: true });
  },

  fetchEntryLogs: async (entryId) => fetchTimeEntryLogs(entryId),

  invalidate: () => {
    metaPromise = null;
    entriesPromise = null;
    entriesPromiseKey = "";
    timerPromise = null;
    set({
      meta: null,
      metaHydrated: false,
      entries: [],
      entriesHydrated: false,
      activeTimer: null,
      timerHydrated: false,
    });
  },
}));

export function useCanViewTeamTimeEntries(role: UserRole | undefined) {
  return role ? hasFullAppAccess(role) : false;
}
