"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { KanbanBoard } from "@/lib/process/kanban-types";

export function useKanbanRealtime(boardId: string | null, onRefresh: () => Promise<void>) {
  const stableRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    if (!boardId) {
      return;
    }

    const supabase = getSupabase();
    const channel = supabase
      .channel(`kanban-board-${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_tasks" },
        () => {
          void stableRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_comments" },
        () => {
          void stableRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_task_events" },
        () => {
          void stableRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_task_attachments" },
        () => {
          void stableRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [boardId, stableRefresh]);
}

export function useKanbanOpenTasksRealtime(onCountChange: (count: number) => void) {
  useEffect(() => {
    const supabase = getSupabase();

    async function refreshCount() {
      const { count, error } = await supabase
        .from("process_kanban_tasks")
        .select("id", { count: "exact", head: true })
        .is("closed_at", null);

      if (!error) {
        onCountChange(count ?? 0);
      }
    }

    void refreshCount();

    const channel = supabase
      .channel("kanban-open-tasks")
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
  }, [onCountChange]);
}

export function useKanbanNewTasksRealtime(onCountChange: (count: number) => void) {
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel("kanban-new-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "process_kanban_tasks" },
        async () => {
          const { count, error } = await supabase
            .from("process_kanban_tasks")
            .select("id", { count: "exact", head: true })
            .eq("is_new_for_team", true)
            .is("closed_at", null);

          if (!error) {
            onCountChange(count ?? 0);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onCountChange]);
}

export type KanbanBoardState = {
  board: KanbanBoard | null;
  loading: boolean;
  error: string | null;
};
