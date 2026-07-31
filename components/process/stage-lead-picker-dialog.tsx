"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchStageLeadCandidates,
  setStageLead,
} from "@/lib/supabase/stage-lead-repository";
import type { RankedStageLeadCandidate } from "@/lib/resource-plan/stage-lead-ranking";

/**
 * D46 — wybór lidera etapu z rankowanej listy kandydatów. Ranking, nie pełna lista alfabetyczna:
 * kolejność sama niesie rekomendację (przydzielony do etapu -> zna projekt -> kompetencja ->
 * dostępny -> ciągłość), więc pierwszy kandydat na liście jest tym, kogo koordynator operacyjny
 * najpewniej wybierze.
 *
 * Notatka przekazania wymagana TYLKO przy zastąpieniu istniejącego lidera — baza (
 * `set_project_stage_lead`) i tak to wymusi, pole jest tu warunkowe wyłącznie dla wygody, nie
 * jako jedyna linia obrony.
 */
export function StageLeadPickerDialog({
  open,
  onOpenChange,
  projectId,
  stageId,
  stageTitle,
  currentLeadUserId,
  currentLeadName,
  changedBy,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  stageId: string;
  stageTitle: string;
  currentLeadUserId: string | null;
  currentLeadName: string | null;
  changedBy: string | null;
  onSaved?: () => void;
}) {
  const [candidates, setCandidates] = useState<RankedStageLeadCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(currentLeadUserId);
  const [handoverNote, setHandoverNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId(currentLeadUserId);
    setHandoverNote("");
    setError(null);
    setLoading(true);
    void fetchStageLeadCandidates(projectId, stageId)
      .then(setCandidates)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Nie udało się wczytać kandydatów.");
        setCandidates([]);
      })
      .finally(() => setLoading(false));
  }, [open, projectId, stageId, currentLeadUserId]);

  const isReplacement = Boolean(currentLeadUserId) && selectedId !== currentLeadUserId;

  async function handleSave() {
    if (isReplacement && !handoverNote.trim()) {
      setError("Zmiana lidera wymaga notatki przekazania — kto przejmuje i na czym stoi lista montażowa.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setStageLead({
        projectId,
        stageId,
        userId: selectedId,
        handoverNote: handoverNote.trim() || null,
        changedBy,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać lidera etapu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lider etapu — {stageTitle}</DialogTitle>
          <DialogDescription>
            {currentLeadName
              ? `Obecny lider: ${currentLeadName}.`
              : "Etap nie ma dziś wskazanego lidera."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted">Wczytywanie kandydatów…</p>
        ) : (
          <div className="grid gap-4">
            <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1">
              <label
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  selectedId === null
                    ? "border-accent bg-accent/10"
                    : "border-border/60 bg-surface/40",
                )}
              >
                <input
                  type="radio"
                  name="stage-lead"
                  className="mt-1 h-3.5 w-3.5"
                  checked={selectedId === null}
                  onChange={() => setSelectedId(null)}
                />
                <span className="text-muted">— brak lidera —</span>
              </label>
              {candidates.map((candidate) => (
                <label
                  key={candidate.userId}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                    selectedId === candidate.userId
                      ? "border-accent bg-accent/10"
                      : "border-border/60 bg-surface/40",
                  )}
                >
                  <input
                    type="radio"
                    name="stage-lead"
                    className="mt-1 h-3.5 w-3.5"
                    checked={selectedId === candidate.userId}
                    onChange={() => setSelectedId(candidate.userId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground">
                      {candidate.userName ?? "Nieznana osoba"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {candidate.reasons.join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {isReplacement ? (
              <Field label="Notatka przekazania (wymagana przy zmianie)">
                <Textarea
                  rows={3}
                  autoFocus
                  value={handoverNote}
                  onChange={(event) => setHandoverNote(event.target.value)}
                  placeholder="Kto przejmuje i na czym stoi lista montażowa."
                />
              </Field>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Zapisywanie…" : "Zapisz"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
