"use client";

import { create } from "zustand";
import type { UserProfile } from "@/lib/auth/types";
import { fetchTeamProfiles, profileToOptionLabel } from "@/lib/supabase/profile-repository";
import type { LeaveRequest, LeaveRequestDecisionInput, LeaveRequestInput } from "@/lib/leave/types";
import {
  clearLeaveRequestSignature as clearLeaveRequestSignatureRepo,
  createLeaveRequest as createLeaveRequestRepo,
  decideLeaveRequest as decideLeaveRequestRepo,
  deleteLeaveRequest as deleteLeaveRequestRepo,
  fetchAllLeaveRequests,
  fetchMyLeaveRequests,
  fetchPendingLeaveRequestCount,
  revertLeaveRequest as revertLeaveRequestRepo,
} from "@/lib/supabase/leave-request-repository";

// Stabilna referencja — patrz uzasadnienie w `store/goal-store.ts` (React #185 przy `[]` w selektorze).
export const EMPTY_LEAVE_REQUESTS: LeaveRequest[] = [];

let myRequestsPromise: Promise<LeaveRequest[]> | null = null;
let allRequestsPromise: Promise<LeaveRequest[]> | null = null;

type LeaveStore = {
  myRequests: LeaveRequest[];
  myRequestsHydrated: boolean;
  myRequestsLoading: boolean;

  allRequests: LeaveRequest[];
  allRequestsHydrated: boolean;
  allRequestsLoading: boolean;

  teamProfiles: UserProfile[];
  pendingForMeCount: number;

  error: string | null;

  ensureMyRequests: (options?: { force?: boolean }) => Promise<LeaveRequest[]>;
  ensureAllRequests: (options?: { force?: boolean }) => Promise<LeaveRequest[]>;
  refreshPendingForMeCount: () => Promise<number>;
  createRequest: (input: LeaveRequestInput) => Promise<LeaveRequest>;
  cancelRequest: (id: string) => Promise<void>;
  decideRequest: (id: string, input: LeaveRequestDecisionInput) => Promise<LeaveRequest>;
  revertRequest: (id: string) => Promise<LeaveRequest>;
  clearSignature: (id: string) => Promise<LeaveRequest>;
  getEmployeeName: (profileId: string | null) => string;
  upsertInStore: (item: LeaveRequest) => void;
};

export const useLeaveStore = create<LeaveStore>((set, get) => ({
  myRequests: EMPTY_LEAVE_REQUESTS,
  myRequestsHydrated: false,
  myRequestsLoading: false,

  allRequests: EMPTY_LEAVE_REQUESTS,
  allRequestsHydrated: false,
  allRequestsLoading: false,

  teamProfiles: [],
  pendingForMeCount: 0,

  error: null,

  ensureMyRequests: async (options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.myRequestsHydrated && !force) {
      return state.myRequests;
    }
    if (myRequestsPromise && !force) {
      return myRequestsPromise;
    }

    set({ myRequestsLoading: !state.myRequestsHydrated, error: null });

    const promise = Promise.all([
      fetchMyLeaveRequests(),
      get().teamProfiles.length ? Promise.resolve(get().teamProfiles) : fetchTeamProfiles(),
    ]).then(
      ([items, teamProfiles]) => {
        set({
          myRequests: items,
          teamProfiles,
          myRequestsHydrated: true,
          myRequestsLoading: false,
        });
        return items;
      },
      (error: unknown) => {
        set({
          myRequestsLoading: false,
          error: error instanceof Error ? error.message : "Nie udało się wczytać wniosków urlopowych.",
        });
        throw error;
      },
    );

    myRequestsPromise = promise;
    try {
      return await promise;
    } finally {
      if (myRequestsPromise === promise) {
        myRequestsPromise = null;
      }
    }
  },

  ensureAllRequests: async (options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.allRequestsHydrated && !force) {
      return state.allRequests;
    }
    if (allRequestsPromise && !force) {
      return allRequestsPromise;
    }

    set({ allRequestsLoading: !state.allRequestsHydrated, error: null });

    const promise = Promise.all([
      fetchAllLeaveRequests(),
      get().teamProfiles.length ? Promise.resolve(get().teamProfiles) : fetchTeamProfiles(),
    ]).then(
      ([items, teamProfiles]) => {
        set({
          allRequests: items,
          teamProfiles,
          allRequestsHydrated: true,
          allRequestsLoading: false,
        });
        return items;
      },
      (error: unknown) => {
        set({
          allRequestsLoading: false,
          error: error instanceof Error ? error.message : "Nie udało się wczytać urlopów pracowników.",
        });
        throw error;
      },
    );

    allRequestsPromise = promise;
    try {
      return await promise;
    } finally {
      if (allRequestsPromise === promise) {
        allRequestsPromise = null;
      }
    }
  },

  refreshPendingForMeCount: async () => {
    try {
      const count = await fetchPendingLeaveRequestCount();
      set({ pendingForMeCount: count });
      return count;
    } catch {
      return get().pendingForMeCount;
    }
  },

  createRequest: async (input) => {
    const created = await createLeaveRequestRepo(input);
    set({ myRequests: [created, ...get().myRequests] });
    return created;
  },

  cancelRequest: async (id) => {
    await deleteLeaveRequestRepo(id);
    set({
      myRequests: get().myRequests.filter((item) => item.id !== id),
      allRequests: get().allRequests.filter((item) => item.id !== id),
    });
  },

  decideRequest: async (id, input) => {
    const updated = await decideLeaveRequestRepo(id, input);
    get().upsertInStore(updated);
    void get().refreshPendingForMeCount();
    return updated;
  },

  revertRequest: async (id) => {
    const updated = await revertLeaveRequestRepo(id);
    get().upsertInStore(updated);
    return updated;
  },

  clearSignature: async (id) => {
    const updated = await clearLeaveRequestSignatureRepo(id);
    get().upsertInStore(updated);
    void get().refreshPendingForMeCount();
    return updated;
  },

  getEmployeeName: (profileId) => {
    if (!profileId) {
      return "—";
    }
    const profile = get().teamProfiles.find((entry) => entry.id === profileId);
    return profile ? profileToOptionLabel(profile) : "Nieznany użytkownik";
  },

  upsertInStore: (item) => {
    const replace = (list: LeaveRequest[]) => {
      const index = list.findIndex((entry) => entry.id === item.id);
      return index >= 0 ? list.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...list];
    };
    set({
      myRequests: replace(get().myRequests),
      allRequests: replace(get().allRequests),
    });
  },
}));
