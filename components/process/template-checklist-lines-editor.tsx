"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { moveItem, removeAt } from "@/lib/process/template-editor-utils";
import type { ChecklistItemPayload } from "@/lib/process/types";

export function TemplateChecklistLinesEditor({
  payload,
  onChange,
  label = "Wzorzec checklisty",
}: {
  payload: ChecklistItemPayload;
  onChange: (payload: ChecklistItemPayload) => void;
  label?: string;
}) {
  function updateLine(index: number, text: string) {
    onChange({
      ...payload,
      lines: payload.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, text } : line,
      ),
    });
  }

  function addLine() {
    onChange({
      ...payload,
      lines: [
        ...payload.lines,
        { id: crypto.randomUUID(), text: "", checked: false },
      ],
    });
  }

  function removeLine(index: number) {
    onChange({ ...payload, lines: removeAt(payload.lines, index) });
  }

  function moveLine(index: number, direction: "up" | "down") {
    onChange({ ...payload, lines: moveItem(payload.lines, index, direction) });
  }

  return (
    <Field label={label}>
      <div className="grid gap-2">
        {payload.lines.length ? (
          payload.lines.map((line, index) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface/40 p-2"
            >
              <Input
                value={line.text}
                placeholder={`Punkt ${index + 1}`}
                onChange={(event) => updateLine(index, event.target.value)}
              />
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => moveLine(index, "up")}
                  aria-label="Przesuń w górę"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === payload.lines.length - 1}
                  onClick={() => moveLine(index, "down")}
                  aria-label="Przesuń w dół"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => removeLine(index)}
                  aria-label="Usuń punkt"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted">
            Brak punktów wzorca — dodaj pierwszy punkt checklisty.
          </p>
        )}
        <Button type="button" size="sm" variant="secondary" className="w-fit" onClick={addLine}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Dodaj punkt wzorca
        </Button>
      </div>
    </Field>
  );
}
