"use client";

import { create } from "zustand";
import { hasFullAppAccess, type UserProfile, type UserRole } from "@/lib/auth/types";
import type {
  CreateWorkItemInput,
  WorkItemAcceptanceInput,
  WorkItemCompleteInput,
  WorkItemDetail,
  WorkItemFilters,
  WorkItemView,
} from "@/lib/my-work/types";
import {
  addWorkItemComment,
  completeWorkItem,
  createWorkItem,
  fetchMyWorkItems,
  fetchWorkItemDetail,
  recordWorkItemAcceptance,
  sendWorkItem,
  startWorkItem,
  updateWorkItemStatus,
  verifyWorkItem,
} from "@/lib/supabase/my-work-repository";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";

export const EMPTY_WORK_ITEMS: WorkItemView[] = [];

let myItemsPromise: Promise<WorkItemView[]> | null = null;
let teamItemsPromise: Promise<WorkItemView[]> | null = null;

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
}));

export function useCanManageWorkItems(role: UserRole | undefined) {
  return hasFullAppAccess(role ?? "pracownik");
}
