"use client";

import { create } from "zustand";
import { hasFullAppAccess, type UserRole } from "@/lib/auth/types";
import { endOfWeekSunday, startOfWeekMonday, toDateInputValue } from "@/lib/time-tracking/format";
import { resolveTimesheetPeriod, type TimesheetPeriodRange } from "@/lib/time-tracking/timesheet-period";
import type { TimesheetSummary } from "@/lib/time-tracking/timesheet-summary";
import type { TeamPeriodDetail } from "@/lib/time-tracking/team-period-detail";
import type {
  AcceptPlanSuggestionsInput,
  ActiveTimerView,
  CreateTimeEntryInput,
  EnsureTimesheetInput,
  PlanTimeSuggestion,
  RejectTimesheetInput,
  StartTimerInput,
  StopTimerInput,
  SubmitTimesheetInput,
  TimeEntryFilters,
  TimeEntryLog,
  TimeEntryView,
  TimesheetFilters,
  TimesheetView,
  TeamTimesheetOverviewRow,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";
import {
  acceptPlanTimeSuggestions,
  approveTimesheet,
  cancelTimer,
  createTimeEntry,
  deleteTimeEntry,
  ensureTimesheet,
  fetchActiveTimer,
  fetchPlanTimeSuggestions,
  fetchTimeEntries,
  fetchTimeEntryLogs,
  fetchTeamPeriodDetail,
  fetchTeamTimesheetOverview,
  fetchTimesheetSummary,
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

const defaultPeriod = resolveTimesheetPeriod("week");

let metaPromise: Promise<TimeTrackingMeta> | null = null;
let entriesPromise: Promise<TimeEntryView[]> | null = null;
let entriesPromiseKey = "";
let timerPromise: Promise<ActiveTimerView | null> | null = null;
let timesheetPromise: Promise<TimesheetView | null> | null = null;
let timesheetPromiseKey = "";
let pendingTimesheetsPromise: Promise<TimesheetView[]> | null = null;
let summaryPromise: Promise<TimesheetSummary> | null = null;
let summaryPromiseKey = "";
let teamOverviewPromise: Promise<TeamTimesheetOverviewRow[]> | null = null;
let teamOverviewPromiseKey = "";
let teamPeriodDetailPromise: Promise<TeamPeriodDetail> | null = null;
let teamPeriodDetailPromiseKey = "";
let planSuggestionsPromise: Promise<PlanTimeSuggestion[]> | null = null;
let planSuggestionsPromiseKey = "";

function buildPlanSuggestionsKey(dateFrom: string, dateTo: string) {
  return `${dateFrom}|${dateTo}`;
}

function buildEntriesKey(filters: TimeEntryFilters) {
  return JSON.stringify(filters);
}

function buildSummaryKey(period: TimesheetPeriodRange, userId?: string) {
  return `${period.periodType}|${period.dateFrom}|${period.dateTo}|${userId ?? ""}`;
}

function buildTeamOverviewKey(period: TimesheetPeriodRange) {
  return `${period.periodType}|${period.dateFrom}|${period.dateTo}`;
}

type TimeTrackingStore = {
  meta: TimeTrackingMeta | null;
  metaHydrated: boolean;
  metaLoading: boolean;

  entries: TimeEntryView[];
  entriesHydrated: boolean;
  entriesLoading: boolean;
  filters: TimeEntryFilters;
  entriesPeriod: TimesheetPeriodRange;

  activeTimer: ActiveTimerView | null;
  timerHydrated: boolean;
  timerLoading: boolean;

  currentTimesheet: TimesheetView | null;
  timesheetHydrated: boolean;
  timesheetLoading: boolean;

  pendingTimesheets: TimesheetView[];
  pendingTimesheetsHydrated: boolean;
  pendingTimesheetsLoading: boolean;

  timesheetPeriod: TimesheetPeriodRange;
  timesheetUserId?: string;
  summary: TimesheetSummary | null;
  summaryHydrated: boolean;
  summaryLoading: boolean;
  teamOverview: TeamTimesheetOverviewRow[];
  teamOverviewHydrated: boolean;
  teamOverviewLoading: boolean;
  teamPeriodDetail: TeamPeriodDetail | null;
  teamPeriodDetailHydrated: boolean;
  teamPeriodDetailLoading: boolean;

  planSuggestions: PlanTimeSuggestion[];
  planSuggestionsHydrated: boolean;
  planSuggestionsLoading: boolean;

  ensureMeta: (options?: EnsureTimeEntriesOptions) => Promise<TimeTrackingMeta>;
  ensureEntries: (options?: EnsureTimeEntriesOptions) => Promise<TimeEntryView[]>;
  ensureTimer: (options?: EnsureTimeEntriesOptions) => Promise<ActiveTimerView | null>;
  ensureCurrentTimesheet: (options?: EnsureTimeEntriesOptions) => Promise<TimesheetView | null>;
  ensurePendingTimesheets: (options?: EnsureTimeEntriesOptions) => Promise<TimesheetView[]>;
  ensureTimesheetSummary: (options?: EnsureTimeEntriesOptions) => Promise<TimesheetSummary>;
  ensureTeamOverview: (options?: EnsureTimeEntriesOptions) => Promise<TeamTimesheetOverviewRow[]>;
  ensureTeamPeriodDetail: (options?: EnsureTimeEntriesOptions) => Promise<TeamPeriodDetail>;
  ensurePlanSuggestions: (options?: EnsureTimeEntriesOptions) => Promise<PlanTimeSuggestion[]>;
  acceptPlanSuggestions: (input: AcceptPlanSuggestionsInput) => Promise<TimeEntryView[]>;
  setTimesheetPeriod: (period: TimesheetPeriodRange) => void;
  setTimesheetUserId: (userId?: string) => void;
  setEntriesPeriod: (period: TimesheetPeriodRange) => void;
  submitSummaryTimesheet: (input?: SubmitTimesheetInput) => Promise<TimesheetView>;
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
  entriesPeriod: defaultPeriod,

  activeTimer: null,
  timerHydrated: false,
  timerLoading: false,

  currentTimesheet: null,
  timesheetHydrated: false,
  timesheetLoading: false,

  pendingTimesheets: [],
  pendingTimesheetsHydrated: false,
  pendingTimesheetsLoading: false,

  timesheetPeriod: defaultPeriod,
  timesheetUserId: undefined,
  summary: null,
  summaryHydrated: false,
  summaryLoading: false,
  teamOverview: [],
  teamOverviewHydrated: false,
  teamOverviewLoading: false,
  teamPeriodDetail: null,
  teamPeriodDetailHydrated: false,
  teamPeriodDetailLoading: false,

  planSuggestions: [],
  planSuggestionsHydrated: false,
  planSuggestionsLoading: false,

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
      periodType: get().entriesPeriod.periodType,
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
      periodType: get().entriesPeriod.periodType,
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

  ensureTimesheetSummary: async (options = {}) => {
    const { force = false, showLoading = !get().summaryHydrated } = options;
    const period = get().timesheetPeriod;
    const userId = get().timesheetUserId;
    const key = buildSummaryKey(period, userId);
    const ensureSheet = !userId;

    if (!force && get().summaryHydrated && summaryPromiseKey === key) {
      return get().summary!;
    }
    if (!force && summaryPromise && summaryPromiseKey === key) {
      return summaryPromise;
    }

    if (showLoading) {
      set({ summaryLoading: true });
    }

    summaryPromiseKey = key;
    summaryPromise = fetchTimesheetSummary(
      {
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        periodType: period.periodType,
        userId,
      },
      ensureSheet,
    )
      .then((summary) => {
        set({ summary, summaryHydrated: true, summaryLoading: false });
        summaryPromise = null;
        return summary;
      })
      .catch((error) => {
        set({ summaryLoading: false });
        summaryPromise = null;
        throw error;
      });

    return summaryPromise;
  },

  ensureTeamOverview: async (options = {}) => {
    const { force = false, showLoading = !get().teamOverviewHydrated } = options;
    const period = get().timesheetPeriod;
    const key = buildTeamOverviewKey(period);

    if (!force && get().teamOverviewHydrated && teamOverviewPromiseKey === key) {
      return get().teamOverview;
    }
    if (!force && teamOverviewPromise && teamOverviewPromiseKey === key) {
      return teamOverviewPromise;
    }

    if (showLoading) {
      set({ teamOverviewLoading: true });
    }

    teamOverviewPromiseKey = key;
    teamOverviewPromise = fetchTeamTimesheetOverview({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      periodType: period.periodType,
    })
      .then((rows) => {
        set({ teamOverview: rows, teamOverviewHydrated: true, teamOverviewLoading: false });
        teamOverviewPromise = null;
        return rows;
      })
      .catch((error) => {
        set({ teamOverviewLoading: false });
        teamOverviewPromise = null;
        throw error;
      });

    return teamOverviewPromise;
  },

  ensureTeamPeriodDetail: async (options = {}) => {
    const { force = false, showLoading = !get().teamPeriodDetailHydrated } = options;
    const period = get().timesheetPeriod;
    const key = buildTeamOverviewKey(period);

    if (!force && get().teamPeriodDetailHydrated && teamPeriodDetailPromiseKey === key) {
      return get().teamPeriodDetail!;
    }
    if (!force && teamPeriodDetailPromise && teamPeriodDetailPromiseKey === key) {
      return teamPeriodDetailPromise;
    }

    if (showLoading) {
      set({ teamPeriodDetailLoading: true });
    }

    teamPeriodDetailPromiseKey = key;
    teamPeriodDetailPromise = fetchTeamPeriodDetail({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      periodType: period.periodType,
    })
      .then((detail) => {
        set({ teamPeriodDetail: detail, teamPeriodDetailHydrated: true, teamPeriodDetailLoading: false });
        teamPeriodDetailPromise = null;
        return detail;
      })
      .catch((error) => {
        set({ teamPeriodDetailLoading: false });
        teamPeriodDetailPromise = null;
        throw error;
      });

    return teamPeriodDetailPromise;
  },

  ensurePlanSuggestions: async (options = {}) => {
    const { force = false, showLoading = !get().planSuggestionsHydrated } = options;
    const period = get().entriesPeriod;
    const key = buildPlanSuggestionsKey(period.dateFrom, period.dateTo);

    if (!force && get().planSuggestionsHydrated && planSuggestionsPromiseKey === key) {
      return get().planSuggestions;
    }
    if (!force && planSuggestionsPromise && planSuggestionsPromiseKey === key) {
      return planSuggestionsPromise;
    }

    if (showLoading) {
      set({ planSuggestionsLoading: true });
    }

    planSuggestionsPromiseKey = key;
    planSuggestionsPromise = fetchPlanTimeSuggestions({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
    })
      .then((suggestions) => {
        set({ planSuggestions: suggestions, planSuggestionsHydrated: true, planSuggestionsLoading: false });
        planSuggestionsPromise = null;
        return suggestions;
      })
      .catch((error) => {
        set({ planSuggestionsLoading: false });
        planSuggestionsPromise = null;
        throw error;
      });

    return planSuggestionsPromise;
  },

  acceptPlanSuggestions: async (input) => {
    const entries = await acceptPlanTimeSuggestions(input);
    set((state) => {
      const merged = [...entries, ...state.entries.filter((item) => !entries.some((entry) => entry.id === item.id))];
      return {
        entries: merged,
        entriesHydrated: true,
        planSuggestionsHydrated: false,
      };
    });
    await get().ensurePlanSuggestions({ force: true, showLoading: false });
    return entries;
  },

  setTimesheetPeriod: (period) => {
    set({
      timesheetPeriod: period,
      summaryHydrated: false,
      teamOverviewHydrated: false,
      teamPeriodDetailHydrated: false,
    });
  },

  setTimesheetUserId: (userId) => {
    set({
      timesheetUserId: userId,
      summaryHydrated: false,
    });
  },

  setEntriesPeriod: (period) => {
    set({
      entriesPeriod: period,
      filters: {
        ...get().filters,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
      },
      entriesHydrated: false,
      timesheetHydrated: false,
      pendingTimesheetsHydrated: false,
      planSuggestionsHydrated: false,
    });
  },

  submitSummaryTimesheet: async (input) => {
    const summary = get().summary;
    if (!summary?.timesheet) {
      throw new Error("Brak arkusza czasu dla wybranego okresu.");
    }
    const timesheet = await submitTimesheet(summary.timesheet.id, input);
    set({
      summary: { ...summary, timesheet },
      summaryHydrated: true,
    });
    await get().ensureTeamOverview({ force: true, showLoading: false });
    await get().ensureTeamPeriodDetail({ force: true, showLoading: false });
    return timesheet;
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
      summary:
        state.summary?.timesheet?.id === id
          ? { ...state.summary, timesheet }
          : state.summary,
    }));
    await get().ensureEntries({ force: true, showLoading: false });
    await get().ensureTeamOverview({ force: true, showLoading: false });
    await get().ensureTeamPeriodDetail({ force: true, showLoading: false });
    return timesheet;
  },

  rejectTimesheetById: async (id, input) => {
    const timesheet = await rejectTimesheet(id, input);
    set((state) => ({
      pendingTimesheets: state.pendingTimesheets.filter((item) => item.id !== id),
      currentTimesheet:
        state.currentTimesheet?.id === id ? timesheet : state.currentTimesheet,
      summary:
        state.summary?.timesheet?.id === id
          ? { ...state.summary, timesheet }
          : state.summary,
    }));
    await get().ensureEntries({ force: true, showLoading: false });
    await get().ensureTeamOverview({ force: true, showLoading: false });
    await get().ensureTeamPeriodDetail({ force: true, showLoading: false });
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
    summaryPromise = null;
    summaryPromiseKey = "";
    teamOverviewPromise = null;
    teamOverviewPromiseKey = "";
    teamPeriodDetailPromise = null;
    teamPeriodDetailPromiseKey = "";
    planSuggestionsPromise = null;
    planSuggestionsPromiseKey = "";
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
      summary: null,
      summaryHydrated: false,
      teamOverview: [],
      teamOverviewHydrated: false,
      teamPeriodDetail: null,
      teamPeriodDetailHydrated: false,
      planSuggestions: [],
      planSuggestionsHydrated: false,
    });
  },
}));

export function useCanViewTeamTimeEntries(role: UserRole | undefined) {
  return role ? hasFullAppAccess(role) : false;
}
