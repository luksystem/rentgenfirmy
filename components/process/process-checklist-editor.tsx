"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { checklistProgress } from "@/lib/process/item-payload";
import type { ChecklistItemPayload } from "@/lib/process/types";

export function ProcessChecklistEditor({
  initialPayload,
  actorName,
  disabled = false,
  onSave,
}: {
  initialPayload: ChecklistItemPayload;
  actorName?: string;
  disabled?: boolean;
  onSave: (payload: ChecklistItemPayload) => Promise<void>;
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPayload(initialPayload);
  }, [initialPayload]);

  const progress = checklistProgress(payload);

  async function persist(nextPayload: ChecklistItemPayload) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSave(nextPayload);
      setPayload(nextPayload);
      setMessage("Zapisano.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu checklisty.");
    } finally {
      setIsSaving(false);
    }
  }

  function addLine() {
    setPayload((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          id: crypto.randomUUID(),
          text: "",
          checked: false,
        },
      ],
    }));
  }

  function updateLineLocal(lineId: string, patch: Partial<ChecklistItemPayload["lines"][number]>) {
    setPayload((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    }));
  }

  async function toggleLine(lineId: string, checked: boolean) {
    const nextPayload: ChecklistItemPayload = {
      ...payload,
      lines: payload.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              checked,
              checkedAt: checked ? new Date().toISOString() : undefined,
              checkedBy: checked ? actorName : undefined,
            }
          : line,
      ),
    };
    await persist(nextPayload);
  }

  async function saveLine(lineId: string) {
    const line = payload.lines.find((entry) => entry.id === lineId);
    if (!line) {
      return;
    }

    if (!line.text.trim()) {
      await persist({
        ...payload,
        lines: payload.lines.filter((entry) => entry.id !== lineId),
      });
      return;
    }

    await persist(payload);
  }

  async function removeLine(lineId: string) {
    await persist({
      ...payload,
      lines: payload.lines.filter((line) => line.id !== lineId),
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {progress.total > 0
            ? `${progress.completed}/${progress.total} punktów ukończonych`
            : "Checklista zostanie wczytana ze szablonu procesu — możesz ją dostosować w projekcie."}
        </p>
        <Button type="button" size="sm" variant="secondary" disabled={disabled || isSaving} onClick={addLine}>
          Dodaj punkt
        </Button>
      </div>

      <div className="grid gap-2">
        {payload.lines.length ? (
          payload.lines.map((line) => (
            <div
              key={line.id}
              className="grid gap-2 rounded-xl border border-border/70 bg-surface/60 p-3 sm:grid-cols-[auto_1fr_auto]"
            >
              <input
                type="checkbox"
                checked={line.checked}
                disabled={disabled || isSaving || !line.text.trim()}
                onChange={(event) => void toggleLine(line.id, event.target.checked)}
                className="mt-2 h-4 w-4 rounded border-border"
              />
              <Input
                value={line.text}
                disabled={disabled || isSaving}
                placeholder="Opis punktu checklisty"
                onChange={(event) => updateLineLocal(line.id, { text: event.target.value })}
                onBlur={() => void saveLine(line.id)}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || isSaving}
                onClick={() => void removeLine(line.id)}
              >
                Usuń
              </Button>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 px-3 py-4 text-sm text-muted">
            Brak punktów — dodaj pierwszy punkt checklisty.
          </p>
        )}
      </div>

      <Field label="Notatka">
        <Textarea
          value={payload.note ?? ""}
          disabled={disabled || isSaving}
          placeholder="Opcjonalna notatka do checklisty"
          onChange={(event) => setPayload({ ...payload, note: event.target.value })}
          onBlur={() => void persist(payload)}
        />
      </Field>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {isSaving ? <p className="text-xs text-muted">Zapisywanie…</p> : null}
    </div>
  );
}
