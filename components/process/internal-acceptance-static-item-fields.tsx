"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { INTERNAL_ACCEPTANCE_CATEGORIES } from "@/lib/internal-acceptance/types";
import type { InternalAcceptanceTemplateStaticItem } from "@/lib/internal-acceptance/template-config";

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Krytyczny" },
  { value: "normal", label: "Normalny" },
  { value: "optional", label: "Opcjonalny" },
] as const;

export function InternalAcceptanceStaticItemFields({
  item,
  categoryListId,
  onChange,
  showDocumentation = true,
}: {
  item: Pick<
    InternalAcceptanceTemplateStaticItem,
    | "name"
    | "description"
    | "category"
    | "priority"
    | "mandatory"
    | "requireDocumentation"
    | "documentationHint"
  >;
  categoryListId: string;
  onChange: (patch: Partial<InternalAcceptanceTemplateStaticItem>) => void;
  showDocumentation?: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa punktu">
          <Input value={item.name} onChange={(event) => onChange({ name: event.target.value })} />
        </Field>
        <Field label="Kategoria">
          <Input
            value={item.category}
            list={categoryListId}
            onChange={(event) => onChange({ category: event.target.value })}
          />
          <datalist id={categoryListId}>
            {INTERNAL_ACCEPTANCE_CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Opis / kryterium">
        <Textarea
          value={item.description}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={2}
        />
      </Field>

      {showDocumentation ? (
        <div className="grid gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-200/90">
            Dokumentacja przy odbiorze
          </p>
          <p className="text-xs leading-relaxed text-muted">
            Zdjęcia i pliki dodaje zespół na tablicy odbioru w projekcie. Tutaj włączasz tylko wymaganie
            przed oznaczeniem punktu jako Spełnia.
          </p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={Boolean(item.requireDocumentation)}
              onChange={(event) =>
                onChange({
                  requireDocumentation: event.target.checked,
                  documentationHint: event.target.checked ? item.documentationHint : undefined,
                })
              }
            />
            Wymagaj zdjęcia lub pliku przy Spełnia
          </label>
          {item.requireDocumentation ? (
            <Input
              value={item.documentationHint ?? ""}
              placeholder="Co należy dołączyć? (np. zdjęcie kopii zapasowej na NAS)"
              onChange={(event) => onChange({ documentationHint: event.target.value })}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Priorytet">
          <Select
            value={item.priority}
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
            checked={item.mandatory}
            onChange={(event) => onChange({ mandatory: event.target.checked })}
          />
          Obowiązkowy punkt
        </label>
      </div>
    </>
  );
}
