"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { saveMonthlyReviewDecision } from "@/lib/supabase/monthly-review-repository";
import {
  MONTHLY_REVIEW_DECISION_STATUSES,
  MONTHLY_REVIEW_DECISION_STATUS_LABELS,
  type MonthlyReviewDecision,
  type MonthlyReviewDecisionStatus,
} from "@/lib/monthly-reviews/types";

export function DecisionForm({
  reviewId,
  decision,
  onSaved,
}: {
  reviewId: string;
  decision: MonthlyReviewDecision | null;
  onSaved: (decision: MonthlyReviewDecision) => void;
}) {
  const [status, setStatus] = useState<MonthlyReviewDecisionStatus>(decision?.status ?? "pending");
  const [amount, setAmount] = useState<number>(decision?.amount ?? 0);
  const [note, setNote] = useState(decision?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveMonthlyReviewDecision(reviewId, {
        status,
        amount: amount > 0 ? amount : null,
        note: note.trim(),
      });
      onSaved(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać decyzji.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <p className="text-sm font-semibold text-foreground">Decyzja</p>

        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as MonthlyReviewDecisionStatus)}>
            {MONTHLY_REVIEW_DECISION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {MONTHLY_REVIEW_DECISION_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Kwota premii/podwyżki (opcjonalnie)">
          <NumericInput value={amount} onChange={setAmount} placeholder="0" />
        </Field>

        <Field label="Notatka">
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button type="button" disabled={saving} onClick={() => void handleSave()} className="w-fit">
          {saving ? "Zapisywanie…" : "Zapisz decyzję"}
        </Button>

        {decision?.decidedAt ? (
          <p className="text-xs text-muted">Ostatnio zapisano: {new Date(decision.decidedAt).toLocaleString("pl-PL")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
