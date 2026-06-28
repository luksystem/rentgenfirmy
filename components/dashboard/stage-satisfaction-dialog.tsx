"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/dashboard/star-rating-input";
import type { ReviewSide } from "@/lib/dashboard/satisfaction-types";
import { useProjectSatisfactionStore } from "@/store/project-satisfaction-store";

export function StageSatisfactionDialog({
  open,
  projectId,
  stageId,
  stageTitle,
  authorName,
  authorSide,
  onDismiss,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  stageId: string;
  stageTitle: string;
  authorName: string;
  authorSide: ReviewSide;
  onDismiss: () => void;
  onSaved?: () => void;
}) {
  const saveStageSatisfaction = useProjectSatisfactionStore((state) => state.saveStageSatisfaction);
  const existing = useProjectSatisfactionStore((state) =>
    state.byProject[projectId]?.stageSatisfactions.find(
      (entry) => entry.stageId === stageId && entry.authorSide === authorSide,
    ),
  );

  const [score, setScore] = useState(0);
  const [bestAspect, setBestAspect] = useState("");
  const [worstAspect, setWorstAspect] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScore(existing?.score ?? 0);
    setBestAspect(existing?.bestAspect ?? "");
    setWorstAspect(existing?.worstAspect ?? "");
    setComment(existing?.comment ?? "");
    setError(null);
  }, [existing, open]);

  async function handleSave() {
    if (score <= 0) {
      setError("Wybierz ocenę od 1 do 10 gwiazdek.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveStageSatisfaction(projectId, {
        stageId,
        stageTitle,
        score,
        bestAspect,
        worstAspect,
        comment,
        authorName,
        authorSide,
      });
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać oceny.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Oceń etap: {stageTitle}</DialogTitle>
          <DialogDescription>
            Etap procesu został ukończony. Podziel się opinią — pomoże nam to ulepszać wdrożenia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Poziom zadowolenia (0–10)">
            <StarRatingInput
              value={score}
              onChange={setScore}
              disabled={saving}
              size={authorSide === "client" ? "xs" : "sm"}
              subtle={authorSide === "client"}
            />
          </Field>

          <Field label="Co było najlepsze w tym etapie?">
            <Input
              value={bestAspect}
              disabled={saving}
              placeholder="np. szybka komunikacja, terminowość…"
              onChange={(event) => setBestAspect(event.target.value)}
            />
          </Field>

          <Field label="Co było najgorsze / wymaga poprawy?">
            <Input
              value={worstAspect}
              disabled={saving}
              placeholder="np. opóźnienia, brak informacji…"
              onChange={(event) => setWorstAspect(event.target.value)}
            />
          </Field>

          <Field label="Dodatkowy komentarz (opcjonalnie)">
            <Textarea
              value={comment}
              disabled={saving}
              rows={3}
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onDismiss}>
              Później
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : "Wyślij ocenę"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
