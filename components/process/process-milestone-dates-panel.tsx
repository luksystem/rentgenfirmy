"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { formatMilestoneDate, inputToMilestoneDate, milestoneDateToInput } from "@/lib/process/dates";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";

export function ProcessMilestoneDatesPanel({
  template,
  process,
  onSaveDate,
}: {
  template: ProcessTemplate;
  process: ProjectProcess;
  onSaveDate: (milestoneId: string, date: string | null) => Promise<void>;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const milestones = template.stages.flatMap((stage) =>
    stage.milestones.map((milestone) => ({
      ...milestone,
      stageTitle: stage.title,
    })),
  );

  if (!milestones.length) {
    return null;
  }

  async function handleChange(milestoneId: string, value: string) {
    setSavingId(milestoneId);
    setError(null);
    try {
      await onSaveDate(milestoneId, inputToMilestoneDate(value));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu daty.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-border/80 bg-surface-muted/30 p-4">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Daty kamieni milowych</h3>
      </div>
      <p className="mb-4 text-xs text-muted">
        Planowane terminy ustawiasz w projekcie — szablon procesu ich nie zawiera.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {milestones.map((milestone) => {
          const date = process.milestoneDates[milestone.id] ?? null;
          const formatted = formatMilestoneDate(date);

          return (
            <div
              key={milestone.id}
              className="rounded-xl border border-border/70 bg-surface/60 p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-accent/90">
                {milestone.stageTitle}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{milestone.title}</p>
              <Field label="Planowana data" className="mt-3">
                <Input
                  type="date"
                  value={milestoneDateToInput(date)}
                  disabled={savingId === milestone.id}
                  onChange={(event) => void handleChange(milestone.id, event.target.value)}
                />
              </Field>
              {formatted ? (
                <p className="mt-1 text-xs text-muted">{formatted}</p>
              ) : (
                <p className="mt-1 text-xs text-muted">Brak daty</p>
              )}
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
