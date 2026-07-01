"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  PROJECT_INVOICE_KIND_LABELS,
  PROJECT_INVOICE_KINDS,
  normalizeProjectInvoiceInput,
  type ProjectInvoiceInput,
  type ProjectInvoiceKind,
} from "@/lib/invoices/types";
import { createProjectInvoice } from "@/lib/supabase/project-invoice-repository";
import { useAppStore } from "@/store/app-store";

function emptyInput(): ProjectInvoiceInput {
  return {
    kind: "cost",
    title: "",
    vendorName: "",
    invoiceNumber: "",
    amountNet: null,
    amountGross: null,
    vatRate: 23,
    currency: "PLN",
    issueDate: new Date().toISOString().slice(0, 10),
    notes: "",
    projectId: null,
    clientId: null,
  };
}

function parseAmount(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

type ProjectInvoiceFormProps = {
  initialClientId?: string | null;
  initialProjectId?: string | null;
  initialKind?: ProjectInvoiceKind;
};

export function ProjectInvoiceForm({
  initialClientId,
  initialProjectId,
  initialKind,
}: ProjectInvoiceFormProps) {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const addClient = useAppStore((state) => state.addClient);
  const [form, setForm] = useState<ProjectInvoiceInput>(() => ({
    ...emptyInput(),
    clientId: initialClientId ?? null,
    projectId: initialProjectId ?? null,
    kind: initialKind ?? "cost",
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
    const normalized = normalizeProjectInvoiceInput(form);
    if (!normalized.title) {
      setError("Podaj tytuł faktury lub kosztu.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createProjectInvoice(normalized, "Zespół", file);
      router.push("/faktury");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać wpisu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Typ">
            <Select
              value={form.kind}
              onChange={(event) =>
                setForm({ ...form, kind: event.target.value as ProjectInvoiceKind })
              }
            >
              {PROJECT_INVOICE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {PROJECT_INVOICE_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Data wystawienia">
            <Input
              type="date"
              value={form.issueDate ?? ""}
              onChange={(event) => setForm({ ...form, issueDate: event.target.value || null })}
            />
          </Field>
        </div>

        <Field label="Tytuł">
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Np. Materiały elektryczne, Faktura za montaż…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kontrahent / dostawca">
            <Input
              value={form.vendorName ?? ""}
              onChange={(event) => setForm({ ...form, vendorName: event.target.value })}
              placeholder="Nazwa firmy lub osoby"
            />
          </Field>

          <Field label="Numer dokumentu">
            <Input
              value={form.invoiceNumber ?? ""}
              onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })}
              placeholder="FV/2026/001"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kwota netto">
            <Input
              inputMode="decimal"
              value={form.amountNet ?? ""}
              onChange={(event) =>
                setForm({ ...form, amountNet: parseAmount(event.target.value) })
              }
              placeholder="0,00"
            />
          </Field>

          <Field label="Kwota brutto">
            <Input
              inputMode="decimal"
              value={form.amountGross ?? ""}
              onChange={(event) =>
                setForm({ ...form, amountGross: parseAmount(event.target.value) })
              }
              placeholder="0,00"
            />
          </Field>

          <Field label="VAT (%)">
            <Input
              inputMode="decimal"
              value={form.vatRate ?? ""}
              onChange={(event) =>
                setForm({ ...form, vatRate: parseAmount(event.target.value) })
              }
              placeholder="23"
            />
          </Field>
        </div>

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

        <Field label="Notatki">
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Dodatkowe informacje, numer zamówienia…"
          />
        </Field>

        <Field label="Załącznik (PDF lub zdjęcie)">
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf"
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
            {saving ? "Zapisywanie…" : "Zapisz wpis"}
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href="/faktury">Anuluj</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
