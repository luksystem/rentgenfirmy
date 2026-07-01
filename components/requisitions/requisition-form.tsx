"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  REQUISITION_CATEGORIES,
  REQUISITION_CATEGORY_LABELS,
  REQUISITION_SCOPES,
  REQUISITION_SCOPE_LABELS,
  normalizeRequisitionInput,
  type RequisitionCategory,
  type RequisitionInput,
  type RequisitionScope,
} from "@/lib/requisitions/types";
import {
  createRequisition,
  updateRequisitionStatus,
} from "@/lib/supabase/requisition-repository";
import { useAppStore } from "@/store/app-store";

function emptyInput(): RequisitionInput {
  return {
    title: "",
    description: "",
    category: "tools",
    scope: "general",
    projectId: null,
    clientId: null,
  };
}

type RequisitionFormProps = {
  initialClientId?: string | null;
  initialProjectId?: string | null;
  initialCategory?: RequisitionCategory;
  initialScope?: RequisitionScope;
};

export function RequisitionForm({
  initialClientId,
  initialProjectId,
  initialCategory,
  initialScope,
}: RequisitionFormProps) {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const addClient = useAppStore((state) => state.addClient);
  const [form, setForm] = useState<RequisitionInput>(() => ({
    ...emptyInput(),
    clientId: initialClientId ?? null,
    projectId: initialProjectId ?? null,
    category: initialCategory ?? "tools",
    scope: initialScope ?? "general",
  }));
  const [submitImmediately, setSubmitImmediately] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    if (!form.clientId) {
      return projects;
    }
    return projects.filter((project) => project.clientId === form.clientId);
  }, [form.clientId, projects]);

  async function save() {
    const normalized = normalizeRequisitionInput(form);
    if (!normalized.title) {
      setError("Podaj tytuł zapotrzebowania.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createRequisition(normalized, "Zespół");
      if (submitImmediately) {
        await updateRequisitionStatus(created.id, "submitted", "Zespół");
      }
      router.push("/zapotrzebowania");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać zapotrzebowania.");
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
                setForm({ ...form, category: event.target.value as RequisitionCategory })
              }
            >
              {REQUISITION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {REQUISITION_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Zakres">
            <Select
              value={form.scope}
              onChange={(event) =>
                setForm({ ...form, scope: event.target.value as RequisitionScope })
              }
            >
              {REQUISITION_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {REQUISITION_SCOPE_LABELS[scope]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tytuł">
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Np. Kurtka robocza L, Wiertarka udarowa…"
          />
        </Field>

        <Field label="Opis">
          <Textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Szczegóły, rozmiar, model, uzasadnienie…"
          />
        </Field>

        {form.scope === "project" ? (
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
                <option value="">Wybierz projekt</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={submitImmediately}
            onChange={(event) => setSubmitImmediately(event.target.checked)}
          />
          Wyślij od razu do akceptacji
        </label>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Zapisywanie…" : submitImmediately ? "Zgłoś zapotrzebowanie" : "Zapisz szkic"}
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href="/zapotrzebowania">Anuluj</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
