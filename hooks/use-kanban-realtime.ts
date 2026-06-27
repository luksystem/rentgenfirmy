"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { KanbanBoard } from "@/lib/process/kanban-types";

const KANBAN_REALTIME_TABLES = [
  "process_kanban_tasks",
  "process_kanban_comments",
  "process_kanban_task_events",
  "process_kanban_task_attachments",
  "process_kanban_task_reactions",
] as const;

type RefreshListener = () => void;

type BoardHub = {
  channel: RealtimeChannel | null;
  listeners: Set<RefreshListener>;
  debounceRef: ReturnType<typeof setTimeout> | null;
  subscriberCount: number;
};

const boardHubs = new Map<string, BoardHub>();

function getBoardHub(boardId: string): BoardHub {
  const existing = boardHubs.get(boardId);
  if (existing) {
    return existing;
  }

  const hub: BoardHub = {
    channel: null,
    listeners: new Set(),
    debounceRef: null,
    subscriberCount: 0,
  };
  boardHubs.set(boardId, hub);
  return hub;
}

function scheduleBoardRefresh(hub: BoardHub) {
  if (hub.debounceRef) {
    clearTimeout(hub.debounceRef);
  }

  hub.debounceRef = setTimeout(() => {
    for (const listener of hub.listeners) {
      listener();
    }
  }, 250);
}

function ensureBoardChannel(boardId: string) {
  const hub = getBoardHub(boardId);
  if (hub.channel || !isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabase();
  let channel = supabase.channel(`kanban-board-${boardId}`);

  for (const table of KANBAN_REALTIME_TABLES) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => scheduleBoardRefresh(hub),
    );
  }

  hub.channel = channel;
  channel.subscribe();
}

function teardownBoardChannelIfIdle(boardId: string) {
  const hub = boardHubs.get(boardId);
  if (!hub || hub.subscriberCount > 0 || !hub.channel) {
    return;
  }

  if (hub.debounceRef) {
    clearTimeout(hub.debounceRef);
    hub.debounceRef = null;
  }

  void getSupabase().removeChannel(hub.channel);
  hub.channel = null;
  boardHubs.delete(boardId);
}

function subscribeToKanbanBoard(boardId: string, listener: RefreshListener) {
  const hub = getBoardHub(boardId);
  hub.listeners.add(listener);
  hub.subscriberCount += 1;
  ensureBoardChannel(boardId);

  return () => {
    hub.listeners.delete(listener);
    hub.subscriberCount = Math.max(0, hub.subscriberCount - 1);
    teardownBoardChannelIfIdle(boardId);
  };
}

export function useKanbanRealtime(boardId: string | null, onRefresh: () => Promise<void>) {
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!boardId || !isSupabaseConfigured()) {
      return;
    }

    const listener = () => {
      void onRefreshRef.current();
    };

    return subscribeToKanbanBoard(boardId, listener);
  }, [boardId]);
}

export function useKanbanOverdueTasksRealtime(onCountChange: (count: number) => void) {
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    async function refreshCount() {
      const { count, error } = await supabase
        .from("process_kanban_tasks")
        .select("id", { count: "exact", head: true })
        .is("closed_at", null)
        .not("due_date", "is", null)
        .lt("due_date", today);

      if (!error) {
        onCountChangeRef.current(count ?? 0);
      }
    }

    void refreshCount();

    const channel = supabase
      .channel("kanban-overdue-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_tasks" },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}

/** @deprecated Use useKanbanOverdueTasksRealtime */
export const useKanbanOpenTasksRealtime = useKanbanOverdueTasksRealtime;

export function useKanbanNewTasksRealtime(onCountChange: (count: number) => void) {
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabase();

    async function refreshCount() {
      const { count, error } = await supabase
        .from("process_kanban_tasks")
        .select("id", { count: "exact", head: true })
        .eq("is_new_for_team", true)
        .is("closed_at", null);

      if (!error) {
        onCountChangeRef.current(count ?? 0);
      }
    }

    void refreshCount();

    const channel = supabase
      .channel("kanban-new-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_tasks" },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}

export type KanbanBoardState = {
  board: KanbanBoard | null;
  loading: boolean;
  error: string | null;
};
