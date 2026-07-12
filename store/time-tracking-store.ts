"use client";

import { create } from "zustand";
import { hasFullAppAccess, type UserRole } from "@/lib/auth/types";
import { endOfWeekSunday, startOfWeekMonday, toDateInputValue } from "@/lib/time-tracking/format";
import type {
  ActiveTimerView,
  CreateTimeEntryInput,
  EnsureTimesheetInput,
  RejectTimesheetInput,
  StartTimerInput,
  StopTimerInput,
  SubmitTimesheetInput,
  TimeEntryFilters,
  TimeEntryLog,
  TimeEntryView,
  TimesheetFilters,
  TimesheetView,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";
import {
  approveTimesheet,
  cancelTimer,
  createTimeEntry,
  deleteTimeEntry,
  ensureTimesheet,
  fetchActiveTimer,
  fetchTimeEntries,
  fetchTimeEntryLogs,
  fetchTimesheets,
  fetchTimeTrackingMeta,
  pauseTimer,
  rejectTimesheet,
  resumeTimer,
  startTimer,
  stopTimer,
  submitTimesheet,
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
let timesheetPromise: Promise<TimesheetView | null> | null = null;
let timesheetPromiseKey = "";
let pendingTimesheetsPromise: Promise<TimesheetView[]> | null = null;

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

  currentTimesheet: TimesheetView | null;
  timesheetHydrated: boolean;
  timesheetLoading: boolean;

  pendingTimesheets: TimesheetView[];
  pendingTimesheetsHydrated: boolean;
  pendingTimesheetsLoading: boolean;

  ensureMeta: (options?: EnsureTimeEntriesOptions) => Promise<TimeTrackingMeta>;
  ensureEntries: (options?: EnsureTimeEntriesOptions) => Promise<TimeEntryView[]>;
  ensureTimer: (options?: EnsureTimeEntriesOptions) => Promise<ActiveTimerView | null>;
  ensureCurrentTimesheet: (options?: EnsureTimeEntriesOptions) => Promise<TimesheetView | null>;
  ensurePendingTimesheets: (options?: EnsureTimeEntriesOptions) => Promise<TimesheetView[]>;
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
  submitCurrentTimesheet: (input?: SubmitTimesheetInput) => Promise<TimesheetView>;
  approveTimesheetById: (id: string) => Promise<TimesheetView>;
  rejectTimesheetById: (id: string, input: RejectTimesheetInput) => Promise<TimesheetView>;
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

  currentTimesheet: null,
  timesheetHydrated: false,
  timesheetLoading: false,

  pendingTimesheets: [],
  pendingTimesheetsHydrated: false,
  pendingTimesheetsLoading: false,

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

  ensureCurrentTimesheet: async (options = {}) => {
    const { force = false, showLoading = !get().timesheetHydrated } = options;
    const filters = get().filters;
    if (!filters.dateFrom || !filters.dateTo) {
      return null;
    }

    const key = `${filters.dateFrom}|${filters.dateTo}`;
    if (!force && get().timesheetHydrated && timesheetPromiseKey === key) {
      return get().currentTimesheet;
    }
    if (!force && timesheetPromise && timesheetPromiseKey === key) {
      return timesheetPromise;
    }

    if (showLoading) {
      set({ timesheetLoading: true });
    }

    timesheetPromiseKey = key;
    const input: EnsureTimesheetInput = {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      periodType: "week",
    };

    timesheetPromise = ensureTimesheet(input)
      .then((timesheet) => {
        set({ currentTimesheet: timesheet, timesheetHydrated: true, timesheetLoading: false });
        timesheetPromise = null;
        return timesheet;
      })
      .catch((error) => {
        set({ timesheetLoading: false });
        timesheetPromise = null;
        throw error;
      });

    return timesheetPromise;
  },

  ensurePendingTimesheets: async (options = {}) => {
    const { force = false, showLoading = !get().pendingTimesheetsHydrated } = options;
    if (!force && get().pendingTimesheetsHydrated) {
      return get().pendingTimesheets;
    }
    if (!force && pendingTimesheetsPromise) {
      return pendingTimesheetsPromise;
    }

    if (showLoading) {
      set({ pendingTimesheetsLoading: true });
    }

    const filters = get().filters;
    pendingTimesheetsPromise = fetchTimesheets({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      status: "submitted",
      periodType: "week",
    })
      .then((timesheets) => {
        set({
          pendingTimesheets: timesheets,
          pendingTimesheetsHydrated: true,
          pendingTimesheetsLoading: false,
        });
        pendingTimesheetsPromise = null;
        return timesheets;
      })
      .catch((error) => {
        set({ pendingTimesheetsLoading: false });
        pendingTimesheetsPromise = null;
        throw error;
      });

    return pendingTimesheetsPromise;
  },

  setFilters: (patch) => {
    set((state) => ({
      filters: { ...state.filters, ...patch },
      entriesHydrated: false,
      timesheetHydrated: false,
      pendingTimesheetsHydrated: false,
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

  submitCurrentTimesheet: async (input) => {
    const sheet = get().currentTimesheet;
    if (!sheet) {
      throw new Error("Brak arkusza czasu dla wybranego tygodnia.");
    }
    const timesheet = await submitTimesheet(sheet.id, input);
    set({ currentTimesheet: timesheet, timesheetHydrated: true });
    await get().ensureEntries({ force: true, showLoading: false });
    await get().ensurePendingTimesheets({ force: true, showLoading: false });
    return timesheet;
  },

  approveTimesheetById: async (id) => {
    const timesheet = await approveTimesheet(id);
    set((state) => ({
      pendingTimesheets: state.pendingTimesheets.filter((item) => item.id !== id),
      currentTimesheet:
        state.currentTimesheet?.id === id ? timesheet : state.currentTimesheet,
    }));
    await get().ensureEntries({ force: true, showLoading: false });
    return timesheet;
  },

  rejectTimesheetById: async (id, input) => {
    const timesheet = await rejectTimesheet(id, input);
    set((state) => ({
      pendingTimesheets: state.pendingTimesheets.filter((item) => item.id !== id),
      currentTimesheet:
        state.currentTimesheet?.id === id ? timesheet : state.currentTimesheet,
    }));
    await get().ensureEntries({ force: true, showLoading: false });
    return timesheet;
  },

  invalidate: () => {
    metaPromise = null;
    entriesPromise = null;
    entriesPromiseKey = "";
    timerPromise = null;
    timesheetPromise = null;
    timesheetPromiseKey = "";
    pendingTimesheetsPromise = null;
    set({
      meta: null,
      metaHydrated: false,
      entries: [],
      entriesHydrated: false,
      activeTimer: null,
      timerHydrated: false,
      currentTimesheet: null,
      timesheetHydrated: false,
      pendingTimesheets: [],
      pendingTimesheetsHydrated: false,
    });
  },
}));

export function useCanViewTeamTimeEntries(role: UserRole | undefined) {
  return role ? hasFullAppAccess(role) : false;
}
