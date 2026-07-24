"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { KbArticleOrderPicker } from "@/components/smart-home-kb/kb-article-order-picker";
import type { SmartHomeKbArticle } from "@/lib/smart-home-kb/types";
import { useSmartHomeKbPathsStore } from "@/store/smart-home-kb-paths-store";

/** Szablony ścieżek szkoleniowych — gotowe, wielokrotnego użytku listy artykułów do skopiowania klientom w module Klienci. */
export function KbPathTemplatesView({ articles }: { articles: SmartHomeKbArticle[] }) {
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
    void ensureTemplates();
  }, [ensureTemplates]);

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

  async function handleRemove(templateId: string, templateName: string) {
    if (!window.confirm(`Usunąć szablon „${templateName}”? Ścieżki już utworzone u klientów zostaną nietknięte.`)) {
      return;
    }
    await removeTemplate(templateId);
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Gotowe listy artykułów do wielokrotnego użycia — w module Klienci, w zakładce „Ścieżka szkoleniowa”,
        możesz z każdego szablonu utworzyć niezależną kopię dla konkretnego klienta.
      </p>

      <div className="grid gap-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpandedId((prev) => (prev === template.id ? null : template.id))}
                >
                  <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                  {template.description ? (
                    <p className="truncate text-xs text-muted">{template.description}</p>
                  ) : null}
                  <p className="text-xs text-muted">{template.items.length} artykuł(ów)</p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRemove(template.id, template.name)}
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
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 ? (
          <p className="text-xs text-muted">Brak szablonów — dodaj pierwszy poniżej.</p>
        ) : null}
      </div>

      <form onSubmit={handleCreate} className="grid gap-2 rounded-xl border border-dashed border-border p-4 sm:max-w-md">
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
  );
}
