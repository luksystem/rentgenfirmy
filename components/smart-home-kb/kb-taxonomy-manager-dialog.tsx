"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { SmartHomeKbCategory, SmartHomeKbTag } from "@/lib/smart-home-kb/types";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";

export function KbTaxonomyManagerDialog({
  open,
  onOpenChange,
  categories,
  tags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: SmartHomeKbCategory[];
  tags: SmartHomeKbTag[];
}) {
  const createCategory = useSmartHomeKbStore((state) => state.createCategory);
  const removeCategory = useSmartHomeKbStore((state) => state.removeCategory);
  const ensureTag = useSmartHomeKbStore((state) => state.ensureTag);
  const renameTag = useSmartHomeKbStore((state) => state.renameTag);
  const removeTag = useSmartHomeKbStore((state) => state.removeTag);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      return;
    }
    setSavingCategory(true);
    setError(null);
    try {
      await createCategory({ name: newCategoryName, description: newCategoryDescription });
      setNewCategoryName("");
      setNewCategoryDescription("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się dodać kategorii.");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleRemoveCategory(id: string) {
    setError(null);
    try {
      await removeCategory(id);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Nie udało się usunąć kategorii.");
    }
  }

  async function handleAddTag(event: React.FormEvent) {
    event.preventDefault();
    if (!newTagName.trim()) {
      return;
    }
    setSavingTag(true);
    setError(null);
    try {
      await ensureTag(newTagName);
      setNewTagName("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się dodać tagu.");
    } finally {
      setSavingTag(false);
    }
  }

  async function handleRenameTag(id: string, currentName: string, nextValue: string) {
    const trimmed = nextValue.trim();
    if (!trimmed || trimmed === currentName) {
      return;
    }
    setError(null);
    try {
      await renameTag(id, trimmed);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Nie udało się zmienić nazwy tagu.");
    }
  }

  async function handleRemoveTag(id: string) {
    setError(null);
    try {
      await removeTag(id);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Nie udało się usunąć tagu.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kategorie i tagi</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <section className="grid gap-3">
            <h4 className="text-sm font-semibold text-foreground">Kategorie</h4>
            <div className="grid gap-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
                    {category.description ? (
                      <p className="truncate text-xs text-muted">{category.description}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemoveCategory(category.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 ? (
                <p className="text-xs text-muted">Brak kategorii — dodaj pierwszą poniżej.</p>
              ) : null}
            </div>

            <form onSubmit={handleAddCategory} className="grid gap-2 rounded-xl border border-dashed border-border p-3">
              <Field label="Nowa kategoria">
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="np. Ogrzewanie i klimatyzacja"
                />
              </Field>
              <Field label="Opis (opcjonalnie)">
                <Textarea
                  value={newCategoryDescription}
                  onChange={(event) => setNewCategoryDescription(event.target.value)}
                  rows={2}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingCategory}>
                  {savingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Dodaj kategorię
                </Button>
              </div>
            </form>
          </section>

          <section className="grid gap-3">
            <h4 className="text-sm font-semibold text-foreground">Tagi</h4>
            <div className="grid gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/20 px-3 py-2"
                >
                  <Input
                    defaultValue={tag.name}
                    className="h-8"
                    onBlur={(event) => void handleRenameTag(tag.id, tag.name, event.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemoveTag(tag.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              ))}
              {tags.length === 0 ? <p className="text-xs text-muted">Brak tagów — dodaj pierwszy poniżej.</p> : null}
            </div>

            <form onSubmit={handleAddTag} className="grid gap-2 rounded-xl border border-dashed border-border p-3">
              <Field label="Nowy tag">
                <Input
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="np. termostaty"
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingTag}>
                  {savingTag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Dodaj tag
                </Button>
              </div>
            </form>
          </section>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
