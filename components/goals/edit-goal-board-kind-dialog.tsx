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
import { GoalBoardKindIcon, GOAL_BOARD_KIND_ICON_OPTIONS } from "@/components/goals/goal-board-kind-icon";
import type { GoalBoardKind } from "@/lib/goals/types";
import { useGoalStore } from "@/store/goal-store";

export function EditGoalBoardKindDialog({
  kind,
  trigger,
}: {
  kind: GoalBoardKind;
  trigger?: React.ReactNode;
}) {
  const updateBoardKind = useGoalStore((state) => state.updateBoardKind);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(kind.label);
  const [description, setDescription] = useState(kind.description);
  const [icon, setIcon] = useState(kind.icon);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLabel(kind.label);
      setDescription(kind.description);
      setIcon(kind.icon);
      setError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) {
      setError("Podaj nazwę kategorii.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateBoardKind(kind.code, { label: label.trim(), description: description.trim(), icon });
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Edytuj kategorię"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj kategorię tablic</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Nazwa kategorii">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          <Field label="Opis (opcjonalnie)">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </Field>
          <Field label="Ikona">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-accent">
                <GoalBoardKindIcon icon={icon} className="h-4.5 w-4.5" />
              </div>
              <Select value={icon} onChange={(event) => setIcon(event.target.value)} className="flex-1">
                {GOAL_BOARD_KIND_ICON_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
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
