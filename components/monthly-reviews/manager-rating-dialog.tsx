"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { StarRatingInput } from "@/components/dashboard/star-rating-input";
import { HoursContextCard } from "@/components/monthly-reviews/hours-context-card";
import { submitManagerAssessment } from "@/lib/supabase/monthly-review-repository";
import type { MonthlyReviewTeamQueueRow } from "@/lib/monthly-reviews/types";

/** Ocena managera jest "ślepa" — celowo nie pokazujemy tu treści samooceny pracownika,
 * żeby ocena przełożonego nie była zakotwiczona jego oceną. */
export function ManagerRatingDialog({
  row,
  open,
  onOpenChange,
  onSubmitted,
}: {
  row: MonthlyReviewTeamQueueRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (rating < 1) {
      setError("Wybierz ocenę.");
      return;
    }
    if (!comment.trim()) {
      setError("Dodaj krótki komentarz do oceny.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitManagerAssessment({ employeeId: row.employeeId, rating, comment: comment.trim() });
      onSubmitted();
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać oceny.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ocena — {row.employeeName}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <HoursContextCard employeeId={row.employeeId} />

          <Field label="Ocena miesiąca">
            <StarRatingInput value={rating} onChange={setRating} max={10} size="md" />
          </Field>

          <Field label="Komentarz">
            <Textarea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Jak oceniasz zaangażowanie i pracę tej osoby w tym miesiącu…"
            />
          </Field>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleConfirm()}>
            <Check className="mr-2 h-4 w-4" />
            {saving ? "Zapisywanie…" : "Zapisz ocenę"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
