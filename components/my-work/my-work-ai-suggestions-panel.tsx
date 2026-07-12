"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkTaskAiSuggestion } from "@/lib/my-work/ai-types";
import { fetchWorkTaskSuggestionsAi } from "@/lib/supabase/my-work-repository";

export function MyWorkAiSuggestionsPanel({
  assignedUserId,
  onApply,
}: {
  assignedUserId?: string;
  onApply: (suggestion: WorkTaskAiSuggestion) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<WorkTaskAiSuggestion[]>([]);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);

  async function handleAsk() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWorkTaskSuggestionsAi({ assignedUserId });
      setSuggestions(result.suggestions);
      setSummary(result.summary);
      setSource(result.source);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Błąd sugestii AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          Sugestie zadań AI
        </span>
        <Button type="button" size="sm" disabled={loading} onClick={() => void handleAsk()}>
          {loading ? "Analizuję…" : suggestions.length ? "Odśwież sugestie" : "Zaproponuj zadania"}
        </Button>
      </div>

      {source ? (
        <p className="text-xs text-muted">
          Źródło: {source === "ai" ? "model AI" : "reguły operacyjne (fallback)"}
        </p>
      ) : null}

      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
      {summary ? <p className="text-sm text-muted">{summary}</p> : null}

      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.title}-${index}`}
          className="rounded-lg border border-border/80 bg-surface-elevated p-3"
        >
          <p className="font-medium text-foreground">{suggestion.title}</p>
          <p className="mt-1 text-xs text-muted">{suggestion.reason}</p>
          {suggestion.description ? (
            <p className="mt-2 text-sm text-foreground/90">{suggestion.description}</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => onApply(suggestion)}
          >
            Użyj sugestii
          </Button>
        </div>
      ))}
    </div>
  );
}
