"use client";

import { create } from "zustand";
import type { GoalReviewMeetingWithDetails } from "@/lib/goals/types";
import {
  fetchCompletedGoalReviewMeetings,
  fetchGoalReviewMeetingWithDetails,
} from "@/lib/supabase/goal-review-meeting-repository";

export const EMPTY_REVIEW_REPORTS: GoalReviewMeetingWithDetails[] = [];

type GoalReviewMeetingStore = {
  reportsHydrated: boolean;
  reportsLoading: boolean;
  reportsError: string | null;
  reports: GoalReviewMeetingWithDetails[];

  activeMeeting: GoalReviewMeetingWithDetails | null;
  activeMeetingLoading: boolean;
  activeMeetingError: string | null;

  hydrateReports: (options?: { force?: boolean; boardId?: string }) => Promise<void>;
  ensureMeeting: (meetingId: string, options?: { force?: boolean }) => Promise<GoalReviewMeetingWithDetails | null>;
  setActiveMeeting: (meeting: GoalReviewMeetingWithDetails | null) => void;
  invalidateReports: () => void;
};

let reportsPromise: Promise<void> | null = null;
const meetingPromises = new Map<string, Promise<GoalReviewMeetingWithDetails | null>>();

export const useGoalReviewMeetingStore = create<GoalReviewMeetingStore>((set, get) => ({
  reportsHydrated: false,
  reportsLoading: false,
  reportsError: null,
  reports: [],

  activeMeeting: null,
  activeMeetingLoading: false,
  activeMeetingError: null,

  hydrateReports: async (options) => {
    const force = options?.force ?? false;
    const boardId = options?.boardId;
    if (get().reportsHydrated && !force && !boardId) {
      return;
    }
    if (reportsPromise && !force) {
      return reportsPromise;
    }

    set({
      reportsLoading: !get().reportsHydrated,
      reportsError: null,
    });

    reportsPromise = (async () => {
      try {
        const reports = await fetchCompletedGoalReviewMeetings({
          boardId,
          limit: 100,
        });
        set({
          reports,
          reportsHydrated: true,
          reportsLoading: false,
          reportsError: null,
        });
      } catch (error) {
        set({
          reportsLoading: false,
          reportsError: error instanceof Error ? error.message : "Nie udało się wczytać raportów.",
        });
      } finally {
        reportsPromise = null;
      }
    })();

    return reportsPromise;
  },

  ensureMeeting: async (meetingId, options) => {
    const force = options?.force ?? false;
    const cached = get().activeMeeting;
    if (!force && cached?.id === meetingId) {
      return cached;
    }

    const inflight = meetingPromises.get(meetingId);
    if (inflight && !force) {
      return inflight;
    }

    set({ activeMeetingLoading: !cached || cached.id !== meetingId, activeMeetingError: null });

    const promise = (async () => {
      try {
        const meeting = await fetchGoalReviewMeetingWithDetails(meetingId);
        set({
          activeMeeting: meeting,
          activeMeetingLoading: false,
          activeMeetingError: meeting ? null : "Spotkanie nie istnieje.",
        });
        return meeting;
      } catch (error) {
        set({
          activeMeetingLoading: false,
          activeMeetingError:
            error instanceof Error ? error.message : "Nie udało się wczytać spotkania.",
        });
        return null;
      } finally {
        meetingPromises.delete(meetingId);
      }
    })();

    meetingPromises.set(meetingId, promise);
    return promise;
  },

  setActiveMeeting: (meeting) => set({ activeMeeting: meeting, activeMeetingError: null }),

  invalidateReports: () => {
    reportsPromise = null;
    set({ reportsHydrated: false, reports: [] });
  },
}));
