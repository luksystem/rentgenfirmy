"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { KbArticleOrderPicker } from "@/components/smart-home-kb/kb-article-order-picker";
import type { SmartHomeKbArticle } from "@/lib/smart-home-kb/types";
import { useSmartHomeKbPathsStore } from "@/store/smart-home-kb-paths-store";

export function KbPathTemplateManagerDialog({
  open,
  onOpenChange,
  articles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: SmartHomeKbArticle[];
}) {
  const ensureTemplates = useSmartHomeKbPathsStore((state) => state.ensureTemplates);
  const templates = useSmartHomeKbPathsStore((state) => state.templates);
  const createTemplate = useSmartHomeKbPathsStore((state) => state.createTemplate);
  const removeTemplate = useSmartHomeKbPathsStore((state) => state.removeTemplate);
  const setTemplateArticles = useSmartHomeKbPathsStore((state) => state.setTemplateArticles);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void ensureTemplates();
    }
  }, [open, ensureTemplates]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const template = await createTemplate({ name, description });
      setName("");
      setDescription("");
      setExpandedId(template.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się utworzyć szablonu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(640px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Szablony ścieżek szkoleniowych</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-border bg-surface-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpandedId((prev) => (prev === template.id ? null : template.id))}
                >
                  <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                  <p className="text-xs text-muted">{template.items.length} artykuł(ów)</p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void removeTemplate(template.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </Button>
              </div>
              {expandedId === template.id ? (
                <div className="mt-3">
                  <KbArticleOrderPicker
                    allArticles={articles}
                    selectedArticleIds={template.items.map((item) => item.articleId)}
                    onChange={(articleIds) => void setTemplateArticles(template.id, articleIds)}
                  />
                </div>
              ) : null}
            </div>
          ))}
          {templates.length === 0 ? (
            <p className="text-xs text-muted">Brak szablonów — dodaj pierwszy poniżej.</p>
          ) : null}

          <form onSubmit={handleCreate} className="grid gap-2 rounded-xl border border-dashed border-border p-3">
            <Field label="Nowy szablon">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="np. Wprowadzenie do systemu" />
            </Field>
            <Field label="Opis (opcjonalnie)">
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Dodaj szablon
              </Button>
            </div>
          </form>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
