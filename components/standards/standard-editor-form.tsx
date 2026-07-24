"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { restructureCompanyStandardContent } from "@/lib/supabase/standards-ai-client";
import type { CompanyStandard, CompanyStandardInput, CompanyStandardStep } from "@/lib/standards/types";

export function StandardEditorForm({
  initial,
  onSave,
  saving,
}: {
  initial?: CompanyStandard | null;
  onSave: (input: CompanyStandardInput) => void | Promise<void>;
  saving?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [contextHtml, setContextHtml] = useState(initial?.contextHtml ?? "");
  const [steps, setSteps] = useState<CompanyStandardStep[]>(initial?.steps ?? []);
  const [tipsHtml, setTipsHtml] = useState(initial?.tipsHtml ?? "");
  const [status, setStatus] = useState<CompanyStandard["status"]>(initial?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function handleAiRestructure() {
    if (!draftText.trim()) {
      setError("Wklej surowy tekst do uporządkowania przez AI.");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const result = await restructureCompanyStandardContent(draftText);
      setContextHtml(result.contextHtml);
      setSteps(result.steps);
      setTipsHtml(result.tipsHtml);
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Nie udało się uporządkować treści.");
    } finally {
      setAiLoading(false);
    }
  }

  function updateStep(index: number, patch: Partial<CompanyStandardStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Podaj tytuł standardu.");
      return;
    }
    setError(null);
    await onSave({ title, summary, contextHtml, steps, tipsHtml, status });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field label="Tytuł">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="np. Drabina zawsze w aucie serwisowym" />
      </Field>
      <Field label="Krótki opis">
        <Input value={summary} onChange={(event) => setSummary(event.target.value)} />
      </Field>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Uporządkuj z AI</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-xs text-muted">
            Wklej surowy opis (np. notatki z rozwiązania problemu) — AI rozbije go na kontekst, kroki i
            wskazówki poniżej, wg promptu skonfigurowanego w ustawieniach.
          </p>
          <Textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            rows={4}
            placeholder="Wklej surowy tekst..."
          />
          <Button type="button" variant="secondary" size="sm" disabled={aiLoading} onClick={() => void handleAiRestructure()}>
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiLoading ? "Porządkowanie..." : "Uporządkuj z AI"}
          </Button>
        </CardContent>
      </Card>

      <Field label="Kontekst — dlaczego ten standard istnieje">
        <Textarea value={contextHtml} onChange={(event) => setContextHtml(event.target.value)} rows={4} />
      </Field>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Kroki</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSteps((prev) => [...prev, { title: "", bodyHtml: "" }])}
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj krok
          </Button>
        </div>
        {steps.length === 0 ? (
          <p className="text-xs text-muted">Brak kroków — dodaj przynajmniej jeden.</p>
        ) : (
          steps.map((step, index) => (
            <Card key={index}>
              <CardContent className="grid gap-2 py-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={step.title}
                    onChange={(event) => updateStep(index, { title: event.target.value })}
                    placeholder={`Krok ${index + 1} — tytuł`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                    aria-label="Usuń krok"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
                <Textarea
                  value={step.bodyHtml}
                  onChange={(event) => updateStep(index, { bodyHtml: event.target.value })}
                  rows={3}
                  placeholder="Treść kroku"
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Field label="Wskazówki">
        <Textarea value={tipsHtml} onChange={(event) => setTipsHtml(event.target.value)} rows={3} />
      </Field>

      <Field label="Status">
        <Select value={status} onChange={(event) => setStatus(event.target.value as CompanyStandard["status"])}>
          <option value="draft">Szkic</option>
          <option value="published">Opublikowany</option>
        </Select>
      </Field>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Zapisywanie..." : "Zapisz standard"}
      </Button>
    </form>
  );
}
