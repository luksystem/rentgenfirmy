"use client";

import { useState } from "react";
import { CalendarCheck, PlayCircle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MyWorkEndDayDialog } from "@/components/my-work/my-work-end-day-dialog";
import type { WorkDayContext } from "@/lib/my-work/plan-types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function MyWorkDayRhythm({
  context,
  loading,
  onStartDay,
  onEndDay,
  onOpenItem,
}: {
  context: WorkDayContext | null;
  loading?: boolean;
  onStartDay: () => Promise<void>;
  onEndDay: (input: {
    employeeComment: string;
    carryOverUnfinished: boolean;
    aiDraft?: string;
  }) => Promise<void>;
  onOpenItem?: (workItemId: string) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const session = context?.session;
  const dayStarted = Boolean(session?.startConfirmed);
  const dayEnded = Boolean(session?.endedAt || context?.summary);
  const planCount = context?.dayPlan?.items.length ?? 0;

  async function handleStartDay() {
    setStarting(true);
    try {
      await onStartDay();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się rozpocząć dnia.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <Card className="mb-6 border-border/80 bg-surface-elevated/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rytm dnia</p>
            <p className="mt-1 text-sm text-foreground">
              {formatDate(context?.sessionDate ?? new Date().toISOString().slice(0, 10))}
              {dayStarted ? " — dzień rozpoczęty" : " — dzień nie rozpoczęty"}
            </p>
            {dayStarted && planCount > 0 ? (
              <p className="mt-1 text-xs text-muted">
                Plan dnia: {planCount} {planCount === 1 ? "zadanie" : planCount < 5 ? "zadania" : "zadań"}
              </p>
            ) : null}
            {context?.summary?.employeeComment ? (
              <p className="mt-2 text-xs text-muted">
                Podsumowanie: {context.summary.employeeComment}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {!dayStarted ? (
              <Button size="sm" onClick={() => void handleStartDay()} disabled={loading || starting}>
                <PlayCircle className="mr-1.5 h-4 w-4" />
                Rozpoczynam dzień
              </Button>
            ) : !dayEnded ? (
              <Button size="sm" variant="secondary" onClick={() => setEndOpen(true)}>
                <Square className="mr-1.5 h-4 w-4" />
                Podsumuj dzień
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted">
                <CalendarCheck className="h-4 w-4" />
                Dzień zakończony
              </span>
            )}
          </div>
        </div>

        {context?.dayPlan?.items.length ? (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Plan na dziś</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {context.dayPlan.items.map((entry) => {
                const workItemId = entry.workItemId;
                const canOpen = Boolean(workItemId && onOpenItem);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      disabled={!canOpen}
                      onClick={() => workItemId && onOpenItem?.(workItemId)}
                      className={cn(
                        "w-full rounded-lg border border-border/70 bg-surface px-3 py-2 text-left text-sm transition",
                        canOpen && "hover:border-border-strong hover:bg-surface-muted/40",
                        !canOpen && "cursor-default opacity-60",
                      )}
                    >
                      <span className="font-medium">{entry.workItem?.title ?? "Zadanie"}</span>
                      {entry.carriedOver ? (
                        <span className="ml-2 text-xs text-amber-700">przeniesione</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Card>

      <MyWorkEndDayDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        onSubmit={onEndDay}
      />
    </>
  );
}
