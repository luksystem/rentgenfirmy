"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FieldOptionKey } from "@/lib/field-options";
import { DEFAULT_FIELD_OPTIONS, FIELD_OPTION_LABELS } from "@/lib/field-options";

function OptionsListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const value = draft.trim();
    if (!value || items.includes(value)) {
      return;
    }

    onChange([...items, value]);
    setDraft("");
  }

  function updateItem(index: number, value: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-2">
            <Input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => moveItem(index, -1)}
              disabled={index === 0}
              title="Przesuń w górę"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => moveItem(index, 1)}
              disabled={index === items.length - 1}
              title="Przesuń w dół"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => removeItem(index)}
              title="Usuń"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nowa opcja..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addItem();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FieldOptionsEditor({
  values,
  keys,
  onChange,
  onResetSection,
}: {
  values: Record<FieldOptionKey, string[]>;
  keys: FieldOptionKey[];
  onChange: (key: FieldOptionKey, items: string[]) => void;
  onResetSection: (key: FieldOptionKey) => void;
}) {
  return (
    <div className="grid gap-4">
      {keys.map((key) => (
        <div key={key} className="grid gap-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onResetSection(key)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Przywróć domyślne
            </Button>
          </div>
          <OptionsListEditor
            label={FIELD_OPTION_LABELS[key]}
            items={values[key]}
            onChange={(items) => onChange(key, items)}
          />
        </div>
      ))}
    </div>
  );
}

export function getDefaultOptionsForKey(key: FieldOptionKey) {
  return [...DEFAULT_FIELD_OPTIONS[key]];
}
