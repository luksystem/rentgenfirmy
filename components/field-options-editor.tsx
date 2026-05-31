"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  FlowStatusOption,
  InterruptionTypeOption,
  StageOption,
  StringListFieldOptionKey,
} from "@/lib/field-options";
import {
  FIELD_OPTION_LABELS,
  getDefaultFlowStatusOptions,
  getDefaultInterruptionTypeOptions,
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

export function InterruptionTypesOptionsEditor({
  items,
  onChange,
}: {
  items: InterruptionTypeOption[];
  onChange: (items: InterruptionTypeOption[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const name = draft.trim();
    if (!name || items.some((item) => item.name === name)) {
      return;
    }

    onChange([...items, { name, suggestion: "" }]);
    setDraft("");
  }

  function updateName(index: number, name: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, name } : item)));
  }

  function updateSuggestion(index: number, suggestion: string) {
    onChange(
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, suggestion } : item)),
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
        <CardTitle>{FIELD_OPTION_LABELS.interruptionTypes}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted">
          Przy każdym typie przerwania możesz wpisać sugestię quick win — pojawi się w raporcie,
          gdy ten typ dominuje w przerwaniach.
        </p>

        {items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="grid gap-2 rounded-xl border border-border bg-surface-muted p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={item.name}
                onChange={(event) => updateName(index, event.target.value)}
                placeholder="Nazwa typu"
                className="min-w-[180px] flex-1"
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
            <textarea
              value={item.suggestion}
              onChange={(event) => updateSuggestion(index, event.target.value)}
              placeholder="Sugestia quick win dla tego typu przerwania..."
              rows={2}
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ))}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nowy typ przerwania..."
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

    onChange([...items, { name, isInProgress: false, isClosed: false, isWaiting: false }]);
    setDraft("");
  }

  function updateName(index: number, name: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, name } : item)));
  }

  function setFlowCategory(
    index: number,
    category: "inProgress" | "waiting" | "closed",
  ) {
    onChange(
      items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const enabled = !(
          (category === "inProgress" && item.isInProgress) ||
          (category === "waiting" && item.isWaiting) ||
          (category === "closed" && item.isClosed)
        );

        return {
          ...item,
          isInProgress: enabled && category === "inProgress",
          isWaiting: enabled && category === "waiting",
          isClosed: enabled && category === "closed",
        };
      }),
    );
  }

  function toggleInProgress(index: number) {
    setFlowCategory(index, "inProgress");
  }

  function toggleClosed(index: number) {
    setFlowCategory(index, "closed");
  }

  function toggleWaiting(index: number) {
    setFlowCategory(index, "waiting");
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
        <p className="text-sm text-muted">
          Każdy status ma jedną kategorię przepływu: <strong>W trakcie</strong>,{" "}
          <strong>Oczekujące</strong> lub <strong>Zamknięty</strong>. Do widoku Do zamknięcia
          trafia projekt ze statusem W trakcie na etapie oznaczonym jako Do zamknięcia — bez
          wymogu checkboxa Aktywny na projekcie.
        </p>

        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2">
            <Input
              value={item.name}
              onChange={(event) => updateName(index, event.target.value)}
              className="min-w-[180px] flex-1"
            />
            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.isInProgress}
                onChange={() => toggleInProgress(index)}
                className="h-4 w-4 rounded border-border bg-surface text-accent"
              />
              W trakcie
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.isWaiting}
                onChange={() => toggleWaiting(index)}
                className="h-4 w-4 rounded border-border bg-surface text-accent"
              />
              Oczekujące
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.isClosed}
                onChange={() => toggleClosed(index)}
                className="h-4 w-4 rounded border-border bg-surface text-accent"
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
        <p className="text-sm text-muted">
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
            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.forClosing}
                onChange={() => toggleClosing(index)}
                className="h-4 w-4 rounded border-border bg-surface text-accent"
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

export {
  getDefaultFlowStatusOptions,
  getDefaultInterruptionTypeOptions,
  getDefaultOptionsForKey,
  getDefaultStageOptions,
};
