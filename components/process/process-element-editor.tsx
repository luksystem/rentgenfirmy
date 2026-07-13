"use client";

import Link from "next/link";
import { useState } from "react";
import { TemplateChecklistLinesEditor } from "@/components/process/template-checklist-lines-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { defaultKanbanTemplatePayload } from "@/lib/process/kanban-types";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import { KanbanTemplateColumnsEditor } from "@/components/process/kanban-template-columns-editor";
import {
  flattenChecklistLines,
  normalizeChecklistPayload,
  prepareChecklistPayloadForSave,
  templatePayloadFromTitle,
} from "@/lib/process/item-payload";
import type { ProcessElementPlacement } from "@/lib/supabase/process-element-repository";
import {
  PROCESS_ITEM_KINDS,
  PROCESS_ITEM_KIND_LABELS,
  type ProcessElement,
  type ProcessItemKind,
} from "@/lib/process/types";

export function ProcessElementEditor({
  initialElement,
  placements = [],
  onSave,
  onDelete,
}: {
  initialElement: ProcessElement;
  placements?: ProcessElementPlacement[];
  onSave: (element: ProcessElement) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [element, setElement] = useState(initialElement);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const defaultPayload =
        element.kind === "checklist" && !element.isInternalAcceptance
          ? prepareChecklistPayloadForSave(element.defaultPayload)
          : element.defaultPayload;
      await onSave({ ...element, defaultPayload, updatedAt: new Date().toISOString() });
      setMessage("Element zapisany.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu elementu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania elementu.");
      setIsDeleting(false);
    }
  }

  function updateKind(kind: ProcessItemKind) {
    setElement((current) => ({
      ...current,
      kind,
      defaultPayload:
        kind === "kanban"
          ? isKanbanTemplatePayload(current.defaultPayload)
            ? current.defaultPayload
            : defaultKanbanTemplatePayload()
          : kind === "checklist"
            ? flattenChecklistLines(normalizeChecklistPayload(current.defaultPayload)).length
              ? current.defaultPayload
              : templatePayloadFromTitle(current.title, kind)
            : templatePayloadFromTitle(current.title, kind),
    }));
  }

  return (
    <div className="grid gap-4">
      {placements.length > 0 ? (
        <Card className="border-amber-500/30">
          <CardContent className="grid gap-3 py-5">
            <p className="text-sm font-medium text-foreground">Używany w szablonach procesu</p>
            <p className="text-sm text-muted">
              Aby usunąć element z katalogu, najpierw usuń go z poniższych miejsc w edytorze szablonu
              i zapisz szablon. Jeśli wpis wskazuje na{" "}
              <strong className="font-medium text-amber-300">szablon nieużywany</strong>, to stary
              duplikat typu projektu (np. „Dom” vs „DOM”) — nie ten, którego używasz w projektach.
            </p>
            <ul className="grid gap-2 text-sm">
              {placements.map((placement) => (
                <li key={placement.processItemId}>
                  <Link
                    href={`/procesy/${encodeURIComponent(placement.projectType)}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {placement.projectType}
                  </Link>
                  {placement.anchoredProjectCount === 0 ? (
                    <span className="ml-1 text-amber-400">(szablon nieużywany)</span>
                  ) : null}
                  {" → "}
                  <span className="text-foreground">{placement.stageTitle}</span>
                  {" → "}
                  <span className="text-muted">{placement.milestoneTitle}</span>
                  {" · "}
                  <span className="text-muted">{placement.itemTitle}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
      <CardContent className="grid gap-4 py-5">
        <Field label="Nazwa elementu">
          <Input
            value={element.title}
            onChange={(event) => setElement({ ...element, title: event.target.value })}
          />
        </Field>
        <Field label="Typ">
          <Select value={element.kind} onChange={(event) => updateKind(event.target.value as ProcessItemKind)}>
            {PROCESS_ITEM_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PROCESS_ITEM_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        </Field>

        {element.kind === "checklist" ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(element.isInternalAcceptance)}
              onChange={(event) =>
                setElement({
                  ...element,
                  isInternalAcceptance: event.target.checked,
                })
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Odbiór wewnętrzny (Quality Gate)</span>
              <span className="mt-1 block text-xs text-muted">
                Dynamiczna tablica odbiorowa generowana ze specyfikacji projektu, ustaleń i standardów firmy.
                Punkty checklisty poniżej są ignorowane — służą tylko zwykłym checklistom.
              </span>
            </span>
          </label>
        ) : null}

        <Field label="Opis">
          <Input
            value={element.description}
            onChange={(event) => setElement({ ...element, description: event.target.value })}
          />
        </Field>

        {element.kind === "checklist" && !element.isInternalAcceptance ? (
          <TemplateChecklistLinesEditor
            label="Punkty checklisty (wzorzec)"
            payload={normalizeChecklistPayload(element.defaultPayload)}
            onChange={(defaultPayload) => setElement({ ...element, defaultPayload })}
          />
        ) : element.kind === "checklist" && element.isInternalAcceptance ? (
          <p className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-muted">
            Punkty kontroli konfigurujesz w szablonie procesu — po dodaniu elementu do procesu
            użyj linku „Konfiguruj checklistę odbioru”. W projekcie checklista generuje się ze
            specyfikacji, ustaleń i zdefiniowanych punktów szablonu.
          </p>
        ) : element.kind === "kanban" ? (
          <KanbanTemplateColumnsEditor
            payload={
              isKanbanTemplatePayload(element.defaultPayload)
                ? element.defaultPayload
                : defaultKanbanTemplatePayload()
            }
            onChange={(defaultPayload) => setElement({ ...element, defaultPayload })}
          />
        ) : element.kind === "note" ? (
          <p className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-muted">
            W projekcie zespół podepnie tu istniejącą notatkę ze spotkania i/lub dokument, albo utworzy
            nowy wpis — bez konfiguracji na poziomie szablonu.
          </p>
        ) : element.kind === "protocol" ? (
          <p className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-muted">
            Wzór protokołu (pola formularza lub referencyjny PDF) zespół wybierze bezpośrednio w
            projekcie, w{" "}
            <Link href="/procesy/protokoly" className="text-accent hover:underline">
              katalogu wzorów protokołów
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted">
            Ten typ elementu będzie rozwijany w kolejnych fazach (rozliczenie).
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Zapisywanie…" : "Zapisz element"}
          </Button>
          {onDelete ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting || isSaving}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Usuwanie…" : "Usuń element"}
            </Button>
          ) : null}
        </div>

        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </CardContent>
    </Card>
    </div>
  );
}
