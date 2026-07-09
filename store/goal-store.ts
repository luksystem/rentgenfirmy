"use client";

import { create } from "zustand";
import type { UserProfile } from "@/lib/auth/types";
import { fetchTeamProfiles, profileToOptionLabel } from "@/lib/supabase/profile-repository";
import {
  createGoalBoard,
  deleteGoalBoard,
  fetchGoalBoardKinds,
  fetchGoalBoards,
  fetchGoalCountsByBoard,
  updateGoalBoard,
} from "@/lib/supabase/goal-board-repository";
import { fetchGoalMethodologies } from "@/lib/supabase/goal-methodology-repository";
import {
  createGoal as createGoalRow,
  deleteGoal as deleteGoalRow,
  fetchGoalLinkCounts,
  fetchGoalsByBoard,
  fetchNextReviewByGoal,
  updateGoalProgress,
} from "@/lib/supabase/goal-repository";
import type { goalToInsertRow } from "@/lib/supabase/goal-mappers";
import type { Goal, GoalBoard, GoalBoardKind, GoalMethodology, GoalStatus } from "@/lib/goals/types";

type GoalCardMeta = {
  linkedTaskCount: number;
  openProblemCount: number;
  nextReviewAt: string | null;
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

  goalsByBoard: Record<string, Goal[]>;
  goalCardMetaByBoard: Record<string, Record<string, GoalCardMeta>>;
  loadingBoardIds: Record<string, boolean>;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  ensureBoardGoals: (boardId: string, options?: { force?: boolean }) => Promise<void>;
  createBoard: (input: { kind: string; name: string; description?: string }) => Promise<GoalBoard>;
  updateBoard: (boardId: string, input: { name?: string; description?: string }) => Promise<GoalBoard>;
  removeBoard: (boardId: string) => Promise<void>;
  createGoal: (input: Parameters<typeof goalToInsertRow>[0]) => Promise<Goal>;
  removeGoal: (boardId: string, goalId: string) => Promise<void>;
  moveGoalStatus: (goal: Goal, status: GoalStatus, authorId: string | null) => Promise<void>;
  upsertGoalInStore: (goal: Goal) => void;
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

  goalsByBoard: {},
  goalCardMetaByBoard: {},
  loadingBoardIds: {},

  hydrate: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });

    try {
      const [boardKinds, boards, methodologies, teamProfiles, boardCounts] = await Promise.all([
        fetchGoalBoardKinds(),
        fetchGoalBoards(),
        fetchGoalMethodologies(),
        fetchTeamProfiles(),
        fetchGoalCountsByBoard(),
      ]);

      set({
        boardKinds,
        boards,
        methodologies,
        teamProfiles,
        boardCounts,
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
      const [linkCounts, nextReviews] = await Promise.all([
        fetchGoalLinkCounts(goalIds),
        fetchNextReviewByGoal(goalIds),
      ]);

      const meta: Record<string, GoalCardMeta> = {};
      for (const goal of goals) {
        meta[goal.id] = {
          linkedTaskCount: linkCounts[goal.id]?.linkedTaskCount ?? 0,
          openProblemCount: linkCounts[goal.id]?.openProblemCount ?? 0,
          nextReviewAt: nextReviews[goal.id] ?? null,
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

  createGoal: async (input) => {
    const goal = await createGoalRow(input);
    const boardGoals = get().goalsByBoard[input.boardId] ?? [];
    set({
      goalsByBoard: { ...get().goalsByBoard, [input.boardId]: [goal, ...boardGoals] },
      goalCardMetaByBoard: {
        ...get().goalCardMetaByBoard,
        [input.boardId]: {
          ...(get().goalCardMetaByBoard[input.boardId] ?? {}),
          [goal.id]: { linkedTaskCount: 0, openProblemCount: 0, nextReviewAt: null },
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
    return goal;
  },

  removeGoal: async (boardId, goalId) => {
    await deleteGoalRow(goalId);
    set({
      goalsByBoard: {
        ...get().goalsByBoard,
        [boardId]: (get().goalsByBoard[boardId] ?? []).filter((goal) => goal.id !== goalId),
      },
    });
  },

  moveGoalStatus: async (goal, status, authorId) => {
    const { goal: updated } = await updateGoalProgress(goal.id, { status, authorId });
    get().upsertGoalInStore(updated);
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

  getOwnerName: (profileId) => {
    if (!profileId) {
      return "Brak właściciela";
    }
    const profile = get().teamProfiles.find((entry) => entry.id === profileId);
    return profile ? profileToOptionLabel(profile) : "Nieznany użytkownik";
  },
}));
