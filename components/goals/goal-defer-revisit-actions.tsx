"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  GOAL_DEFERRAL_REASON_LABELS,
  GOAL_DEFERRAL_REASONS,
  computeNextPeriod,
  type Goal,
  type GoalDeferralReason,
} from "@/lib/goals/types";
import { deferGoal, setGoalRevisit } from "@/lib/supabase/goal-repository";

export function GoalDeferRevisitActions({
  goal,
  authorId,
  meetingId,
  onChanged,
}: {
  goal: Goal;
  authorId: string | null;
  meetingId?: string | null;
  onChanged: (goal: Goal) => void;
}) {
  const next = computeNextPeriod(goal.periodType, goal.periodEnd);
  const [deferReason, setDeferReason] = useState<GoalDeferralReason>("internal");
  const [deferNote, setDeferNote] = useState("");
  const [periodStart, setPeriodStart] = useState(next.periodStart);
  const [periodEnd, setPeriodEnd] = useState(next.periodEnd);
  const [revisitAt, setRevisitAt] = useState(goal.revisitAt?.slice(0, 10) ?? "");
  const [revisitNote, setRevisitNote] = useState("");
  const [busy, setBusy] = useState<"defer" | "revisit" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [invalidDeferNote, setInvalidDeferNote] = useState(false);
  const [invalidRevisitAt, setInvalidRevisitAt] = useState(false);
  const [invalidRevisitNote, setInvalidRevisitNote] = useState(false);

  async function handleDefer() {
    if (!deferNote.trim()) {
      setInvalidDeferNote(true);
      setError("Uzupełnij notatkę do przełożenia celu.");
      return;
    }
    setBusy("defer");
    setError(null);
    setInvalidDeferNote(false);
    try {
      const result = await deferGoal({
        goalId: goal.id,
        reason: deferReason,
        note: deferNote,
        meetingId,
        authorId,
        periodStart,
        periodEnd,
      });
      onChanged(result.goal);
      setDeferNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przełożyć celu.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevisit() {
    const missingDate = !revisitAt;
    const missingNote = !revisitNote.trim();
    if (missingDate || missingNote) {
      setInvalidRevisitAt(missingDate);
      setInvalidRevisitNote(missingNote);
      setError(
        missingDate && missingNote
          ? "Podaj datę powrotu i notatkę."
          : missingDate
            ? "Podaj datę powrotu do celu."
            : "Uzupełnij notatkę do oznaczenia powrotu.",
      );
      return;
    }
    setBusy("revisit");
    setError(null);
    setInvalidRevisitAt(false);
    setInvalidRevisitNote(false);
    try {
      const updated = await setGoalRevisit({
        goalId: goal.id,
        needsRevisit: true,
        revisitAt,
        note: revisitNote,
        authorId,
      });
      onChanged(updated);
      setRevisitNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się oznaczyć powrotu.");
    } finally {
      setBusy(null);
    }
  }

  async function handleClearRevisit() {
    setBusy("clear");
    setError(null);
    try {
      const updated = await setGoalRevisit({
        goalId: goal.id,
        needsRevisit: false,
        authorId,
      });
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć oznaczenia.");
    } finally {
      setBusy(null);
    }
  }

  if (goal.status === "settled" || goal.status === "cancelled") {
    return null;
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-clip rounded-xl border border-border/70 bg-surface-muted/10 p-3">
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          Trzeba do tego wrócić
        </p>
        {goal.needsRevisit ? (
          <p className="text-sm text-violet-200">
            Oznaczone{goal.revisitAt ? ` · data: ${goal.revisitAt}` : ""}
          </p>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field
            label="Data powrotu *"
            className="min-w-0"
            invalid={invalidRevisitAt}
            error={invalidRevisitAt ? "Podaj datę." : undefined}
          >
            <Input
              type="date"
              className="min-w-0 max-w-full"
              invalid={invalidRevisitAt}
              value={revisitAt}
              onChange={(e) => {
                setRevisitAt(e.target.value);
                if (e.target.value) setInvalidRevisitAt(false);
              }}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy != null}
              onClick={() => void handleRevisit()}
            >
              {busy === "revisit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Oznacz
            </Button>
            {goal.needsRevisit ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy != null}
                onClick={() => void handleClearRevisit()}
              >
                {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Usuń
              </Button>
            ) : null}
          </div>
        </div>
        <Field
          label="Notatka *"
          className="min-w-0"
          invalid={invalidRevisitNote}
          error={invalidRevisitNote ? "Notatka jest obowiązkowa." : undefined}
        >
          <Input
            className="min-w-0 max-w-full"
            invalid={invalidRevisitNote}
            value={revisitNote}
            onChange={(e) => {
              setRevisitNote(e.target.value);
              if (e.target.value.trim()) setInvalidRevisitNote(false);
            }}
            placeholder="Dlaczego trzeba wrócić…"
          />
        </Field>
      </div>

      <div className="min-w-0 space-y-2 border-t border-border/60 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Przełóż na kolejny okres
        </p>
        <p className="text-xs text-muted">
          Cel wraca do „Planowanie”. Niedowieziony = z naszego powodu; przełożony = poza naszą
          kontrolą. Zapis trafia do historii i raportów.
        </p>
        <Field label="Powód" className="min-w-0">
          <Select
            className="min-w-0 max-w-full"
            value={deferReason}
            onChange={(e) => setDeferReason(e.target.value as GoalDeferralReason)}
          >
            {GOAL_DEFERRAL_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {GOAL_DEFERRAL_REASON_LABELS[reason]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Nowy okres od" className="min-w-0">
            <Input
              type="date"
              className="min-w-0 max-w-full"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </Field>
          <Field label="Nowy okres do" className="min-w-0">
            <Input
              type="date"
              className="min-w-0 max-w-full"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Notatka *"
          className="min-w-0"
          invalid={invalidDeferNote}
          error={invalidDeferNote ? "Notatka jest obowiązkowa." : undefined}
        >
          <Textarea
            className="min-w-0 max-w-full"
            invalid={invalidDeferNote}
            value={deferNote}
            onChange={(e) => {
              setDeferNote(e.target.value);
              if (e.target.value.trim()) setInvalidDeferNote(false);
            }}
            rows={2}
            placeholder="Kontekst przełożenia…"
          />
        </Field>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy != null}
          onClick={() => void handleDefer()}
        >
          {busy === "defer" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Przełóż cel
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
