"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import type { ServiceIntakeRecord, ServiceIntakeStuckFeedback } from "@/lib/service-intake/types";

export function ServiceIntakeStuckDialog({
  intake,
  open,
  onOpenChange,
  onSubmit,
}: {
  intake: ServiceIntakeRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: ServiceIntakeStuckFeedback) => Promise<void>;
}) {
  const [stuckReason, setStuckReason] = useState("");
  const [stuckNotes, setStuckNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !intake) {
      return;
    }
    setStuckReason(intake.stuckReason ?? "");
    setStuckNotes(intake.stuckNotes ?? "");
    setError(null);
  }, [open, intake]);

  async function handleSubmit() {
    if (!stuckReason.trim()) {
      setError("Podaj powód utknięcia.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        stuckReason: stuckReason.trim(),
        stuckNotes: stuckNotes.trim(),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  if (!intake) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Utknięte: {intake.referenceNumber}</DialogTitle>
          <DialogDescription>
            Zgłoszenie wraca do kolumny „Utknięte”. Licznik podejść zwiększy się o 1 (obecnie:{" "}
            {intake.attemptCount}).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Powód utknięcia">
            <Textarea
              value={stuckReason}
              onChange={(event) => setStuckReason(event.target.value)}
              rows={3}
              placeholder="Czego brakuje / co blokuje?"
            />
          </Field>

          <Field label="Co zrobiono w tym podejściu? (opcjonalnie)">
            <Textarea
              value={stuckNotes}
              onChange={(event) => setStuckNotes(event.target.value)}
              rows={3}
            />
          </Field>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? "Zapisywanie…" : "Oznacz jako utknięte"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
