"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import {
  WORK_ITEM_COMPLETE_OUTCOMES,
  type WorkItemCompleteOutcome,
  type WorkItemView,
} from "@/lib/my-work/types";

const OUTCOME_LABELS: Record<WorkItemCompleteOutcome, string> = {
  done: "Wykonane",
  partial: "Częściowo wykonane",
  not_done: "Niewykonane",
  deferred: "Przełożone",
  blocked: "Zablokowane",
};

export function MyWorkCompleteDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
}: {
  item: WorkItemView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    outcome: WorkItemCompleteOutcome,
    comment: string,
    workDescription: string,
  ) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<WorkItemCompleteOutcome>("done");
  const [comment, setComment] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!item) return;
    if (outcome !== "done" && !comment.trim()) {
      window.alert("Komentarz jest wymagany dla tego statusu.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(outcome, comment, workDescription);
      onOpenChange(false);
      setComment("");
      setWorkDescription("");
      setOutcome("done");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zamknąć zadania.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Podsumuj wykonanie</DialogTitle>
          <DialogDescription>Oceń postęp pracy nad zadaniem: {item.title}</DialogDescription>
        </DialogHeader>

        <Field label="Wynik">
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as WorkItemCompleteOutcome)}
          >
            {WORK_ITEM_COMPLETE_OUTCOMES.map((entry) => (
              <option key={entry} value={entry}>
                {OUTCOME_LABELS[entry]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={outcome === "done" ? "Komentarz (opcjonalnie)" : "Komentarz (wymagany)"}>
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
        </Field>

        <Field label="Opis wykonanych prac">
          <Textarea
            value={workDescription}
            onChange={(event) => setWorkDescription(event.target.value)}
            rows={3}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Zapisz podsumowanie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
