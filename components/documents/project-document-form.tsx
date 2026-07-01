"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  PROJECT_DOCUMENT_CATEGORIES,
  PROJECT_DOCUMENT_CATEGORY_LABELS,
  normalizeProjectDocumentInput,
  type ProjectDocumentCategory,
  type ProjectDocumentInput,
} from "@/lib/documents/types";
import { createProjectDocument } from "@/lib/supabase/project-document-repository";
import { useAppStore } from "@/store/app-store";

function emptyInput(): ProjectDocumentInput {
  return {
    category: "photo",
    title: "",
    description: "",
    projectId: null,
    clientId: null,
    source: "manual",
  };
}

type ProjectDocumentFormProps = {
  initialClientId?: string | null;
  initialProjectId?: string | null;
  initialCategory?: ProjectDocumentCategory;
};

export function ProjectDocumentForm({
  initialClientId,
  initialProjectId,
  initialCategory,
}: ProjectDocumentFormProps) {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const addClient = useAppStore((state) => state.addClient);
  const [form, setForm] = useState<ProjectDocumentInput>(() => ({
    ...emptyInput(),
    clientId: initialClientId ?? null,
    projectId: initialProjectId ?? null,
    category: initialCategory ?? "photo",
  }));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    if (!form.clientId) {
      return projects;
    }
    return projects.filter((project) => project.clientId === form.clientId);
  }, [form.clientId, projects]);

  async function save() {
    const normalized = normalizeProjectDocumentInput(form);
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
      await createProjectDocument(normalized, "Zespół", file);
      router.push("/dokumenty");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać dokumentu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
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

        <div className="grid gap-4 rounded-xl border border-border/80 bg-surface-muted/30 p-4 sm:grid-cols-2">
          <ClientSelectWithCreate
            clients={clients}
            value={form.clientId ?? null}
            onChange={(clientId) => {
              const nextProjects = clientId
                ? projects.filter((project) => project.clientId === clientId)
                : projects;
              setForm({
                ...form,
                clientId,
                projectId:
                  form.projectId && nextProjects.some((project) => project.id === form.projectId)
                    ? form.projectId
                    : null,
              });
            }}
            onCreateClient={addClient}
            emptyLabel="Bez klienta"
          />

          <Field label="Projekt">
            <Select
              value={form.projectId ?? ""}
              onChange={(event) =>
                setForm({ ...form, projectId: event.target.value || null })
              }
            >
              <option value="">Bez projektu</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

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

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Zapisywanie…" : "Zapisz dokument"}
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href="/dokumenty">Anuluj</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
