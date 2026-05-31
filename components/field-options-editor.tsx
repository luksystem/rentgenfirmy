"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FlowStatusOption, StageOption, StringListFieldOptionKey } from "@/lib/field-options";
import {
  FIELD_OPTION_LABELS,
  getDefaultFlowStatusOptions,
  getDefaultOptionsForKey,
  getDefaultStageOptions,
} from "@/lib/field-options";

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

export function FlowStatusesOptionsEditor({
  items,
  onChange,
}: {
  items: FlowStatusOption[];
  onChange: (items: FlowStatusOption[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const name = draft.trim();
    if (!name || items.some((item) => item.name === name)) {
      return;
    }

    onChange([...items, { name, isClosed: false, isWaiting: false }]);
    setDraft("");
  }

  function updateName(index: number, name: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, name } : item)));
  }

  function toggleClosed(index: number) {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, isClosed: !item.isClosed } : item,
      ),
    );
  }

  function toggleWaiting(index: number) {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, isWaiting: !item.isWaiting } : item,
      ),
    );
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
        <CardTitle>{FIELD_OPTION_LABELS.flowStatuses}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-slate-600">
          Zaznacz „Oczekujące” przy statusach blokujących przepływ. Zaznacz „Zamknięty” przy
          statusach kończących projekt — takie projekty są wykluczane z widoku Bez kontaktu i
          liczone jako zamknięte w raporcie.
        </p>

        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2">
            <Input
              value={item.name}
              onChange={(event) => updateName(index, event.target.value)}
              className="min-w-[180px] flex-1"
            />
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.isWaiting}
                onChange={() => toggleWaiting(index)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Oczekujące
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.isClosed}
                onChange={() => toggleClosed(index)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Zamknięty
            </label>
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
            placeholder="Nowy status..."
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

export function StagesOptionsEditor({
  items,
  onChange,
}: {
  items: StageOption[];
  onChange: (items: StageOption[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const name = draft.trim();
    if (!name || items.some((item) => item.name === name)) {
      return;
    }

    onChange([...items, { name, forClosing: false }]);
    setDraft("");
  }

  function updateName(index: number, name: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, name } : item)));
  }

  function toggleClosing(index: number) {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, forClosing: !item.forClosing } : item,
      ),
    );
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
        <CardTitle>{FIELD_OPTION_LABELS.implementationStages}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-slate-600">
          Zaznacz „Do zamknięcia” przy etapach, które kwalifikują aktywny projekt do widoku Do
          zamknięcia.
        </p>

        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2">
            <Input
              value={item.name}
              onChange={(event) => updateName(index, event.target.value)}
              className="min-w-[180px] flex-1"
            />
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.forClosing}
                onChange={() => toggleClosing(index)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Do zamknięcia
            </label>
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
            placeholder="Nowy etap..."
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
  values: Record<StringListFieldOptionKey, string[]>;
  keys: StringListFieldOptionKey[];
  onChange: (key: StringListFieldOptionKey, items: string[]) => void;
  onResetSection: (key: StringListFieldOptionKey) => void;
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

export { getDefaultFlowStatusOptions, getDefaultOptionsForKey, getDefaultStageOptions };
