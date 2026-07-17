"use client";

import { create } from "zustand";
import { getActivityActor } from "@/lib/activity-log/actor";
import { goalActivityHref } from "@/lib/activity-log/hrefs";
import type { UserProfile } from "@/lib/auth/types";
import { logActivity } from "@/lib/supabase/activity-log-repository";
import { fetchTeamProfiles, profileToOptionLabel } from "@/lib/supabase/profile-repository";
import {
  createGoalBoard,
  createGoalBoardKind,
  deleteGoalBoard,
  deleteGoalBoardKind,
  fetchGoalBoardKinds,
  fetchGoalBoards,
  fetchGoalCountsByBoard,
  updateGoalBoard,
  updateGoalBoardKind,
} from "@/lib/supabase/goal-board-repository";
import { fetchGoalMethodologies } from "@/lib/supabase/goal-methodology-repository";
import { fetchGoalModuleSettings, saveGoalModuleSettings } from "@/lib/supabase/goal-settings-repository";
import { defaultGoalModuleSettings, type GoalModuleSettings } from "@/lib/goals/module-settings";
import {
  createGoal as createGoalRow,
  deleteGoal as deleteGoalRow,
  fetchGoalInitiativeTaskCounts,
  fetchGoalLinkCounts,
  fetchGoalsByBoard,
  fetchNextReviewByGoal,
  updateGoal,
  updateGoalProgress,
} from "@/lib/supabase/goal-repository";
import type { goalToInsertRow } from "@/lib/supabase/goal-mappers";
import type { Goal, GoalBoard, GoalBoardKind, GoalMethodology, GoalStatus } from "@/lib/goals/types";

type GoalCardMeta = {
  linkedTaskCount: number;
  openProblemCount: number;
  nextReviewAt: string | null;
  initiativeTaskTotal: number;
  initiativeTaskDone: number;
};

// Stabilne referencje dla fallbacków w selektorach Zustand (np. `state.goalsByBoard[id] ?? EMPTY_GOALS`).
// Literał `[]`/`{}` w selektorze tworzy nową referencję przy każdym wywołaniu, co przy
// `useSyncExternalStore` (React 18/19) powoduje nieskończoną pętlę renderowania (React #185) —
// patrz analogiczny fix w `store/resource-plan-store.ts` / `store/dictionary-store.ts`.
export const EMPTY_GOALS: Goal[] = [];
export const EMPTY_GOAL_CARD_META: Record<string, GoalCardMeta> = {};

type GoalStore = {
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;

  boardKinds: GoalBoardKind[];
  boards: GoalBoard[];
  methodologies: GoalMethodology[];
  teamProfiles: UserProfile[];
  boardCounts: Record<string, { total: number; atRisk: number; dueForReview: number }>;
  moduleSettings: GoalModuleSettings;

  goalsByBoard: Record<string, Goal[]>;
  goalCardMetaByBoard: Record<string, Record<string, GoalCardMeta>>;
  loadingBoardIds: Record<string, boolean>;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  ensureBoardGoals: (boardId: string, options?: { force?: boolean }) => Promise<void>;
  createBoard: (input: { kind: string; name: string; description?: string }) => Promise<GoalBoard>;
  updateBoard: (
    boardId: string,
    input: {
      name?: string;
      description?: string;
      reviewFrequency?: import("@/lib/goals/types").GoalPeriodType | null;
      reviewWeekday?: number | null;
      reviewResponsibleId?: string | null;
      reviewNotify?: boolean;
    },
  ) => Promise<GoalBoard>;
  removeBoard: (boardId: string) => Promise<void>;
  createBoardKind: (input: { label: string; description?: string; icon?: string }) => Promise<GoalBoardKind>;
  updateBoardKind: (
    code: string,
    input: { label?: string; description?: string; icon?: string },
  ) => Promise<GoalBoardKind>;
  removeBoardKind: (code: string) => Promise<void>;
  updateModuleSettings: (patch: Partial<GoalModuleSettings>) => Promise<void>;
  createGoal: (input: Parameters<typeof goalToInsertRow>[0]) => Promise<Goal>;
  removeGoal: (boardId: string, goalId: string) => Promise<void>;
  moveGoalStatus: (goal: Goal, status: GoalStatus, authorId: string | null) => Promise<void>;
  updateGoalQuickFields: (
    goal: Goal,
    patch: { progressPercent?: number; periodEnd?: string },
    authorId: string | null,
  ) => Promise<void>;
  upsertGoalInStore: (goal: Goal) => void;
  /** Aktualizuje licznik zadań na karcie kanbana (np. po odhaczeniu w szczegółach). */
  setGoalInitiativeTaskCounts: (goalId: string, done: number, total: number) => void;
  getOwnerName: (profileId: string | null) => string;
};

