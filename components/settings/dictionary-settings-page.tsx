"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DICTIONARY_DESCRIPTIONS,
  DICTIONARY_KEYS,
  DICTIONARY_LABELS,
  type DictionaryItem,
  type DictionaryKey,
} from "@/lib/resource-plan/dictionary-types";
import { ICON_OPTIONS, resolveDictionaryIcon } from "@/lib/resource-plan/icon-options";
import {
  readPlanItemTemplateMetadata,
  writePlanItemTemplateMetadata,
  type PlanItemTemplateMetadata,
} from "@/lib/resource-plan/plan-item-template";
import { useDictionaryStore } from "@/store/dictionary-store";

const COLOR_SWATCHES = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#64748b",
  "#db2777",
];

function DictionaryItemRow({
  item,
  index,
  total,
  onMove,
  onSave,
  onDelete,
}: {
  item: DictionaryItem;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onSave: (patch: Partial<DictionaryItem>) => Promise<void>;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(item);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const isTemplate = item.dictionaryKey === "plan_item_template";
  const [templateMeta, setTemplateMeta] = useState<PlanItemTemplateMetadata>(() =>
    readPlanItemTemplateMetadata(item.metadata),
  );
  const workTypeOptions = useDictionaryStore((state) => state.byKey("work_type"));
  const riskOptions = useDictionaryStore((state) => state.byKey("risk_level"));

  useEffect(() => {
    setDraft(item);
    setTemplateMeta(readPlanItemTemplateMetadata(item.metadata));
  }, [item]);

  const Icon = resolveDictionaryIcon(draft.icon);
  const originalTemplateMeta = readPlanItemTemplateMetadata(item.metadata);
  const dirty =
    draft.name !== item.name ||
    draft.description !== item.description ||
    draft.color !== item.color ||
    draft.icon !== item.icon ||
    draft.isActive !== item.isActive ||
    (isTemplate && JSON.stringify(templateMeta) !== JSON.stringify(originalTemplateMeta));

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name: draft.name,
        description: draft.description,
        color: draft.color,
        icon: draft.icon,
        isActive: draft.isActive,
        ...(isTemplate ? { metadata: writePlanItemTemplateMetadata(templateMeta) } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface-muted/15 p-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${draft.color}22`, color: draft.color }}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium text-foreground", !draft.isActive && "text-muted line-through")}>
            {draft.name}
          </p>
          {draft.description ? <p className="truncate text-xs text-muted">{draft.description}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" disabled={index === 0} onClick={() => onMove("up")}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Zwiń" : "Edytuj"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-3 border-t border-border/60 pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nazwa">
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <label className="flex items-center gap-2 self-end rounded-xl border border-border/70 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              />
              Aktywna (widoczna do wyboru)
            </label>
          </div>
          <Field label="Opis">
            <Textarea
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={2}
            />
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground/90">Kolor</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    draft.color === color ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setDraft({ ...draft, color })}
                />
              ))}
              <Input
                type="color"
                value={draft.color}
                onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                className="h-8 w-14 cursor-pointer px-1"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground/90">Ikona</span>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                const selected = draft.icon === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.value}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition",
                      selected
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border/60 text-muted hover:bg-surface-muted",
                    )}
                    onClick={() => setDraft({ ...draft, icon: option.value })}
                  >
                    <OptionIcon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {isTemplate ? (
            <div className="grid gap-3 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
              <p className="text-sm font-medium text-foreground/90">
                Podpowiedzi wypełniane automatycznie po wybraniu tego szablonu
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Typ pracy">
                  <Select
                    value={templateMeta.workTypeItemId ?? ""}
                    onChange={(event) =>
                      setTemplateMeta({ ...templateMeta, workTypeItemId: event.target.value || null })
                    }
                  >
                    <option value="">Brak</option>
                    {workTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Planowane godziny">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={templateMeta.plannedHours ?? ""}
                    onChange={(event) =>
                      setTemplateMeta({
                        ...templateMeta,
                        plannedHours: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Budżet robocizny">
                  <Input
                    type="number"
                    min={0}
                    value={templateMeta.laborBudget ?? ""}
                    onChange={(event) =>
                      setTemplateMeta({
                        ...templateMeta,
                        laborBudget: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Budżet materiałów">
                  <Input
                    type="number"
                    min={0}
                    value={templateMeta.materialBudget ?? ""}
                    onChange={(event) =>
                      setTemplateMeta({
                        ...templateMeta,
                        materialBudget: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Budżet dojazdu">
                  <Input
                    type="number"
                    min={0}
                    value={templateMeta.travelBudget ?? ""}
                    onChange={(event) =>
                      setTemplateMeta({
                        ...templateMeta,
                        travelBudget: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Domyślne ryzyko">
                <Select
                  value={templateMeta.riskItemId ?? ""}
                  onChange={(event) => setTemplateMeta({ ...templateMeta, riskItemId: event.target.value || null })}
                >
                  <option value="">Brak</option>
                  {riskOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Domyślne notatki">
                <Textarea
                  value={templateMeta.notes}
                  onChange={(event) => setTemplateMeta({ ...templateMeta, notes: event.target.value })}
                  rows={2}
                />
              </Field>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" disabled={!dirty || saving} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DictionarySection({ dictionaryKey }: { dictionaryKey: DictionaryKey }) {
  const items = useDictionaryStore((state) => state.byKey(dictionaryKey, { activeOnly: false }));
  const createItem = useDictionaryStore((state) => state.createItem);
  const updateItem = useDictionaryStore((state) => state.updateItem);
  const removeItem = useDictionaryStore((state) => state.removeItem);
  const reorder = useDictionaryStore((state) => state.reorder);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      await createItem({
        dictionaryKey,
        name: "Nowa pozycja",
        description: "",
        color: "#2563eb",
        icon: "circle",
        isActive: true,
        sortOrder: (items.at(-1)?.sortOrder ?? 0) + 10,
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleMove(item: DictionaryItem, direction: "up" | "down") {
    const index = items.findIndex((entry) => entry.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await reorder(dictionaryKey, next.map((entry) => entry.id));
  }

  async function handleDelete(item: DictionaryItem) {
    const confirmed = window.confirm(
      `Usunąć „${item.name}”? Pozycje już użyte w planie/etapach pozostaną bez zmian, ale nie będzie można ich wybrać ponownie.`,
    );
    if (!confirmed) return;
    await removeItem(item.id);
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{DICTIONARY_LABELS[dictionaryKey]}</h2>
            <p className="text-xs text-muted">{DICTIONARY_DESCRIPTIONS[dictionaryKey]}</p>
          </div>
          <Button type="button" size="sm" variant="secondary" disabled={adding} onClick={() => void handleAdd()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj pozycję
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted">
            Brak pozycji — dodaj pierwszą, aby korzystać z tego słownika w Planie Zasobów.
          </p>
        ) : (
          <div className="grid gap-2">
            {items.map((item, index) => (
              <DictionaryItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                onMove={(direction) => void handleMove(item, direction)}
                onSave={(patch) => updateItem(item.id, patch).then(() => undefined)}
                onDelete={() => void handleDelete(item)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DictionarySettingsPage() {
  const ensure = useDictionaryStore((state) => state.ensure);
  const loading = useDictionaryStore((state) => state.loading);
  const hydrated = useDictionaryStore((state) => state.hydrated);
  const [activeKey, setActiveKey] = useState<DictionaryKey>(DICTIONARY_KEYS[0]);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  const tabs = useMemo(() => DICTIONARY_KEYS, []);

  if (loading && !hydrated) {
    return <p className="text-sm text-muted">Ładowanie słowników…</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/70 bg-surface-muted/20 p-1.5">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              activeKey === key ? "bg-accent text-accent-foreground shadow-soft" : "text-muted hover:bg-surface-muted",
            )}
            onClick={() => setActiveKey(key)}
          >
            {DICTIONARY_LABELS[key]}
          </button>
        ))}
      </div>

      <DictionarySection dictionaryKey={activeKey} />
    </div>
  );
}
