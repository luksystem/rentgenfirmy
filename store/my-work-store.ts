"use client";

import { create } from "zustand";
import { hasFullAppAccess, type UserProfile, type UserRole } from "@/lib/auth/types";
import type {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemAcceptanceInput,
  WorkItemCompleteInput,
  WorkItemDetail,
  WorkItemFilters,
  WorkItemView,
} from "@/lib/my-work/types";
import type { WorkDashboardMetrics } from "@/lib/my-work/dashboard-metrics";
import { currentWeekMonday } from "@/lib/my-work/week-range";
import type {
  AcknowledgeWeekPlanInput,
  CreateWeekPlanInput,
  EndDayInput,
  ReportObstacleInput,
  UpdateWeekPlanInput,
  WorkDayContext,
  WorkPlanView,
} from "@/lib/my-work/plan-types";
import {
  acknowledgeWeekPlan,
  copyWeekPlanFromPrevious,
  createWeekPlan,
  endDaySession,
  fetchCurrentWeekPlan,
  fetchDayContext,
  reportObstacle,
  sendWeekPlan,
  startDaySession,
  updateWeekPlan,
} from "@/lib/supabase/my-work-plans-repository";
import {
  addWorkItemComment,
  completeWorkItem,
  createWorkItem,
  deleteWorkItem,
  fetchMyWorkDashboardMetrics,
  fetchMyWorkItems,
  fetchWorkItemDetail,
  recordWorkItemAcceptance,
  sendWorkItem,
  startWorkItem,
  updateWorkItem,
  updateWorkItemStatus,
  verifyWorkItem,
  requestWorkItemTakeover,
} from "@/lib/supabase/my-work-repository";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { sortWorkItemsStable } from "@/lib/my-work/sort-work-items";

export type EnsureMyWorkItemsOptions = {
  force?: boolean;
  /** Domyślnie true tylko przy pierwszym ładowaniu; false = odświeżenie w tle bez spinnera. */
  showLoading?: boolean;
  /** Domyślnie true; ustaw false przy pollingu, żeby nie uruchamiać pełnego sync co 10 s. */
  sync?: boolean;
};

export const EMPTY_WORK_ITEMS: WorkItemView[] = [];

let myItemsPromise: Promise<WorkItemView[]> | null = null;
let teamItemsPromise: Promise<WorkItemView[]> | null = null;
let dayContextPromise: Promise<WorkDayContext> | null = null;
let weekPlanPromise: Promise<WorkPlanView | null> | null = null;
let weekPlanPromiseKey: string | null = null;
let dashboardPromise: Promise<WorkDashboardMetrics> | null = null;

type MyWorkStore = {
  myItems: WorkItemView[];
  myItemsHydrated: boolean;
  myItemsLoading: boolean;

  teamItems: WorkItemView[];
  teamItemsHydrated: boolean;
  teamItemsLoading: boolean;

  teamProfiles: UserProfile[];
  filters: WorkItemFilters;
  viewMode: "list" | "kanban";
  selectedItemId: string | null;
  selectedDetail: WorkItemDetail | null;
  detailLoading: boolean;

  dayContext: WorkDayContext | null;
  dayContextHydrated: boolean;
  dayContextLoading: boolean;

  weekPlan: WorkPlanView | null;
  weekPlanHydrated: boolean;
  weekPlanLoading: boolean;
  weekPlanForUserId: string | null;
  weekPlanReferenceDate: string | null;

  dashboardMetrics: WorkDashboardMetrics | null;
  dashboardHydrated: boolean;
  dashboardLoading: boolean;

  error: string | null;

  ensureMyItems: (options?: EnsureMyWorkItemsOptions) => Promise<WorkItemView[]>;
  ensureTeamItems: (options?: EnsureMyWorkItemsOptions) => Promise<WorkItemView[]>;
  loadTeamProfiles: () => Promise<UserProfile[]>;
  setFilters: (filters: Partial<WorkItemFilters>) => void;
  setViewMode: (mode: "list" | "kanban") => void;
  selectItem: (id: string | null) => Promise<WorkItemDetail | null>;
  upsertItem: (item: WorkItemView) => void;
  replaceFromDetail: (detail: WorkItemDetail) => void;
  createItem: (input: CreateWorkItemInput) => Promise<WorkItemView>;
  sendItem: (id: string) => Promise<void>;
  acceptItem: (id: string, input: WorkItemAcceptanceInput) => Promise<void>;
  completeItem: (id: string, input: WorkItemCompleteInput) => Promise<void>;
  verifyItem: (id: string) => Promise<void>;
  startItem: (id: string) => Promise<void>;
  moveItemStatus: (id: string, status: string) => Promise<void>;
  commentOnItem: (id: string, body: string) => Promise<void>;
  updateItem: (id: string, input: UpdateWorkItemInput) => Promise<void>;
  deleteItem: (id: string, options?: { hard?: boolean }) => Promise<void>;
  removeItem: (id: string) => void;

  ensureDayContext: (options?: { force?: boolean; sessionDate?: string }) => Promise<WorkDayContext>;
  startDay: () => Promise<WorkDayContext>;
  endDay: (input: EndDayInput) => Promise<WorkDayContext>;
  ensureWeekPlan: (options?: {
    force?: boolean;
    assignedUserId?: string | null;
    referenceDate?: string | null;
  }) => Promise<WorkPlanView | null>;
  createWeekPlanForUser: (input: CreateWeekPlanInput) => Promise<WorkPlanView>;
  sendWeekPlanById: (planId: string) => Promise<WorkPlanView>;
  acknowledgeWeekPlanById: (planId: string, input: AcknowledgeWeekPlanInput) => Promise<WorkPlanView>;
  copyPreviousWeekPlan: (assignedUserId: string, referenceDate?: string | null) => Promise<WorkPlanView>;
  updateWeekPlanById: (planId: string, input: UpdateWeekPlanInput) => Promise<WorkPlanView>;
  reportObstacle: (input: ReportObstacleInput) => Promise<void>;
  requestTakeover: (id: string, comment?: string) => Promise<void>;
  ensureDashboardMetrics: (options?: { force?: boolean }) => Promise<WorkDashboardMetrics>;
};

