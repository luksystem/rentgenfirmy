"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { moveItem, removeAt, withPositions } from "@/lib/process/template-editor-utils";
import type { KanbanTemplatePayload } from "@/lib/process/kanban-types";

export function KanbanTemplateColumnsEditor({
  payload,
  onChange,
}: {
  payload: KanbanTemplatePayload;
  onChange: (payload: KanbanTemplatePayload) => void;
}) {
  function updateTitle(index: number, title: string) {
    onChange({
      ...payload,
      columns: payload.columns.map((column, columnIndex) =>
        columnIndex === index ? { ...column, title } : column,
      ),
    });
  }

  function addColumn() {
    onChange({
      ...payload,
      columns: [
        ...payload.columns,
        { id: crypto.randomUUID(), title: "", position: payload.columns.length },
      ],
    });
  }

  function removeColumn(index: number) {
    onChange({ ...payload, columns: withPositions(removeAt(payload.columns, index)) });
  }

  function moveColumn(index: number, direction: "up" | "down") {
    onChange({ ...payload, columns: withPositions(moveItem(payload.columns, index, direction)) });
  }

  function updateAccessField(field: "publicAccessPassword" | "publicAccessUsername" | "publicAuthorName", value: string) {
    onChange({
      ...payload,
      [field]: value.trim() ? value : undefined,
    });
  }

  return (
    <div className="grid gap-4">
      <Field label="Kolumny tablicy Kanban">
      <div className="grid gap-2">
        {payload.columns.map((column, index) => (
          <div
            key={column.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface/40 p-2"
          >
            <Input
              value={column.title}
              placeholder={`Kolumna ${index + 1}`}
              onChange={(event) => updateTitle(index, event.target.value)}
            />
            <div className="flex shrink-0 gap-1">
              <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => moveColumn(index, "up")}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="secondary" disabled={index === payload.columns.length - 1} onClick={() => moveColumn(index, "down")}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="secondary" disabled={payload.columns.length <= 1} onClick={() => removeColumn(index)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" size="sm" variant="secondary" className="w-fit" onClick={addColumn}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Dodaj kolumnę
        </Button>
      </div>
      </Field>

      <div className="rounded-xl border border-border/70 bg-surface/30 p-4">
        <p className="text-sm font-medium text-foreground">Dostęp do publicznego linku</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Hasło trafi na tablicę przy wdrożeniu procesu. Klient wpisze je zamiast podawania imienia.
          Opcjonalnie możesz wymusić też login.
        </p>
        <div className="mt-3 grid gap-3">
          <Field label="Hasło dostępu">
            <Input
              type="password"
              value={payload.publicAccessPassword ?? ""}
              placeholder="np. kod z protokołu wdrożenia"
              autoComplete="new-password"
              onChange={(event) => updateAccessField("publicAccessPassword", event.target.value)}
            />
          </Field>
          <Field label="Login (opcjonalnie)">
            <Input
              value={payload.publicAccessUsername ?? ""}
              placeholder="np. nazwa klienta lub gospodarstwa"
              autoComplete="username"
              onChange={(event) => updateAccessField("publicAccessUsername", event.target.value)}
            />
          </Field>
          <Field label="Nazwa w historii (gdy brak loginu)">
            <Input
              value={payload.publicAuthorName ?? ""}
              placeholder="Domyślnie: Klient"
              onChange={(event) => updateAccessField("publicAuthorName", event.target.value)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
