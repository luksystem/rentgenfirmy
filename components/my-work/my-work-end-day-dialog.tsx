"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { fetchWorkDaySummaryAi } from "@/lib/supabase/my-work-repository";

export function MyWorkEndDayDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    employeeComment: string;
    carryOverUnfinished: boolean;
    aiDraft?: string;
  }) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [carryOver, setCarryOver] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleGenerateAi() {
    setGenerating(true);
    try {
      const result = await fetchWorkDaySummaryAi();
      setAiDraft(result.draft);
      if (!comment.trim()) {
        setComment(result.draft);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się wygenerować szkicu AI.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!comment.trim()) {
      window.alert("Napisz krótkie podsumowanie dnia.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        employeeComment: comment,
        carryOverUnfinished: carryOver,
        aiDraft: aiDraft || undefined,
      });
      onOpenChange(false);
      setComment("");
      setAiDraft("");
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

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={generating}
            onClick={() => void handleGenerateAi()}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {generating ? "Generuję szkic…" : "Wygeneruj szkic AI"}
          </Button>
        </div>

        <Field label="Podsumowanie">
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            placeholder="Np. ukończyłem montaż w salonie, czekam na akcept klienta. Jutro dokończę konfigurację BMS."
          />
        </Field>

        {aiDraft && aiDraft !== comment ? (
          <p className="text-xs text-muted">Szkic AI zapisany osobno w historii dnia.</p>
        ) : null}

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
