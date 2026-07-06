"use client";

import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { ProtocolFieldEditor } from "@/components/process/protocol-field-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ProtocolTemplate, ProtocolTemplateSource } from "@/lib/process/protocol-types";

export function ProtocolTemplateEditor({
  initialTemplate,
  referencePdfUrl,
  onSave,
  onDelete,
}: {
  initialTemplate: ProtocolTemplate;
  referencePdfUrl?: string | null;
  onSave: (template: ProtocolTemplate, replaceReferenceFile?: File | null) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!template.name.trim()) {
        throw new Error("Podaj nazwę wzoru protokołu.");
      }
      if (template.source === "custom" && template.fields.length === 0) {
        throw new Error("Dodaj przynajmniej jedno pole formularza.");
      }
      await onSave(template, pendingFile);
      setPendingFile(null);
      setMessage("Wzór protokołu zapisany.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu wzoru protokołu.");
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
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania wzoru.");
      setIsDeleting(false);
    }
  }

  function updateSource(source: ProtocolTemplateSource) {
    setTemplate((current) => ({ ...current, source }));
    setPendingFile(null);
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-5">
        <Field label="Nazwa wzoru">
          <Input
            value={template.name}
            onChange={(event) => setTemplate({ ...template, name: event.target.value })}
            placeholder="np. Protokół odbioru instalacji SSP"
          />
        </Field>

        <Field label="Opis (widoczny dla zespołu)">
          <Textarea
            value={template.description}
            onChange={(event) => setTemplate({ ...template, description: event.target.value })}
            rows={2}
          />
        </Field>

        <Field label="Sposób tworzenia">
          <Select
            value={template.source}
            onChange={(event) => updateSource(event.target.value as ProtocolTemplateSource)}
          >
            <option value="custom">Własny formularz (pola do wypełnienia)</option>
            <option value="pdf">Wzór z pliku PDF (podgląd/wydruk + podpisy)</option>
          </Select>
        </Field>

        {template.source === "custom" ? (
          <ProtocolFieldEditor
            fields={template.fields}
            onChange={(fields) => setTemplate({ ...template, fields })}
          />
        ) : (
          <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <p className="text-sm font-medium text-foreground">Plik PDF wzoru</p>
            <p className="text-xs text-muted">
              Zespół zobaczy ten PDF jako referencję podczas wypełniania protokołu w projekcie
              (uwagi i podpisy zbieramy elektronicznie obok — automatyczne mapowanie pól z PDF nie
              jest jeszcze obsługiwane).
            </p>
            {template.referencePdfName ? (
              <a
                href={referencePdfUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                <FileText className="h-4 w-4" />
                {template.referencePdfName}
              </a>
            ) : null}
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2 text-sm text-muted hover:border-accent/40">
              <Upload className="h-4 w-4" />
              {pendingFile ? pendingFile.name : template.referencePdfName ? "Podmień plik PDF" : "Wgraj plik PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => setPendingFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Zapisywanie…" : "Zapisz wzór protokołu"}
          </Button>
          {onDelete ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting || isSaving}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Usuwanie…" : "Usuń wzór"}
            </Button>
          ) : null}
        </div>

        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
