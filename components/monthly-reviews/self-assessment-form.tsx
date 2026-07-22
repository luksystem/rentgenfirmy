"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { StarRatingInput } from "@/components/dashboard/star-rating-input";
import { submitMyselfAssessment } from "@/lib/supabase/monthly-review-repository";
import type { MonthlyReviewSelfView } from "@/lib/monthly-reviews/types";

export function SelfAssessmentForm({
  periodMonthLabel,
  onSubmitted,
}: {
  periodMonthLabel: string;
  onSubmitted: (view: MonthlyReviewSelfView) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating < 1) {
      setError("Wybierz ocenę swojego miesiąca.");
      return;
    }
    if (!comment.trim()) {
      setError("Opisz krótko, jak minął Twój miesiąc.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const view = await submitMyselfAssessment({ rating, comment: comment.trim() });
      onSubmitted(view);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać samooceny.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <div>
          <p className="text-sm font-semibold text-foreground">Samoocena — {periodMonthLabel}</p>
          <p className="mt-1 text-sm text-muted">
            Sprawdź swoje godziny powyżej, oceń swoje zaangażowanie w tym miesiącu i opisz, jak go
            oceniasz. Twój przełożony ocenia Cię niezależnie — nie widzi tego, co tu napiszesz.
            Wysyłając samoocenę, jednocześnie potwierdzasz i wysyłasz swoje godziny do akceptacji
            (jeśli jeszcze tego nie zrobiłeś/-aś).
          </p>
        </div>

        <Field label="Twoja ocena miesiąca">
          <StarRatingInput value={rating} onChange={setRating} max={10} size="md" />
        </Field>

        <Field label="Jak oceniasz swój miesiąc?">
          <Textarea
            rows={5}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Co się udało, z czym były trudności, jak oceniasz swoje zaangażowanie…"
          />
        </Field>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button type="button" disabled={saving} onClick={() => void handleSubmit()} className="w-fit">
          {saving ? "Zapisywanie…" : "Wyślij samoocenę"}
        </Button>
      </CardContent>
    </Card>
  );
}
