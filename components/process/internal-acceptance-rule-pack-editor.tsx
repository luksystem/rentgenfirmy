"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { getInternalAcceptanceRuleSetById } from "@/lib/internal-acceptance/rule-library";
import {
  getEffectivePackItemOrder,
  movePackItemOrder,
  packCustomizationItemCount,
  withExtraItemPositions,
} from "@/lib/internal-acceptance/rule-pack-resolver";
import { INTERNAL_ACCEPTANCE_CATEGORIES } from "@/lib/internal-acceptance/types";
import {
  ensureRulePackCustomization,
  getRulePackCustomization,
  type InternalAcceptanceRulePackCustomization,
  type InternalAcceptanceRulePackItemOverride,
  type InternalAcceptanceTemplateConfig,
  type InternalAcceptanceTemplateStaticItem,
} from "@/lib/internal-acceptance/template-config";

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Krytyczny" },
  { value: "normal", label: "Normalny" },
  { value: "optional", label: "Opcjonalny" },
] as const;

function ItemFields({
  name,
  description,
  category,
  priority,
  mandatory,
  categoryListId,
  onChange,
}: {
  name: string;
  description: string;
  category: string;
  priority: InternalAcceptanceTemplateStaticItem["priority"];
  mandatory: boolean;
  categoryListId: string;
  onChange: (patch: {
    name?: string;
    description?: string;
    category?: string;
    priority?: InternalAcceptanceTemplateStaticItem["priority"];
    mandatory?: boolean;
  }) => void;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa punktu">
          <Input value={name} onChange={(event) => onChange({ name: event.target.value })} />
        </Field>
        <Field label="Kategoria">
          <Input
            value={category}
            list={categoryListId}
            onChange={(event) => onChange({ category: event.target.value })}
          />
          <datalist id={categoryListId}>
            {INTERNAL_ACCEPTANCE_CATEGORIES.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Opis / kryterium">
        <Textarea
          value={description}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={2}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Priorytet">
          <Select
            value={priority}
            onChange={(event) =>
              onChange({
                priority: event.target.value as InternalAcceptanceTemplateStaticItem["priority"],
              })
            }
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 self-end rounded-xl border border-border/70 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(event) => onChange({ mandatory: event.target.checked })}
          />
          Obowiązkowy punkt
        </label>
      </div>
    </>
  );
}

