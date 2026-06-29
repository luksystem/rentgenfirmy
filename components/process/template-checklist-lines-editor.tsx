"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { moveItem, removeAt } from "@/lib/process/template-editor-utils";
import { withChecklistSectionPositions } from "@/lib/process/item-payload";
import type { ChecklistItemPayload, ChecklistSection } from "@/lib/process/types";

export function TemplateChecklistLinesEditor({
  payload,
  onChange,
  label = "Wzorzec checklisty",
}: {
  payload: ChecklistItemPayload;
  onChange: (payload: ChecklistItemPayload) => void;
  label?: string;
}) {
  const sections =
    payload.sections?.length > 0
      ? payload.sections
      : [
          {
            id: crypto.randomUUID(),
            name: "Lista 1",
            position: 0,
            lines: payload.lines ?? [],
          },
        ];

  function updateSections(nextSections: ChecklistSection[]) {
    onChange({
      ...payload,
      sections: withChecklistSectionPositions(nextSections),
      lines: undefined,
    });
  }

  function updateSectionName(sectionId: string, name: string) {
    updateSections(sections.map((section) => (section.id === sectionId ? { ...section, name } : section)));
  }

  function updateLine(sectionId: string, lineIndex: number, text: string) {
    updateSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              lines: section.lines.map((line, index) =>
                index === lineIndex ? { ...line, text } : line,
              ),
            }
          : section,
      ),
    );
  }

  function addSection() {
    updateSections([
      ...sections,
      {
        id: crypto.randomUUID(),
        name: `Lista ${sections.length + 1}`,
        position: sections.length,
        lines: [],
      },
    ]);
  }

  function removeSection(sectionId: string) {
    updateSections(sections.filter((section) => section.id !== sectionId));
  }

  function moveSection(index: number, direction: "up" | "down") {
    updateSections(moveItem(sections, index, direction));
  }

  function addLine(sectionId: string) {
    updateSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              lines: [
                ...section.lines,
                { id: crypto.randomUUID(), text: "", checked: false, status: "NOT_STARTED" as const },
              ],
            }
          : section,
      ),
    );
  }

  function removeLine(sectionId: string, lineIndex: number) {
    updateSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, lines: removeAt(section.lines, lineIndex) }
          : section,
      ),
    );
  }

  function moveLine(sectionId: string, lineIndex: number, direction: "up" | "down") {
    updateSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, lines: moveItem(section.lines, lineIndex, direction) }
          : section,
      ),
    );
  }

  return (
    <Field label={label}>
      <div className="grid gap-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            className="grid gap-2 rounded-xl border border-border/70 bg-surface/40 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={section.name}
                placeholder="Nazwa listy (np. Kontrola dostępu)"
                onChange={(event) => updateSectionName(section.id, event.target.value)}
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={sectionIndex === 0}
                  onClick={() => moveSection(sectionIndex, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={sectionIndex === sections.length - 1}
                  onClick={() => moveSection(sectionIndex, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => removeSection(section.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {section.lines.map((line, lineIndex) => (
              <div
                key={line.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-surface-muted/20 p-2"
              >
                <Input
                  value={line.text}
                  placeholder={`Punkt ${lineIndex + 1}`}
                  onChange={(event) => updateLine(section.id, lineIndex, event.target.value)}
                />
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={lineIndex === 0}
                    onClick={() => moveLine(section.id, lineIndex, "up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={lineIndex === section.lines.length - 1}
                    onClick={() => moveLine(section.id, lineIndex, "down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => removeLine(section.id, lineIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" size="sm" variant="secondary" onClick={() => addLine(section.id)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Dodaj punkt na liście
            </Button>
          </div>
        ))}

        <Button type="button" size="sm" variant="secondary" className="w-fit" onClick={addSection}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Dodaj listę
        </Button>
      </div>
    </Field>
  );
}
