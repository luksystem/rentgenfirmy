"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { GoalBoardKind } from "@/lib/goals/types";
import { useGoalStore } from "@/store/goal-store";

export function CreateGoalBoardDialog({ boardKinds }: { boardKinds: GoalBoardKind[] }) {
  const createBoard = useGoalStore((state) => state.createBoard);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(boardKinds[0]?.code ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !kind) {
      setError("Podaj nazwę tablicy i wybierz typ.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createBoard({ kind, name: name.trim(), description: description.trim() });
      setOpen(false);
      setName("");
      setDescription("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się utworzyć tablicy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nowa tablica
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowa tablica celów</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Typ tablicy">
            <Select value={kind} onChange={(event) => setKind(event.target.value)}>
              {boardKinds.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nazwa tablicy">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="np. Cele sprzedażowe 2026"
            />
          </Field>
          <Field label="Opis (opcjonalnie)">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </Field>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie..." : "Utwórz tablicę"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
