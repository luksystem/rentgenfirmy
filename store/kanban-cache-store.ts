"use client";

import { create } from "zustand";
import { mergeKanbanBoards, type MergedKanbanView } from "@/lib/process/kanban-merge";
import type { KanbanHubBoardEntry, KanbanHubClientTile } from "@/lib/process/kanban-hub-types";
import type { KanbanBoard } from "@/lib/process/kanban-types";
import {
  fetchAllKanbanBoardGraphs,
  fetchKanbanHubSnapshot,
  invalidateKanbanHubCache,
} from "@/lib/supabase/kanban-hub-repository";
import { fetchKanbanBoardByItemId } from "@/lib/supabase/kanban-repository";

let hubLoadPromise: Promise<KanbanHubClientTile[]> | null = null;
let boardsLoadPromise: Promise<KanbanBoard[]> | null = null;
const boardLoadPromises = new Map<string, Promise<KanbanBoard | null>>();

type KanbanCacheStore = {
  hubClients: KanbanHubClientTile[] | null;
  hubEntries: KanbanHubBoardEntry[] | null;
  allBoards: KanbanBoard[] | null;
  mergedView: MergedKanbanView | null;
  boardsByItemId: Record<string, KanbanBoard>;
  hubHydrated: boolean;
  boardsHydrated: boolean;
  hubLoading: boolean;
  boardsLoading: boolean;
  error: string | null;
  hydrateHub: (options?: { force?: boolean }) => Promise<KanbanHubClientTile[]>;
  ensureAllBoards: (options?: { force?: boolean }) => Promise<KanbanBoard[]>;
  ensureBoard: (projectProcessItemId: string, options?: { force?: boolean }) => Promise<KanbanBoard | null>;
  getBoardEntry: (projectProcessItemId: string) => KanbanHubBoardEntry | null;
  setBoard: (board: KanbanBoard) => void;
  invalidate: () => void;
};

function indexBoardsByItemId(boards: KanbanBoard[]) {
  const boardsByItemId: Record<string, KanbanBoard> = {};
  for (const board of boards) {
    boardsByItemId[board.projectProcessItemId] = board;
  }
  return boardsByItemId;
}

function applyBoardsToState(boards: KanbanBoard[]) {
  return {
    allBoards: boards,
    boardsByItemId: indexBoardsByItemId(boards),
    mergedView: boards.length ? mergeKanbanBoards(boards) : null,
    boardsHydrated: true,
    boardsLoading: false,
    error: null,
  };
}

export const useKanbanCacheStore = create<KanbanCacheStore>((set, get) => ({
  hubClients: null,
  hubEntries: null,
  allBoards: null,
  mergedView: null,
  boardsByItemId: {},
  hubHydrated: false,
  boardsHydrated: false,
  hubLoading: false,
  boardsLoading: false,
  error: null,

  hydrateHub: async (options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.hubHydrated && state.hubClients && !force) {
      return state.hubClients;
    }

    if (hubLoadPromise && !force) {
      return hubLoadPromise;
    }

    if (force) {
      invalidateKanbanHubCache();
    }

    set({ hubLoading: true, error: null });

    hubLoadPromise = (async () => {
      try {
        const snapshot = await fetchKanbanHubSnapshot();
        set({
          hubClients: snapshot.clients,
          hubEntries: snapshot.entries,
          hubHydrated: true,
          hubLoading: false,
          error: null,
        });
        return snapshot.clients;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Błąd ładowania tablic wdrożeń",
          hubLoading: false,
        });
        throw error;
      } finally {
        hubLoadPromise = null;
      }
    })();

    return hubLoadPromise;
  },

  ensureAllBoards: async (options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.boardsHydrated && state.allBoards && !force) {
      return state.allBoards;
    }

    if (boardsLoadPromise && !force) {
      return boardsLoadPromise;
    }

    if (force) {
      invalidateKanbanHubCache();
    }

    const hasCachedBoards = Boolean(state.allBoards?.length);
    set({
      boardsLoading: !hasCachedBoards,
      error: null,
    });

    boardsLoadPromise = (async () => {
      try {
        if (!get().hubHydrated || force) {
          await get().hydrateHub({ force });
        }

        const boards = await fetchAllKanbanBoardGraphs();
        set(applyBoardsToState(boards));
        return boards;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Błąd ładowania tablic Kanban",
          boardsLoading: false,
        });
        throw error;
      } finally {
        boardsLoadPromise = null;
      }
    })();

    return boardsLoadPromise;
  },

  ensureBoard: async (projectProcessItemId, options) => {
    const force = options?.force ?? false;
    const cached = get().boardsByItemId[projectProcessItemId];

    if (cached && !force) {
      return cached;
    }

    const inFlight = boardLoadPromises.get(projectProcessItemId);
    if (inFlight && !force) {
      return inFlight;
    }

    const promise = (async () => {
      const board = await fetchKanbanBoardByItemId(projectProcessItemId);
      if (board) {
        get().setBoard(board);
      }
      return board;
    })();

    boardLoadPromises.set(projectProcessItemId, promise);

    try {
      return await promise;
    } finally {
      boardLoadPromises.delete(projectProcessItemId);
    }
  },

  getBoardEntry: (projectProcessItemId) => {
    return get().hubEntries?.find((entry) => entry.projectProcessItemId === projectProcessItemId) ?? null;
  },

  setBoard: (board) => {
    const state = get();
    const boardsByItemId = { ...state.boardsByItemId, [board.projectProcessItemId]: board };
    const allBoards = state.allBoards
      ? state.allBoards.some((entry) => entry.projectProcessItemId === board.projectProcessItemId)
        ? state.allBoards.map((entry) =>
            entry.projectProcessItemId === board.projectProcessItemId ? board : entry,
          )
        : [...state.allBoards, board]
      : [board];

    set({
      boardsByItemId,
      allBoards,
      mergedView: mergeKanbanBoards(allBoards),
      boardsHydrated: true,
    });
  },

  invalidate: () => {
    invalidateKanbanHubCache();
    hubLoadPromise = null;
    boardsLoadPromise = null;
    boardLoadPromises.clear();
    set({
      hubClients: null,
      hubEntries: null,
      allBoards: null,
      mergedView: null,
      boardsByItemId: {},
      hubHydrated: false,
      boardsHydrated: false,
      hubLoading: false,
      boardsLoading: false,
      error: null,
    });
  },
}));

export function filterHubEntriesByClient(
  entries: KanbanHubBoardEntry[] | null,
  clientId: string,
): KanbanHubBoardEntry[] {
  if (!entries) {
    return [];
  }

  return entries.filter((entry) => entry.clientId === clientId);
}
