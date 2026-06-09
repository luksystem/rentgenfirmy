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
      columns: payload.columns.map((column, columnIndex) =>
        columnIndex === index ? { ...column, title } : column,
      ),
    });
  }

  function addColumn() {
    onChange({
      columns: [
        ...payload.columns,
        { id: crypto.randomUUID(), title: "", position: payload.columns.length },
      ],
    });
  }

  function removeColumn(index: number) {
    onChange({ columns: withPositions(removeAt(payload.columns, index)) });
  }

  function moveColumn(index: number, direction: "up" | "down") {
    onChange({ columns: withPositions(moveItem(payload.columns, index, direction)) });
  }

  return (
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
  );
}
