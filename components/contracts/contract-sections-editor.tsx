"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ContractTextSectionCard } from "@/components/contracts/contract-text-section-card";
import { ContractTableSectionCard } from "@/components/contracts/contract-table-section-card";
import { InsertContentBlockDialog } from "@/components/contracts/insert-content-block-dialog";
import { createContractTableSection, createContractTextSection } from "@/lib/contracts/factory";
import type { ContractModuleSettings } from "@/lib/contracts/module-settings";
import { isContractTableSection, type ContractContentBlock, type ContractSection } from "@/lib/contracts/types";

export function ContractSectionsEditor({
  sections,
  onChange,
  contentBlocks,
  moduleSettings,
  disabled = false,
}: {
  sections: ContractSection[];
  onChange: (sections: ContractSection[]) => void;
  contentBlocks: ContractContentBlock[];
  moduleSettings?: ContractModuleSettings;
  disabled?: boolean;
}) {
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);

  function updateSection(index: number, next: ContractSection) {
    onChange(sections.map((section, i) => (i === index ? next : section)));
  }

  function removeSection(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) {
      return;
    }
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function insertBlock(block: ContractContentBlock) {
    onChange([...sections, createContractTextSection(block)]);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Treść umowy</h3>
          <p className="mt-1 text-sm text-muted">
            Bloki tekstu i tabele pozycji, w kolejności w jakiej pojawią się w umowie.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setInsertDialogOpen(true)}>
            Dodaj blok z biblioteki
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onChange([...sections, createContractTextSection()])}
          >
            Dodaj pusty tekst
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onChange([...sections, createContractTableSection("main")])}
          >
            Dodaj tabelę
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted">
          Umowa nie ma jeszcze żadnej treści. Dodaj blok tekstu, tabelę pozycji lub wstaw gotowy blok
          z biblioteki.
        </p>
      ) : (
        <div className="grid gap-4">
          {sections.map((section, index) =>
            isContractTableSection(section) ? (
              <ContractTableSectionCard
                key={section.id}
                section={section}
                index={index}
                disabled={disabled}
                moduleSettings={moduleSettings}
                onChange={(next) => updateSection(index, next)}
                onRemove={() => removeSection(index)}
                onMoveUp={index > 0 ? () => moveSection(index, -1) : undefined}
                onMoveDown={index < sections.length - 1 ? () => moveSection(index, 1) : undefined}
              />
            ) : (
              <ContractTextSectionCard
                key={section.id}
                section={section}
                index={index}
                disabled={disabled}
                onChange={(next) => updateSection(index, next)}
                onRemove={() => removeSection(index)}
                onMoveUp={index > 0 ? () => moveSection(index, -1) : undefined}
                onMoveDown={index < sections.length - 1 ? () => moveSection(index, 1) : undefined}
              />
            ),
          )}
        </div>
      )}

      <InsertContentBlockDialog
        open={insertDialogOpen}
        onOpenChange={setInsertDialogOpen}
        blocks={contentBlocks}
        onInsert={insertBlock}
      />
    </div>
  );
}
