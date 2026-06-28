"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { SpecificationCatalogItem } from "@/lib/dashboard/specification-types";
import { seedCatalogAcceptanceItems } from "@/lib/internal-acceptance/catalog-seeds";
import { INTERNAL_ACCEPTANCE_CATEGORIES } from "@/lib/internal-acceptance/types";
import {
  withStaticItemPositions,
  type InternalAcceptanceTemplateStaticItem,
} from "@/lib/internal-acceptance/template-config";
import {
  createSpecificationCatalogItem,
  deleteSpecificationCatalogItem,
  fetchSpecificationCatalog,
  saveSpecificationCatalogAcceptanceItems,
  updateSpecificationCatalogItem,
} from "@/lib/supabase/project-specification-repository";

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Krytyczny" },
  { value: "normal", label: "Normalny" },
  { value: "optional", label: "Opcjonalny" },
] as const;

function moveItem(items: InternalAcceptanceTemplateStaticItem[], index: number, direction: "up" | "down") {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return withStaticItemPositions(next);
}

export function SpecificationCatalogSettings() {
  const [catalog, setCatalog] = useState<SpecificationCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SpecificationCatalogItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchSpecificationCatalog(true)
      .then((entries) => {
        const withSeeds = entries.map((entry) => ({
          ...entry,
          internalAcceptanceItems: seedCatalogAcceptanceItems(
            entry.name,
            entry.internalAcceptanceItems,
          ),
        }));
        setCatalog(withSeeds);
        setDrafts(Object.fromEntries(withSeeds.map((entry) => [entry.id, entry])));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania katalogu.");
      })
      .finally(() => setLoading(false));
  }, []);

  function updateDraft(id: string, patch: Partial<SpecificationCatalogItem>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function updateAcceptanceItem(
    catalogId: string,
    itemId: string,
    patch: Partial<InternalAcceptanceTemplateStaticItem>,
  ) {
    const draft = drafts[catalogId];
    if (!draft) return;
    updateDraft(catalogId, {
      internalAcceptanceItems: draft.internalAcceptanceItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    });
  }

  function addAcceptanceItem(catalogId: string) {
    const draft = drafts[catalogId];
    if (!draft) return;
    updateDraft(catalogId, {
      internalAcceptanceItems: withStaticItemPositions([
        ...draft.internalAcceptanceItems,
        {
          id: crypto.randomUUID(),
          name: "Nowy punkt odbioru",
          description: "",
          category: draft.name,
          priority: "normal",
          mandatory: true,
          position: draft.internalAcceptanceItems.length,
        },
      ]),
    });
  }

  async function handleAddCatalogItem(category = "Ogólne") {
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      const created = await createSpecificationCatalogItem({
        name: "Nowa pozycja",
        category,
        description: "",
      });
      const withSeeds: SpecificationCatalogItem = {
        ...created,
        internalAcceptanceItems: seedCatalogAcceptanceItems(created.name, []),
      };
      setCatalog((current) => [...current, withSeeds]);
      setDrafts((current) => ({ ...current, [created.id]: withSeeds }));
      setExpandedId(created.id);
      setMessage("Dodano pozycję — uzupełnij nazwę, opis i punkty odbioru, potem zapisz.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Błąd dodawania pozycji.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(catalogId: string) {
    const draft = drafts[catalogId];
    if (!draft) return;
    const confirmed = window.confirm(
      `Usunąć pozycję „${draft.name}” z katalogu?\n\nZniknie z konfiguratora specyfikacji w nowych projektach. Istniejące wpisy w projektach pozostaną bez powiązania z katalogiem.`,
    );
    if (!confirmed) return;

    setDeletingId(catalogId);
    setMessage(null);
    setError(null);
    try {
      await deleteSpecificationCatalogItem(catalogId);
      setCatalog((current) => current.filter((entry) => entry.id !== catalogId));
      setDrafts((current) => {
        const next = { ...current };
        delete next[catalogId];
        return next;
      });
      if (expandedId === catalogId) {
        setExpandedId(null);
      }
      setMessage(`Usunięto „${draft.name}”.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania pozycji.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSave(catalogId: string) {
    const draft = drafts[catalogId];
    if (!draft) return;
    setSavingId(catalogId);
    setMessage(null);
    setError(null);
    try {
      const updatedMeta = await updateSpecificationCatalogItem(catalogId, {
        name: draft.name,
        category: draft.category,
        description: draft.description,
        position: draft.position,
        isActive: draft.isActive,
      });
      const normalizedItems = withStaticItemPositions(draft.internalAcceptanceItems);
      const updatedAcceptance = await saveSpecificationCatalogAcceptanceItems(
        catalogId,
        normalizedItems,
      );
      const merged = { ...updatedMeta, internalAcceptanceItems: updatedAcceptance.internalAcceptanceItems };
      setCatalog((current) => current.map((entry) => (entry.id === catalogId ? merged : entry)));
      setDrafts((current) => ({ ...current, [catalogId]: merged }));
      setMessage(`Zapisano „${merged.name}”.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie katalogu specyfikacji…</p>;
  }

  const grouped = catalog.reduce<Map<string, SpecificationCatalogItem[]>>((map, entry) => {
    const list = map.get(entry.category) ?? [];
    list.push(entry);
    map.set(entry.category, list);
    return map;
  }, new Map());

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Te pozycje widoczne są w konfiguratorze specyfikacji projektu. Dla każdej zdefiniuj checklistę
          odbioru wewnętrznego — gdy klient ma np. Oświetlenie w specyfikacji, punkty trafią do Quality Gate.
        </p>
        <Button type="button" disabled={creating} onClick={() => void handleAddCatalogItem()}>
          <Plus className="mr-1.5 h-4 w-4" />
          {creating ? "Dodawanie…" : "Dodaj pozycję katalogu"}
        </Button>
      </div>

      {catalog.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted">Katalog jest pusty.</p>
            <Button type="button" className="mt-4" disabled={creating} onClick={() => void handleAddCatalogItem()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Dodaj pierwszą pozycję
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {[...grouped.entries()].map(([category, entries]) => (
        <Card key={category}>
          <CardContent className="grid gap-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{category}</h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={creating}
                onClick={() => void handleAddCatalogItem(category)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Dodaj w „{category}”
              </Button>
            </div>
            {entries.map((entry) => {
              const draft = drafts[entry.id] ?? entry;
              const expanded = expandedId === entry.id;
              return (
                <div key={entry.id} className="rounded-xl border border-border/70 bg-surface-muted/15 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{draft.name}</p>
                      <p className="text-xs text-muted">
                        {draft.internalAcceptanceItems.length} punktów odbioru wewnętrznego
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setExpandedId(expanded ? null : entry.id)}
                      >
                        {expanded ? "Zwiń" : "Edytuj pozycję i odbiór"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={deletingId === entry.id}
                        onClick={() => void handleDelete(entry.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {deletingId === entry.id ? "Usuwanie…" : "Usuń"}
                      </Button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-4 grid gap-4 border-t border-border/60 pt-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Nazwa w katalogu">
                          <Input
                            value={draft.name}
                            onChange={(event) => updateDraft(entry.id, { name: event.target.value })}
                          />
                        </Field>
                        <Field label="Kategoria">
                          <Input
                            value={draft.category}
                            onChange={(event) => updateDraft(entry.id, { category: event.target.value })}
                          />
                        </Field>
                      </div>
                      <Field label="Opis (widoczny w projekcie)">
                        <Textarea
                          value={draft.description}
                          onChange={(event) => updateDraft(entry.id, { description: event.target.value })}
                          rows={2}
                        />
                      </Field>

                      <div className="grid gap-3">
                        <p className="text-sm font-medium text-foreground">Punkty odbioru wewnętrznego</p>
                        {draft.internalAcceptanceItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="grid gap-3 rounded-xl border border-border/60 bg-surface/40 p-3"
                          >
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={index === 0}
                                onClick={() =>
                                  updateDraft(entry.id, {
                                    internalAcceptanceItems: moveItem(
                                      draft.internalAcceptanceItems,
                                      index,
                                      "up",
                                    ),
                                  })
                                }
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={index === draft.internalAcceptanceItems.length - 1}
                                onClick={() =>
                                  updateDraft(entry.id, {
                                    internalAcceptanceItems: moveItem(
                                      draft.internalAcceptanceItems,
                                      index,
                                      "down",
                                    ),
                                  })
                                }
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  updateDraft(entry.id, {
                                    internalAcceptanceItems: withStaticItemPositions(
                                      draft.internalAcceptanceItems.filter(
                                        (row) => row.id !== item.id,
                                      ),
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <Field label="Nazwa">
                                <Input
                                  value={item.name}
                                  onChange={(event) =>
                                    updateAcceptanceItem(entry.id, item.id, { name: event.target.value })
                                  }
                                />
                              </Field>
                              <Field label="Kategoria QA">
                                <Input
                                  value={item.category}
                                  list={`cat-${entry.id}-${item.id}`}
                                  onChange={(event) =>
                                    updateAcceptanceItem(entry.id, item.id, {
                                      category: event.target.value,
                                    })
                                  }
                                />
                                <datalist id={`cat-${entry.id}-${item.id}`}>
                                  {INTERNAL_ACCEPTANCE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat} />
                                  ))}
                                </datalist>
                              </Field>
                            </div>
                            <Field label="Kryterium">
                              <Textarea
                                value={item.description}
                                onChange={(event) =>
                                  updateAcceptanceItem(entry.id, item.id, {
                                    description: event.target.value,
                                  })
                                }
                                rows={2}
                              />
                            </Field>
                            <div className="grid gap-3 md:grid-cols-2">
                              <Field label="Priorytet">
                                <Select
                                  value={item.priority}
                                  onChange={(event) =>
                                    updateAcceptanceItem(entry.id, item.id, {
                                      priority: event.target
                                        .value as InternalAcceptanceTemplateStaticItem["priority"],
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
                                  onChange={(event) =>
                                    updateAcceptanceItem(entry.id, item.id, {
                                      mandatory: event.target.checked,
                                    })
                                  }
                                />
                                Obowiązkowy
                              </label>
                            </div>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="secondary" onClick={() => addAcceptanceItem(entry.id)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Dodaj punkt odbioru
                        </Button>
                      </div>

                      <Button
                        type="button"
                        disabled={savingId === entry.id}
                        onClick={() => void handleSave(entry.id)}
                      >
                        {savingId === entry.id ? "Zapisywanie…" : "Zapisz pozycję katalogu"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
