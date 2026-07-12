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

export function MyWorkEndDayDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comment: string, carryOverUnfinished: boolean) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [carryOver, setCarryOver] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!comment.trim()) {
      window.alert("Napisz krótkie podsumowanie dnia.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(comment, carryOver);
      onOpenChange(false);
      setComment("");
      setCarryOver(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zakończyć dnia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Podsumuj dzień</DialogTitle>
          <DialogDescription>
            Opisz co udało się wykonać, co zostało otwarte i czy są przeszkody na jutro.
          </DialogDescription>
        </DialogHeader>

        <Field label="Podsumowanie">
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            placeholder="Np. ukończyłem montaż w salonie, czekam na akcept klienta. Jutro dokończę konfigurację BMS."
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={carryOver}
            onChange={(event) => setCarryOver(event.target.checked)}
          />
          Przenieś niewykonane zadania na jutro
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            Zakończ dzień
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
