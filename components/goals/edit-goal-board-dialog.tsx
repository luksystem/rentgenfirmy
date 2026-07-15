"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  type GoalBoard,
  type GoalPeriodType,
} from "@/lib/goals/types";
import { useGoalStore } from "@/store/goal-store";

const WEEKDAY_LABELS = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

export function EditGoalBoardDialog({
  board,
  trigger,
}: {
  board: GoalBoard;
  trigger?: React.ReactNode;
}) {
  const updateBoard = useGoalStore((state) => state.updateBoard);
  const teamProfiles = useGoalStore((state) => state.teamProfiles);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description);
  const [reviewFrequency, setReviewFrequency] = useState<string>(board.reviewFrequency ?? "");
  const [reviewWeekday, setReviewWeekday] = useState<string>(
    board.reviewWeekday != null ? String(board.reviewWeekday) : "1",
  );
  const [reviewResponsibleId, setReviewResponsibleId] = useState(board.reviewResponsibleId ?? "");
  const [reviewNotify, setReviewNotify] = useState(board.reviewNotify);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(board.name);
      setDescription(board.description);
      setReviewFrequency(board.reviewFrequency ?? "");
      setReviewWeekday(board.reviewWeekday != null ? String(board.reviewWeekday) : "1");
      setReviewResponsibleId(board.reviewResponsibleId ?? "");
      setReviewNotify(board.reviewNotify);
      setError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Podaj nazwę tablicy.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateBoard(board.id, {
        name: name.trim(),
        description: description.trim(),
        reviewFrequency: (reviewFrequency || null) as GoalPeriodType | null,
        reviewWeekday:
          reviewFrequency === "weekly"
            ? Number(reviewWeekday)
            : null,
        reviewResponsibleId: reviewResponsibleId || null,
        reviewNotify,
      });
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Edytuj tablicę">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj tablicę</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Nazwa tablicy">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="np. Cele sprzedażowe 2026"
            />
          </Field>
          <Field label="Opis (opcjonalnie)">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </Field>

          <div className="rounded-xl border border-border bg-surface-muted/20 p-3 space-y-3">
            <p className="text-sm font-medium">Harmonogram przeglądu</p>
            <Field label="Częstotliwość">
              <Select value={reviewFrequency} onChange={(e) => setReviewFrequency(e.target.value)}>
                <option value="">Bez harmonogramu</option>
                <option value="daily">Raz na dzień</option>
                <option value="weekly">Raz na tydzień</option>
                <option value="monthly">Raz na miesiąc</option>
                <option value="quarterly">Raz na kwartał</option>
                <option value="annual">Raz na rok</option>
              </Select>
            </Field>
            {reviewFrequency === "weekly" ? (
              <Field label="Dzień tygodnia">
                <Select value={reviewWeekday} onChange={(e) => setReviewWeekday(e.target.value)}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={String(index)}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Osoba odpowiedzialna za przegląd">
              <Select
                value={reviewResponsibleId}
                onChange={(e) => setReviewResponsibleId(e.target.value)}
              >
                <option value="">Nie wybrano</option>
                {teamProfiles.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getUserDisplayName(member)}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewNotify}
                onChange={(e) => setReviewNotify(e.target.checked)}
              />
              Powiadomienie w dniu przeglądu do osoby odpowiedzialnej
            </label>
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
