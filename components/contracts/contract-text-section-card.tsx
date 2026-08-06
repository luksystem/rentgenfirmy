"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ContractTextSection } from "@/lib/contracts/types";
import { cn } from "@/lib/utils";

export function ContractTextSectionCard({
  section,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  section: ContractTextSection;
  index: number;
  onChange: (next: ContractTextSection) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border p-4",
        section.struck ? "border-border/50 bg-surface-muted/10" : "border-border/80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Blok tekstu {index + 1}
          {section.struck ? <span className="ml-2 text-xs font-normal text-muted">(wykreślony)</span> : null}
        </p>
        <div className="flex items-center gap-1">
          {onMoveUp ? (
            <Button type="button" variant="ghost" size="sm" onClick={onMoveUp} disabled={disabled}>
              ↑
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button type="button" variant="ghost" size="sm" onClick={onMoveDown} disabled={disabled}>
              ↓
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ ...section, struck: !section.struck })}
          >
            {section.struck ? "Przywróć" : "Wykreśl"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            Usuń
          </Button>
        </div>
      </div>

      <Field label="Tytuł (opcjonalnie)">
        <Input
          value={section.title}
          disabled={disabled}
          onChange={(event) => onChange({ ...section, title: event.target.value })}
          placeholder="Np. § 1. Przedmiot umowy"
        />
      </Field>
      <Field label="Treść">
        <Textarea
          value={section.content}
          disabled={disabled}
          onChange={(event) => onChange({ ...section, content: event.target.value })}
          rows={5}
          className={cn(section.struck && "line-through text-muted")}
        />
      </Field>
    </div>
  );
}
