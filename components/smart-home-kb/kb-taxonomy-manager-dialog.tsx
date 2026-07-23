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
  const renameTag = useSmartHomeKbStore((state) => state.renameTag);
  const removeTag = useSmartHomeKbStore((state) => state.removeTag);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
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
                    onClick={() => void removeCategory(category.id)}
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
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value && value !== tag.name) {
                        void renameTag(tag.id, value);
                      }
                    }}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => void removeTag(tag.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              ))}
              {tags.length === 0 ? (
                <p className="text-xs text-muted">
                  Tagi tworzysz bezpośrednio w formularzu artykułu — tu możesz je porządkować.
                </p>
              ) : null}
            </div>
          </section>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