export const useGoalStore = create<GoalStore>((set, get) => ({
  hydrated: false,
  isLoading: false,
  error: null,

  boardKinds: [],
  boards: [],
  methodologies: [],
  teamProfiles: [],
  boardCounts: {},
  moduleSettings: defaultGoalModuleSettings(),

  goalsByBoard: {},
  goalCardMetaByBoard: {},
  loadingBoardIds: {},

  hydrate: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });

    try {
      const [boardKinds, boards, methodologies, teamProfiles, boardCounts, moduleSettings] = await Promise.all([
        fetchGoalBoardKinds(),
        fetchGoalBoards(),
        fetchGoalMethodologies(),
        fetchTeamProfiles(),
        fetchGoalCountsByBoard(),
        fetchGoalModuleSettings(),
      ]);

      set({
        boardKinds,
        boards,
        methodologies,
        teamProfiles,
        boardCounts,
        moduleSettings,
        hydrated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się wczytać modułu celów.",
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    try {
      const [boards, boardCounts] = await Promise.all([fetchGoalBoards(), fetchGoalCountsByBoard()]);
      set({ boards, boardCounts, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Nie udało się odświeżyć tablic celów." });
    }
  },

  ensureBoardGoals: async (boardId, options) => {
    const state = get();
    if (!options?.force && (state.goalsByBoard[boardId] || state.loadingBoardIds[boardId])) {
      return;
    }

    set({ loadingBoardIds: { ...get().loadingBoardIds, [boardId]: true } });

    try {
      const goals = await fetchGoalsByBoard(boardId);
      const goalIds = goals.map((goal) => goal.id);
      const [linkCounts, nextReviews, initiativeCounts] = await Promise.all([
        fetchGoalLinkCounts(goalIds),
        fetchNextReviewByGoal(goalIds),
        fetchGoalInitiativeTaskCounts(goalIds),
      ]);

      const meta: Record<string, GoalCardMeta> = {};
      for (const goal of goals) {
        meta[goal.id] = {
          linkedTaskCount: linkCounts[goal.id]?.linkedTaskCount ?? 0,
          openProblemCount: linkCounts[goal.id]?.openProblemCount ?? 0,
          nextReviewAt: nextReviews[goal.id] ?? null,
          initiativeTaskTotal: initiativeCounts[goal.id]?.total ?? 0,
          initiativeTaskDone: initiativeCounts[goal.id]?.done ?? 0,
        };
      }

      set({
        goalsByBoard: { ...get().goalsByBoard, [boardId]: goals },
        goalCardMetaByBoard: { ...get().goalCardMetaByBoard, [boardId]: meta },
        loadingBoardIds: { ...get().loadingBoardIds, [boardId]: false },
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się wczytać celów tablicy.",
        loadingBoardIds: { ...get().loadingBoardIds, [boardId]: false },
      });
    }
  },

  createBoard: async (input) => {
    const board = await createGoalBoard(input);
    set({ boards: [board, ...get().boards] });
    return board;
  },

  updateBoard: async (boardId, input) => {
    const updated = await updateGoalBoard(boardId, input);
    set({ boards: get().boards.map((board) => (board.id === boardId ? updated : board)) });
    return updated;
  },

  removeBoard: async (boardId) => {
    await deleteGoalBoard(boardId);
    const { [boardId]: _removedGoals, ...restGoalsByBoard } = get().goalsByBoard;
    const { [boardId]: _removedMeta, ...restMeta } = get().goalCardMetaByBoard;
    const { [boardId]: _removedCounts, ...restCounts } = get().boardCounts;
    set({
      boards: get().boards.filter((board) => board.id !== boardId),
      goalsByBoard: restGoalsByBoard,
      goalCardMetaByBoard: restMeta,
      boardCounts: restCounts,
    });
  },

  createBoardKind: async (input) => {
    const kind = await createGoalBoardKind(input);
    set({ boardKinds: [...get().boardKinds, kind].sort((a, b) => a.sortOrder - b.sortOrder) });
    return kind;
  },

  updateBoardKind: async (code, input) => {
    const updated = await updateGoalBoardKind(code, input);
    set({ boardKinds: get().boardKinds.map((kind) => (kind.code === code ? updated : kind)) });
    return updated;
  },

  removeBoardKind: async (code) => {
    await deleteGoalBoardKind(code);
    set({ boardKinds: get().boardKinds.filter((kind) => kind.code !== code) });
  },

  updateModuleSettings: async (patch) => {
    const next = { ...get().moduleSettings, ...patch };
    const saved = await saveGoalModuleSettings(next);
    set({ moduleSettings: saved });
  },

  createGoal: async (input) => {
    const goal = await createGoalRow(input);
    const boardGoals = get().goalsByBoard[input.boardId] ?? [];
    set({
      goalsByBoard: { ...get().goalsByBoard, [input.boardId]: [goal, ...boardGoals] },
      goalCardMetaByBoard: {
        ...get().goalCardMetaByBoard,
        [input.boardId]: {
          ...(get().goalCardMetaByBoard[input.boardId] ?? {}),
          [goal.id]: {
            linkedTaskCount: 0,
            openProblemCount: 0,
            nextReviewAt: null,
            initiativeTaskTotal: 0,
            initiativeTaskDone: 0,
          },
        },
      },
      boardCounts: {
        ...get().boardCounts,
        [input.boardId]: {
          total: (get().boardCounts[input.boardId]?.total ?? 0) + 1,
          atRisk: get().boardCounts[input.boardId]?.atRisk ?? 0,
          dueForReview: get().boardCounts[input.boardId]?.dueForReview ?? 0,
        },
      },
    });

    const actor = getActivityActor();
    void logActivity({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "goal",
      entityId: goal.id,
      entityLabel: goal.name,
      summary: "Dodał cel",
      href: goalActivityHref(goal.boardId, goal.id),
    });

    return goal;
  },

  removeGoal: async (boardId, goalId) => {
    const existing = (get().goalsByBoard[boardId] ?? []).find((goal) => goal.id === goalId);
    await deleteGoalRow(goalId);
    set({
      goalsByBoard: {
        ...get().goalsByBoard,
        [boardId]: (get().goalsByBoard[boardId] ?? []).filter((goal) => goal.id !== goalId),
      },
    });

    const actor = getActivityActor();
    void logActivity({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "goal",
      entityId: goalId,
      entityLabel: existing?.name ?? goalId,
      summary: "Usunął cel",
      href: `/tablice-celow/${encodeURIComponent(boardId)}`,
    });
  },

  moveGoalStatus: async (goal, status, authorId) => {
    const { goal: updated } = await updateGoalProgress(goal.id, { status, authorId });
    get().upsertGoalInStore(updated);

    const actor = getActivityActor();
    void logActivity({
      actorUserId: actor.userId ?? authorId,
      actorName: actor.name,
      action: "updated",
      entityType: "goal",
      entityId: updated.id,
      entityLabel: updated.name,
      summary: "Zmienił status celu",
      href: goalActivityHref(updated.boardId, updated.id),
      metadata: { status },
    });
  },

  updateGoalQuickFields: async (goal, patch, authorId) => {
    if (patch.progressPercent !== undefined) {
      const { goal: updated } = await updateGoalProgress(goal.id, {
        progressPercent: patch.progressPercent,
        authorId,
      });
      get().upsertGoalInStore(updated);

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId ?? authorId,
        actorName: actor.name,
        action: "updated",
        entityType: "goal",
        entityId: updated.id,
        entityLabel: updated.name,
        summary: "Zaktualizował postęp celu",
        href: goalActivityHref(updated.boardId, updated.id),
        metadata: { progressPercent: patch.progressPercent },
      });
    }
    if (patch.periodEnd !== undefined) {
      const updated = await updateGoal(goal.id, { periodEnd: patch.periodEnd });
      get().upsertGoalInStore(updated);

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "goal",
        entityId: updated.id,
        entityLabel: updated.name,
        summary: "Zaktualizował cel",
        href: goalActivityHref(updated.boardId, updated.id),
      });
    }
  },

  upsertGoalInStore: (goal) => {
    const boardGoals = get().goalsByBoard[goal.boardId] ?? [];
    const index = boardGoals.findIndex((entry) => entry.id === goal.id);
    const nextGoals =
      index >= 0
        ? boardGoals.map((entry) => (entry.id === goal.id ? goal : entry))
        : [goal, ...boardGoals];

    set({ goalsByBoard: { ...get().goalsByBoard, [goal.boardId]: nextGoals } });
  },

  setGoalInitiativeTaskCounts: (goalId, done, total) => {
    const safeDone = Math.max(0, done);
    const safeTotal = Math.max(0, total);
    const metaByBoard = get().goalCardMetaByBoard;
    let changed = false;
    const nextMetaByBoard: Record<string, Record<string, GoalCardMeta>> = { ...metaByBoard };

    for (const [boardId, metaByGoal] of Object.entries(metaByBoard)) {
      const current = metaByGoal[goalId];
      if (!current) continue;
      if (current.initiativeTaskDone === safeDone && current.initiativeTaskTotal === safeTotal) {
        continue;
      }
      changed = true;
      nextMetaByBoard[boardId] = {
        ...metaByGoal,
        [goalId]: {
          ...current,
          initiativeTaskDone: safeDone,
          initiativeTaskTotal: safeTotal,
        },
      };
    }

    // Cel może być w cache goals, ale jeszcze bez meta (np. świeżo otwarty szczegół).
    if (!changed) {
      for (const [boardId, goals] of Object.entries(get().goalsByBoard)) {
        if (!goals.some((goal) => goal.id === goalId)) continue;
        const boardMeta = nextMetaByBoard[boardId] ?? {};
        nextMetaByBoard[boardId] = {
          ...boardMeta,
          [goalId]: {
            linkedTaskCount: boardMeta[goalId]?.linkedTaskCount ?? 0,
            openProblemCount: boardMeta[goalId]?.openProblemCount ?? 0,
            nextReviewAt: boardMeta[goalId]?.nextReviewAt ?? null,
            initiativeTaskDone: safeDone,
            initiativeTaskTotal: safeTotal,
          },
        };
        changed = true;
        break;
      }
    }

    if (changed) {
      set({ goalCardMetaByBoard: nextMetaByBoard });
    }
  },

  getOwnerName: (profileId) => {
    if (!profileId) {
      return "Brak właściciela";
    }
    const profile = get().teamProfiles.find((entry) => entry.id === profileId);
    return profile ? profileToOptionLabel(profile) : "Nieznany użytkownik";
  },
}));
