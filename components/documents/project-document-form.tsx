"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PROJECT_DOCUMENT_CATEGORIES,
  PROJECT_DOCUMENT_CATEGORY_LABELS,
  normalizeProjectDocumentInput,
  type ProjectDocumentCategory,
  type ProjectDocumentInput,
} from "@/lib/documents/types";
import { createProjectDocument } from "@/lib/supabase/project-document-repository";
import { useAuthStore } from "@/store/auth-store";

type ProjectDocumentFormProps = {
  clientId: string | null;
  projectId: string;
  initialCategory?: ProjectDocumentCategory;
  onCreated: () => void;
};

export function ProjectDocumentForm({
  clientId,
  projectId,
  initialCategory,
  onCreated,
}: ProjectDocumentFormProps) {
  const displayName = useAuthStore((state) => state.displayName);
  const [form, setForm] = useState<ProjectDocumentInput>({
    category: initialCategory ?? "photo",
    title: "",
    description: "",
    projectId,
    clientId,
    source: "manual",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const normalized = normalizeProjectDocumentInput({ ...form, projectId, clientId });

    if (!normalized.title) {
      setError("Podaj tytuł dokumentu.");
      return;
    }
    if (!file) {
      setError("Dołącz plik (PDF lub zdjęcie).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createProjectDocument(normalized, displayName || "Zespół", file);
      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać dokumentu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategoria">
          <Select
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value as ProjectDocumentCategory })
            }
          >
            {PROJECT_DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {PROJECT_DOCUMENT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tytuł">
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Np. Plan piętra, Zdjęcie rozdzielni…"
          />
        </Field>
      </div>

      <Field label="Opis">
        <Textarea
          rows={3}
          value={form.description ?? ""}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Krótki opis lub kontekst dokumentu"
        />
      </Field>

      <Field label="Plik (PDF lub zdjęcie)">
        <Input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="text-xs font-normal text-muted">
            Wybrano: {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        ) : null}
      </Field>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? "Zapisywanie…" : "Zapisz dokument"}
      </Button>
    </div>
  );
}
