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
import { Field, Input, Textarea } from "@/components/ui/input";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { ActiveTimerView, StopTimerInput } from "@/lib/time-tracking/types";

export function TimeTimerStopDialog({
  open,
  onOpenChange,
  timer,
  elapsedMinutes,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timer: ActiveTimerView;
  elapsedMinutes: number;
  onConfirm: (input: StopTimerInput) => Promise<void>;
}) {
  const [description, setDescription] = useState(timer.description);
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm({
        description,
        breakMinutes: Number.parseInt(breakMinutes, 10) || 0,
      });
      setDescription("");
      setBreakMinutes("0");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zapisać wpisu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Zatrzymaj timer</DialogTitle>
          <DialogDescription>
            Zapisz {formatDurationMinutes(elapsedMinutes)} jako wpis czasu. Możesz dodać opis i odliczyć przerwę.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Opis wykonanej pracy">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Co zostało zrobione?"
            />
          </Field>
          <Field label="Dodatkowa przerwa (min)">
            <Input
              type="number"
              min={0}
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Zapisz wpis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
