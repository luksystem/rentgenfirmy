"use client";

import { useState } from "react";
import { Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { KnowledgeSuggestionResult } from "@/lib/knowledge/types";

type AskState = "idle" | "loading" | "shown" | "error";

export function KnowledgeAskPanel() {
  const [description, setDescription] = useState("");
  const [state, setState] = useState<AskState>("idle");
  const [result, setResult] = useState<KnowledgeSuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (description.trim().length < 10) {
      setError("Opisz sytuację (minimum 10 znaków).");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    try {
      const response = await fetch("/api/knowledge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
        credentials: "include",
      });
      const payload = (await response.json()) as {
        suggestion?: KnowledgeSuggestionResult;
        error?: string;
      };
      if (!response.ok || !payload.suggestion) {
        throw new Error(payload.error ?? "Nie udało się wygenerować odpowiedzi.");
      }
      setResult(payload.suggestion);
      setState("shown");
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Nie udało się wygenerować odpowiedzi.");
      setState("error");
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start gap-2">
          <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-medium text-foreground">Zapytaj bazę wiedzy</p>
            <p className="mt-0.5 text-sm text-muted">
              Opisz sytuację u klienta — AI sprawdzi bazę wiedzy firmy oraz historię zgłoszeń
              serwisowych (w tym archiwum SERWIS z ActiveCollab) i zaproponuje rozwiązanie.
            </p>
          </div>
        </div>

        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="np. Loxone Miniserver Gen1 nie widzi czujki DMX230 podpiętej przez Relay — co sprawdzić?"
        />

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div>
          <Button type="button" disabled={state === "loading"} onClick={() => void handleAsk()}>
            {state === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Szukam w bazie wiedzy…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Zapytaj
              </>
            )}
          </Button>
        </div>

        {state === "shown" && result ? (
          <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4 text-sm">
            {result.hasSuggestion ? (
              <>
                <p className="font-medium text-foreground">Sugestia</p>
                <p className="mt-2 whitespace-pre-line text-foreground/90">{result.summary}</p>
                {result.steps.length > 0 ? (
                  <ol className="mt-3 grid list-decimal gap-1 pl-4 text-foreground/90">
                    {result.steps.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ol>
                ) : null}
                {result.followUpQuestion ? (
                  <p className="mt-3 text-xs text-muted">Dodatkowe pytanie: {result.followUpQuestion}</p>
                ) : null}
                {result.sourceTitles.length > 0 ? (
                  <p className="mt-3 text-xs text-muted">Źródła: {result.sourceTitles.join(", ")}</p>
                ) : null}
              </>
            ) : (
              <p className="text-foreground/90">
                {result.summary || "Baza wiedzy nie zawiera wystarczających informacji o podobnym przypadku."}
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Sugestia AI na podstawie bazy wiedzy firmy — zweryfikuj przed przekazaniem klientowi.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
