"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckSquare, Square } from "lucide-react";
import { BrandLoadingInline } from "@/components/brand-loading";
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
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const setGoalInitiativeTaskCounts = useGoalStore((state) => state.setGoalInitiativeTaskCounts);

  const onCountsChangeRef = useRef(onCountsChange);
  onCountsChangeRef.current = onCountsChange;
  const setCountsRef = useRef(setGoalInitiativeTaskCounts);
  setCountsRef.current = setGoalInitiativeTaskCounts;

  const publishCounts = useCallback(
    (done: number, total: number) => {
      setCountsRef.current(goalId, done, total);
      onCountsChangeRef.current?.(done, total);
    },
    [goalId],
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
    setError(null);
    void reload()
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Nie udało się wczytać zadań.");
        }
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
    setError(null);
    try {
      const updated = await setGoalInitiativeCompleted(item.id, !item.completedAt);
      setItems((current) => {
        const next = current.map((entry) => (entry.id === updated.id ? updated : entry));
        const done = next.filter((entry) => entry.completedAt).length;
        publishCounts(done, next.length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać zadania.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <BrandLoadingInline label="Ładowanie zadań…" />;
  }

  if (error && items.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-rose-400">{error}</p>
        <button
          type="button"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          onClick={() => {
            setLoading(true);
            void reload()
              .catch((err) => {
                setError(err instanceof Error ? err.message : "Nie udało się wczytać zadań.");
              })
              .finally(() => setLoading(false));
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Brak zadań przypisanych do tego celu.</p>;
  }

  const done = items.filter((item) => item.completedAt).length;

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
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
                  <Image
                    src="/icons/rentgen-logo-mark-transparent-1024.png"
                    alt=""
                    width={16}
                    height={16}
                    className="mt-0.5 h-4 w-4 shrink-0 animate-pulse object-contain"
                  />
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