export const useMyWorkStore = create<MyWorkStore>((set, get) => ({
  myItems: EMPTY_WORK_ITEMS,
  myItemsHydrated: false,
  myItemsLoading: false,

  teamItems: EMPTY_WORK_ITEMS,
  teamItemsHydrated: false,
  teamItemsLoading: false,

  teamProfiles: [],
  filters: {},
  viewMode: "list",
  selectedItemId: null,
  selectedDetail: null,
  detailLoading: false,

  dayContext: null,
  dayContextHydrated: false,
  dayContextLoading: false,

  weekPlan: null,
  weekPlanHydrated: false,
  weekPlanLoading: false,
  weekPlanForUserId: null,
  weekPlanReferenceDate: null,

  dashboardMetrics: null,
  dashboardHydrated: false,
  dashboardLoading: false,

  error: null,

  ensureMyItems: async (options) => {
    const { myItemsHydrated, myItems } = get();
    if (myItemsHydrated && !options?.force) {
      return myItems;
    }

    const showLoading = options?.showLoading ?? !myItemsHydrated;
    const sync = options?.sync ?? true;

    if (!options?.force && myItemsPromise) {
      return myItemsPromise;
    }
    if (options?.force && !showLoading && myItemsPromise) {
      return myItemsPromise;
    }

    if (showLoading) {
      set({ myItemsLoading: true, error: null });
    }

    myItemsPromise = fetchMyWorkItems({ scope: "my", sync })
      .then((items) => {
        const sorted = sortWorkItemsStable(items);
        set({
          myItems: sorted,
          myItemsHydrated: true,
          myItemsLoading: false,
        });
        return sorted;
      })
      .catch((error: unknown) => {
        set({
          error: error instanceof Error ? error.message : "Błąd wczytywania zadań.",
          myItemsLoading: false,
        });
        throw error;
      })
      .finally(() => {
        myItemsPromise = null;
      });

    return myItemsPromise;
  },

  ensureTeamItems: async (options) => {
    const { teamItemsHydrated, teamItems } = get();
    if (teamItemsHydrated && !options?.force) {
      return teamItems;
    }

    const showLoading = options?.showLoading ?? !teamItemsHydrated;
    const sync = options?.sync ?? true;

    if (!options?.force && teamItemsPromise) {
      return teamItemsPromise;
    }
    if (options?.force && !showLoading && teamItemsPromise) {
      return teamItemsPromise;
    }

    if (showLoading) {
      set({ teamItemsLoading: true, error: null });
    }

    teamItemsPromise = fetchMyWorkItems({ scope: "team", sync })
      .then((items) => {
        const sorted = sortWorkItemsStable(items);
        set({
          teamItems: sorted,
          teamItemsHydrated: true,
          teamItemsLoading: false,
        });
        return sorted;
      })
      .catch((error: unknown) => {
        set({
          error: error instanceof Error ? error.message : "Błąd wczytywania zadań zespołu.",
          teamItemsLoading: false,
        });
        throw error;
      })
      .finally(() => {
        teamItemsPromise = null;
      });

    return teamItemsPromise;
  },

  loadTeamProfiles: async () => {
    const cached = get().teamProfiles;
    if (cached.length) {
      return cached;
    }
    const profiles = await fetchTeamProfiles();
    set({ teamProfiles: profiles });
    return profiles;
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  selectItem: async (id) => {
    if (!id) {
      set({ selectedItemId: null, selectedDetail: null });
      return null;
    }
    set({ selectedItemId: id, detailLoading: true });
    try {
      const detail = await fetchWorkItemDetail(id);
      set({ selectedDetail: detail, detailLoading: false });
      get().replaceFromDetail(detail);
      return detail;
    } catch (error) {
      set({
        detailLoading: false,
        error: error instanceof Error ? error.message : "Błąd wczytywania szczegółów.",
      });
      return null;
    }
  },

  upsertItem: (item) => {
    set((state) => ({
      myItems: state.myItems.some((entry) => entry.id === item.id)
        ? state.myItems.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...state.myItems],
      teamItems: state.teamItems.some((entry) => entry.id === item.id)
        ? state.teamItems.map((entry) => (entry.id === item.id ? item : entry))
        : state.teamItems,
    }));
  },

  replaceFromDetail: (detail) => {
    get().upsertItem(detail.item);
    set({ selectedDetail: detail });
  },

  createItem: async (input) => {
    const item = await createWorkItem(input);
    get().upsertItem(item);
    return item;
  },

  sendItem: async (id) => {
    const detail = await sendWorkItem(id);
    get().replaceFromDetail(detail);
  },

  acceptItem: async (id, input) => {
    const detail = await recordWorkItemAcceptance(id, input);
    get().replaceFromDetail(detail);
  },

  completeItem: async (id, input) => {
    const detail = await completeWorkItem(id, input);
    get().replaceFromDetail(detail);
  },

  verifyItem: async (id) => {
    const detail = await verifyWorkItem(id);
    get().replaceFromDetail(detail);
  },

  startItem: async (id) => {
    const detail = await startWorkItem(id);
    get().replaceFromDetail(detail);
  },

  moveItemStatus: async (id, status) => {
    const detail = await updateWorkItemStatus(id, status);
    get().replaceFromDetail(detail);
  },

  commentOnItem: async (id, body) => {
    const detail = await addWorkItemComment(id, body);
    get().replaceFromDetail(detail);
  },

  updateItem: async (id, input) => {
    const detail = await updateWorkItem(id, input);
    get().replaceFromDetail(detail);
  },

  deleteItem: async (id, options) => {
    await deleteWorkItem(id, options);
    get().removeItem(id);
    if (get().selectedItemId === id) {
      set({ selectedItemId: null, selectedDetail: null });
    }
  },

  removeItem: (id) => {
    set((state) => ({
      myItems: state.myItems.filter((entry) => entry.id !== id),
      teamItems: state.teamItems.filter((entry) => entry.id !== id),
    }));
  },

  ensureDayContext: async (options) => {
    const { dayContextHydrated, dayContext } = get();
    if (dayContextHydrated && !options?.force) {
      return dayContext!;
    }
    if (!options?.force && dayContextPromise) {
      return dayContextPromise;
    }

    set({ dayContextLoading: true, error: null });
    dayContextPromise = fetchDayContext(options?.sessionDate)
      .then((context) => {
        set({ dayContext: context, dayContextHydrated: true, dayContextLoading: false });
        return context;
      })
      .catch((error: unknown) => {
        set({
          error: error instanceof Error ? error.message : "Błąd wczytywania kontekstu dnia.",
          dayContextLoading: false,
        });
        throw error;
      })
      .finally(() => {
        dayContextPromise = null;
      });

    return dayContextPromise;
  },

  startDay: async () => {
    const context = await startDaySession({ confirmPlan: true });
    set({ dayContext: context, dayContextHydrated: true });
    await get().ensureMyItems({ force: true });
    return context;
  },

  endDay: async (input) => {
    const context = await endDaySession(input);
    set({ dayContext: context, dayContextHydrated: true });
    await get().ensureMyItems({ force: true });
    return context;
  },

  ensureWeekPlan: async (options) => {
    const targetUserId = options?.assignedUserId ?? null;
    const referenceDate = options?.referenceDate ?? get().weekPlanReferenceDate ?? currentWeekMonday();
    const promiseKey = `${targetUserId ?? "self"}:${referenceDate}`;
    const { weekPlanHydrated, weekPlan, weekPlanForUserId, weekPlanReferenceDate: cachedWeek } = get();
    const sameUser = weekPlanForUserId === targetUserId;
    const sameWeek = cachedWeek === referenceDate;
    if (weekPlanHydrated && sameUser && sameWeek && !options?.force) {
      return weekPlan;
    }
    if (!options?.force && weekPlanPromise && weekPlanPromiseKey === promiseKey) {
      return weekPlanPromise;
    }

    set({ weekPlanLoading: true, error: null });
    weekPlanPromiseKey = promiseKey;
    weekPlanPromise = fetchCurrentWeekPlan(targetUserId, referenceDate)
      .then((plan) => {
        set({
          weekPlan: plan,
          weekPlanHydrated: true,
          weekPlanLoading: false,
          weekPlanForUserId: targetUserId,
          weekPlanReferenceDate: referenceDate,
        });
        return plan;
      })
      .catch((error: unknown) => {
        set({
          error: error instanceof Error ? error.message : "Błąd wczytywania planu tygodnia.",
          weekPlanLoading: false,
        });
        throw error;
      })
      .finally(() => {
        weekPlanPromise = null;
        weekPlanPromiseKey = null;
      });

    return weekPlanPromise;
  },

  createWeekPlanForUser: async (input) => {
    const plan = await createWeekPlan(input);
    set({
      weekPlan: plan,
      weekPlanHydrated: true,
      weekPlanForUserId: input.assignedUserId,
      weekPlanReferenceDate: input.dateFrom,
    });
    return plan;
  },

  sendWeekPlanById: async (planId) => {
    const plan = await sendWeekPlan(planId);
    set({
      weekPlan: plan,
      weekPlanHydrated: true,
      weekPlanForUserId: plan.assignedUserId,
      weekPlanReferenceDate: plan.dateFrom,
    });
    return plan;
  },

  acknowledgeWeekPlanById: async (planId, input) => {
    const plan = await acknowledgeWeekPlan(planId, input);
    set({
      weekPlan: plan,
      weekPlanHydrated: true,
      weekPlanForUserId: plan.assignedUserId,
      weekPlanReferenceDate: plan.dateFrom,
    });
    return plan;
  },

  copyPreviousWeekPlan: async (assignedUserId, referenceDate) => {
    const plan = await copyWeekPlanFromPrevious(assignedUserId, referenceDate);
    set({
      weekPlan: plan,
      weekPlanHydrated: true,
      weekPlanForUserId: assignedUserId,
      weekPlanReferenceDate: plan.dateFrom,
    });
    return plan;
  },

  updateWeekPlanById: async (planId, input) => {
    const plan = await updateWeekPlan(planId, input);
    set({
      weekPlan: plan,
      weekPlanHydrated: true,
      weekPlanForUserId: plan.assignedUserId,
      weekPlanReferenceDate: plan.dateFrom,
    });
    return plan;
  },

  reportObstacle: async (input) => {
    await reportObstacle(input);
    await get().ensureMyItems({ force: true });
  },

  requestTakeover: async (id, comment) => {
    const detail = await requestWorkItemTakeover(id, comment);
    get().replaceFromDetail(detail);
  },

  ensureDashboardMetrics: async (options) => {
    const { dashboardHydrated, dashboardMetrics } = get();
    if (dashboardHydrated && dashboardMetrics && !options?.force) {
      return dashboardMetrics;
    }
    if (!options?.force && dashboardPromise) {
      return dashboardPromise;
    }

    set({ dashboardLoading: true, error: null });
    dashboardPromise = fetchMyWorkDashboardMetrics()
      .then((metrics) => {
        set({
          dashboardMetrics: metrics,
          dashboardHydrated: true,
          dashboardLoading: false,
          error: null,
        });
        return metrics;
      })
      .catch((error: unknown) => {
        set({
          dashboardLoading: false,
          error: error instanceof Error ? error.message : "Błąd pulpitu managera.",
        });
        throw error;
      })
      .finally(() => {
        dashboardPromise = null;
      });

    return dashboardPromise;
  },
}));

export function useCanManageWorkItems(role: UserRole | undefined) {
  return hasFullAppAccess(role ?? "pracownik");
}