export function InternalAcceptanceRulePackEditor({
  packId,
  config,
  onChange,
}: {
  packId: string;
  config: InternalAcceptanceTemplateConfig;
  onChange: (next: InternalAcceptanceTemplateConfig) => void;
}) {
  const ruleSet = getInternalAcceptanceRuleSetById(packId);
  const customization = getRulePackCustomization(config, packId);
  const itemOrder = getEffectivePackItemOrder(packId, customization);
  const activeCount = packCustomizationItemCount(packId, customization);

  function patchCustomization(
    updater: (current: InternalAcceptanceRulePackCustomization) => InternalAcceptanceRulePackCustomization,
  ) {
    const base = ensureRulePackCustomization(config, packId);
    const current = getRulePackCustomization(base, packId);
    onChange({
      ...base,
      rulePackCustomizations: {
        ...base.rulePackCustomizations,
        [packId]: updater(current),
      },
    });
  }

  function updateLibraryOverride(
    itemId: string,
    patch: InternalAcceptanceRulePackItemOverride,
  ) {
    patchCustomization((current) => ({
      ...current,
      itemOverrides: {
        ...current.itemOverrides,
        [itemId]: { ...current.itemOverrides[itemId], ...patch },
      },
    }));
  }

  function toggleLibraryItem(itemId: string, enabled: boolean) {
    patchCustomization((current) => {
      const disabledItemIds = enabled
        ? current.disabledItemIds.filter((entry) => entry !== itemId)
        : current.disabledItemIds.includes(itemId)
          ? current.disabledItemIds
          : [...current.disabledItemIds, itemId];

      let itemOrderNext = current.itemOrder.length
        ? current.itemOrder
        : getEffectivePackItemOrder(packId, current);

      if (!enabled) {
        itemOrderNext = itemOrderNext.filter((entry) => entry !== itemId);
      } else if (!itemOrderNext.includes(itemId)) {
        itemOrderNext = [...itemOrderNext, itemId];
      }

      return { ...current, disabledItemIds, itemOrder: itemOrderNext };
    });
  }

  function moveItem(itemId: string, direction: "up" | "down") {
    patchCustomization((current) => {
      const order = current.itemOrder.length
        ? current.itemOrder
        : getEffectivePackItemOrder(packId, current);
      return {
        ...current,
        itemOrder: movePackItemOrder(order, itemId, direction),
      };
    });
  }

  function addExtraItem() {
    patchCustomization((current) => {
      const extra: InternalAcceptanceTemplateStaticItem = {
        id: crypto.randomUUID(),
        name: "Nowy punkt w pakiecie",
        description: "",
        category: "Inne",
        priority: "normal",
        mandatory: true,
        position: current.extraItems.length,
      };
      const extraItems = withExtraItemPositions([...current.extraItems, extra]);
      const extraKey = `extra-${extra.id}`;
      const order = current.itemOrder.length
        ? [...current.itemOrder, extraKey]
        : [...getEffectivePackItemOrder(packId, current), extraKey];
      return { ...current, extraItems, itemOrder: order };
    });
  }

  function updateExtraItem(itemId: string, patch: Partial<InternalAcceptanceTemplateStaticItem>) {
    patchCustomization((current) => ({
      ...current,
      extraItems: current.extraItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeExtraItem(itemId: string) {
    patchCustomization((current) => {
      const extraKey = `extra-${itemId}`;
      return {
        ...current,
        extraItems: withExtraItemPositions(current.extraItems.filter((item) => item.id !== itemId)),
        itemOrder: (current.itemOrder.length ? current.itemOrder : getEffectivePackItemOrder(packId, current)).filter(
          (entry) => entry !== extraKey,
        ),
      };
    });
  }

  if (!ruleSet) {
    return null;
  }

  const orderedEntries = itemOrder
    .map((entryId) => {
      if (entryId.startsWith("extra-")) {
        const extraId = entryId.slice("extra-".length);
        const extra = customization.extraItems.find((item) => item.id === extraId);
        if (!extra) return null;
        return { type: "extra" as const, id: entryId, extra };
      }

      const libraryItem = ruleSet.items.find((item) => item.id === entryId);
      if (!libraryItem || customization.disabledItemIds.includes(entryId)) {
        return null;
      }

      const override = customization.itemOverrides[entryId] ?? {};
      return {
        type: "library" as const,
        id: entryId,
        libraryItem,
        override,
      };
    })
    .filter(Boolean);

  const disabledLibraryItems = ruleSet.items.filter((item) =>
    customization.disabledItemIds.includes(item.id),
  );

  return (
    <div className="mt-3 grid gap-3 border-t border-border/60 pt-3">
      <p className="text-xs text-muted">
        {activeCount} aktywnych punktów w pakiecie — edytuj, wyłącz lub dodaj własne.
      </p>

      {orderedEntries.map((entry, index) => {
        if (!entry) return null;

        if (entry.type === "library") {
          const merged = {
            name: entry.override.name ?? entry.libraryItem.name,
            description: entry.override.description ?? entry.libraryItem.description,
            category: entry.override.category ?? entry.libraryItem.category,
            priority: entry.override.priority ?? entry.libraryItem.priority,
            mandatory: entry.override.mandatory ?? entry.libraryItem.mandatory,
          };

          return (
            <div key={entry.id} className="grid gap-3 rounded-xl border border-border/60 bg-surface/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Punkt biblioteki</p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() => moveItem(entry.id, "up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={index === orderedEntries.length - 1}
                    onClick={() => moveItem(entry.id, "down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleLibraryItem(entry.id, false)}
                  >
                    Wyłącz
                  </Button>
                </div>
              </div>
              <ItemFields
                {...merged}
                categoryListId={`ia-pack-${packId}-${entry.id}`}
                onChange={(patch) => updateLibraryOverride(entry.id, patch)}
              />
            </div>
          );
        }

        return (
          <div key={entry.id} className="grid gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-accent">Punkt własny</p>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => moveItem(entry.id, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === orderedEntries.length - 1}
                  onClick={() => moveItem(entry.id, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => removeExtraItem(entry.extra.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <ItemFields
              name={entry.extra.name}
              description={entry.extra.description}
              category={entry.extra.category}
              priority={entry.extra.priority}
              mandatory={entry.extra.mandatory}
              categoryListId={`ia-pack-extra-${packId}-${entry.extra.id}`}
              onChange={(patch) => updateExtraItem(entry.extra.id, patch)}
            />
          </div>
        );
      })}

      {disabledLibraryItems.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted">Wyłączone punkty biblioteki</p>
          {disabledLibraryItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm text-muted"
            >
              <span>{item.name}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => toggleLibraryItem(item.id, true)}
              >
                Przywróć
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Button type="button" size="sm" variant="secondary" onClick={addExtraItem}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Dodaj punkt do pakietu
      </Button>
    </div>
  );
}
