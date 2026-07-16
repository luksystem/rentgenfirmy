"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckSquare, Loader2, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchGoalInitiatives,
  setGoalInitiativeCompleted,
} from "@/lib/supabase/goal-repository";
import type { GoalInitiative } from "@/lib/goals/types";
import { cn } from "@/lib/utils";
import { useGoalStore } from "@/store/goal-store";

export function GoalInitiativesPanel({
  goalId,
  onCountsChange,
}: {
  goalId: string;
  onCountsChange?: (done: number, total: number) => void;
}) {
  const [items, setItems] = useState<GoalInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const setGoalInitiativeTaskCounts = useGoalStore((state) => state.setGoalInitiativeTaskCounts);

  const publishCounts = useCallback(
    (done: number, total: number) => {
      setGoalInitiativeTaskCounts(goalId, done, total);
      onCountsChange?.(done, total);
    },
    [goalId, onCountsChange, setGoalInitiativeTaskCounts],
  );

  const reload = useCallback(async () => {
    const list = await fetchGoalInitiatives(goalId);
    const tasks = list.filter((item) => item.kind === "task");
    setItems(tasks);
    const done = tasks.filter((item) => item.completedAt).length;
    publishCounts(done, tasks.length);
  }, [goalId, publishCounts]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void reload()
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function toggle(item: GoalInitiative) {
    setBusyId(item.id);
    try {
      const updated = await setGoalInitiativeCompleted(item.id, !item.completedAt);
      setItems((current) => {
        const next = current.map((entry) => (entry.id === updated.id ? updated : entry));
        const done = next.filter((entry) => entry.completedAt).length;
        publishCounts(done, next.length);
        return next;
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie zadań…
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Brak zadań przypisanych do tego celu.</p>;
  }

  const done = items.filter((item) => item.completedAt).length;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Zadania · {done}/{items.length} zrobione
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const doneItem = Boolean(item.completedAt);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void toggle(item)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                  doneItem
                    ? "border-emerald-500/30 bg-emerald-500/5 text-muted"
                    : "border-border/70 bg-surface-muted/20 text-foreground hover:border-accent/40",
                )}
              >
                {busyId === item.id ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                ) : doneItem ? (
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                )}
                <span className={cn("min-w-0 flex-1", doneItem && "line-through")}>{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GoalInitiativesCard({
  goalId,
  onCountsChange,
}: {
  goalId: string;
  onCountsChange?: (done: number, total: number) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <GoalInitiativesPanel goalId={goalId} onCountsChange={onCountsChange} />
      </CardContent>
    </Card>
  );
}
