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
import type {
  AcknowledgeWeekPlanInput,
  CreateWeekPlanInput,
  EndDayInput,
  ReportObstacleInput,
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
} from "@/lib/supabase/my-work-plans-repository";
import {
  addWorkItemComment,
  completeWorkItem,
  createWorkItem,
  deleteWorkItem,
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

export const EMPTY_WORK_ITEMS: WorkItemView[] = [];

let myItemsPromise: Promise<WorkItemView[]> | null = null;
let teamItemsPromise: Promise<WorkItemView[]> | null = null;
let dayContextPromise: Promise<WorkDayContext> | null = null;
let weekPlanPromise: Promise<WorkPlanView | null> | null = null;

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

  error: string | null;

  ensureMyItems: (options?: { force?: boolean }) => Promise<WorkItemView[]>;
  ensureTeamItems: (options?: { force?: boolean }) => Promise<WorkItemView[]>;
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
  ensureWeekPlan: (options?: { force?: boolean }) => Promise<WorkPlanView | null>;
  createWeekPlanForUser: (input: CreateWeekPlanInput) => Promise<WorkPlanView>;
  sendWeekPlanById: (planId: string) => Promise<WorkPlanView>;
  acknowledgeWeekPlanById: (planId: string, input: AcknowledgeWeekPlanInput) => Promise<WorkPlanView>;
  copyPreviousWeekPlan: (assignedUserId: string) => Promise<WorkPlanView>;
  reportObstacle: (input: ReportObstacleInput) => Promise<void>;
  requestTakeover: (id: string, comment?: string) => Promise<void>;
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

  error: null,

  ensureMyItems: async (options) => {
    const { myItemsHydrated, myItems } = get();
    if (myItemsHydrated && !options?.force && myItems.length >= 0) {
      if (!options?.force) {
        return myItems;
      }
    }

    if (!options?.force && myItemsPromise) {
      return myItemsPromise;
    }

    set({ myItemsLoading: true, error: null });
    myItemsPromise = fetchMyWorkItems({ scope: "my" })
      .then((items) => {
        set({ myItems: items, myItemsHydrated: true, myItemsLoading: false });
        return items;
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

    if (!options?.force && teamItemsPromise) {
      return teamItemsPromise;
    }

    set({ teamItemsLoading: true, error: null });
    teamItemsPromise = fetchMyWorkItems({ scope: "team" })
      .then((items) => {
        set({ teamItems: items, teamItemsHydrated: true, teamItemsLoading: false });
        return items;
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
    const { weekPlanHydrated, weekPlan } = get();
    if (weekPlanHydrated && !options?.force) {
      return weekPlan;
    }
    if (!options?.force && weekPlanPromise) {
      return weekPlanPromise;
    }

    set({ weekPlanLoading: true, error: null });
    weekPlanPromise = fetchCurrentWeekPlan()
      .then((plan) => {
        set({ weekPlan: plan, weekPlanHydrated: true, weekPlanLoading: false });
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
      });

    return weekPlanPromise;
  },

  createWeekPlanForUser: async (input) => {
    const plan = await createWeekPlan(input);
    set({ weekPlan: plan, weekPlanHydrated: true });
    return plan;
  },

  sendWeekPlanById: async (planId) => {
    const plan = await sendWeekPlan(planId);
    set({ weekPlan: plan, weekPlanHydrated: true });
    return plan;
  },

  acknowledgeWeekPlanById: async (planId, input) => {
    const plan = await acknowledgeWeekPlan(planId, input);
    set({ weekPlan: plan, weekPlanHydrated: true });
    return plan;
  },

  copyPreviousWeekPlan: async (assignedUserId) => {
    const plan = await copyWeekPlanFromPrevious(assignedUserId);
    set({ weekPlan: plan, weekPlanHydrated: true });
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
}));

export function useCanManageWorkItems(role: UserRole | undefined) {
  return hasFullAppAccess(role ?? "pracownik");
}
