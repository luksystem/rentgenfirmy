"use client";

import { useState } from "react";
import { TemplateChecklistLinesEditor } from "@/components/process/template-checklist-lines-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { templatePayloadFromTitle } from "@/lib/process/item-payload";
import {
  PROCESS_ITEM_KINDS,
  PROCESS_ITEM_KIND_LABELS,
  type ProcessElement,
  type ProcessItemKind,
} from "@/lib/process/types";

export function ProcessElementEditor({
  initialElement,
  onSave,
  onDelete,
}: {
  initialElement: ProcessElement;
  onSave: (element: ProcessElement) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [element, setElement] = useState(initialElement);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSave({ ...element, updatedAt: new Date().toISOString() });
      setMessage("Element zapisany.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu elementu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania elementu.");
      setIsDeleting(false);
    }
  }

  function updateKind(kind: ProcessItemKind) {
    setElement((current) => ({
      ...current,
      kind,
      defaultPayload:
        kind === "checklist"
          ? current.defaultPayload.lines.length
            ? current.defaultPayload
            : templatePayloadFromTitle(current.title, kind)
          : templatePayloadFromTitle(current.title, kind),
    }));
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-5">
        <Field label="Nazwa elementu">
          <Input
            value={element.title}
            onChange={(event) => setElement({ ...element, title: event.target.value })}
          />
        </Field>
        <Field label="Typ">
          <Select value={element.kind} onChange={(event) => updateKind(event.target.value as ProcessItemKind)}>
            {PROCESS_ITEM_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PROCESS_ITEM_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Opis">
          <Input
            value={element.description}
            onChange={(event) => setElement({ ...element, description: event.target.value })}
          />
        </Field>

        {element.kind === "checklist" ? (
          <TemplateChecklistLinesEditor
            label="Punkty checklisty (wzorzec)"
            payload={element.defaultPayload}
            onChange={(defaultPayload) => setElement({ ...element, defaultPayload })}
          />
        ) : (
          <p className="text-sm text-muted">
            Ten typ elementu będzie rozwijany w kolejnych fazach (formularz protokołu, rozliczenie).
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Zapisywanie…" : "Zapisz element"}
          </Button>
          {onDelete ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting || isSaving}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Usuwanie…" : "Usuń element"}
            </Button>
          ) : null}
        </div>

        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
