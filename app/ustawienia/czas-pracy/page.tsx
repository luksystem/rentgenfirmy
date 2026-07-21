"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { AdminTimeCategory } from "@/lib/time-tracking/types";
import { useAuthStore } from "@/store/auth-store";

export default function TimeWorkSettingsPage() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [categories, setCategories] = useState<AdminTimeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRequiresProject, setNewRequiresProject] = useState(true);
  const [newDefaultBillable, setNewDefaultBillable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/time-categories", { credentials: "include" });
      const payload = (await response.json()) as {
        categories?: AdminTimeCategory[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Nie udało się pobrać kategorii.");
      }
      setCategories(payload.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdministrator) {
      void load();
    } else {
      setLoading(false);
    }
  }, [isAdministrator, load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/time-categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          requiresProject: newRequiresProject,
          defaultBillable: newDefaultBillable,
          sortOrder: (categories.at(-1)?.sortOrder ?? 90) + 10,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Nie udało się dodać kategorii.");
      }
      setNewName("");
      setNewDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(category: AdminTimeCategory) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/settings/time-categories/${encodeURIComponent(category.id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
          defaultBillable: category.defaultBillable,
          requiresProject: category.requiresProject,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Nie udało się zapisać kategorii.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Dezaktywować kategorię? Przestanie być dostępna przy zapisie czasu.")) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/settings/time-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Nie udało się dezaktywować.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdministrator) {
    return (
      <>
        <PageHeader eyebrow="Ustawienia" title="Czas pracy" description="Tylko administrator." />
        <p className="text-sm text-muted">Brak uprawnień.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Czas pracy — kategorie"
        description="Kategorie wybierane przy zapisie czasu pracy oraz przy deklaracji godzin w budżecie projektu (rozliczenie godzinowe)."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />

      <div className="grid gap-6">
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {loading ? <p className="text-sm text-muted">Ładowanie…</p> : null}

        <section className="grid gap-3">
          <h2 className="page-section-subtitle text-sm">Lista kategorii</h2>
          <ul className="grid gap-3">
            {categories.map((category) => (
              <CategoryEditor
                key={category.id}
                category={category}
                disabled={saving}
                onSave={handleSave}
                onDeactivate={() => void handleDeactivate(category.id)}
              />
            ))}
          </ul>
        </section>

        <section className="grid gap-3 rounded-xl border border-border/70 p-4">
          <h2 className="page-section-subtitle text-sm">Nowa kategoria</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Nazwa">
              <Input value={newName} onChange={(event) => setNewName(event.target.value)} />
            </Field>
            <Field label="Opis">
              <Input
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={newRequiresProject}
                onChange={(event) => setNewRequiresProject(event.target.checked)}
              />
              Wymaga projektu
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={newDefaultBillable}
                onChange={(event) => setNewDefaultBillable(event.target.checked)}
              />
              Domyślnie billable
            </label>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            disabled={saving || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Dodaj kategorię
          </Button>
        </section>
      </div>
    </>
  );
}

function CategoryEditor({
  category,
  disabled,
  onSave,
  onDeactivate,
}: {
  category: AdminTimeCategory;
  disabled: boolean;
  onSave: (category: AdminTimeCategory) => Promise<void>;
  onDeactivate: () => void;
}) {
  const [draft, setDraft] = useState(category);

  useEffect(() => {
    setDraft(category);
  }, [category]);

  const dirty =
    draft.name !== category.name ||
    draft.description !== category.description ||
    draft.color !== category.color ||
    draft.isActive !== category.isActive ||
    draft.sortOrder !== category.sortOrder ||
    draft.defaultBillable !== category.defaultBillable ||
    draft.requiresProject !== category.requiresProject;

  return (
    <li className="grid gap-2 rounded-xl border border-border/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          kod: <span className="font-mono">{category.code}</span>
          {!category.isActive ? " · nieaktywna" : null}
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => void onSave(draft)}
            >
              Zapisz
            </Button>
          ) : null}
          {category.isActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onDeactivate}
              aria-label="Dezaktywuj"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Field label="Nazwa">
          <Input
            value={draft.name}
            disabled={disabled}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label="Kolor">
          <Input
            type="color"
            className="h-10 w-16 p-1"
            value={draft.color || "#64748b"}
            disabled={disabled}
            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
          />
        </Field>
      </div>
      <Field label="Opis">
        <Textarea
          rows={2}
          value={draft.description}
          disabled={disabled}
          onChange={(event) =>
            setDraft((current) => ({ ...current, description: event.target.value }))
          }
        />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.requiresProject}
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({ ...current, requiresProject: event.target.checked }))
            }
          />
          Wymaga projektu
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.defaultBillable}
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({ ...current, defaultBillable: event.target.checked }))
            }
          />
          Domyślnie billable
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.isActive}
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          Aktywna
        </label>
        <Field label="Kolejność" className="w-24">
          <Input
            type="number"
            value={draft.sortOrder}
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                sortOrder: Number(event.target.value) || 0,
              }))
            }
          />
        </Field>
      </div>
    </li>
  );
}
