"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AskResult = { answer: string; sources: Array<{ title: string; slug: string }> };

export function KbAiSearchBox() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/smart-home-kb/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się uzyskać odpowiedzi.");
      }
      setResult({ answer: payload.answer, sources: payload.sources ?? [] });
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Nie udało się uzyskać odpowiedzi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Zapytaj AI</h3>
        </div>
        <form onSubmit={handleAsk} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="np. Jak zresetować sterownik oświetlenia?"
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Zapytaj
          </Button>
        </form>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {result ? (
          <div className="grid gap-2 rounded-xl border border-border bg-surface-elevated p-3">
            <p className="text-sm text-foreground">{result.answer}</p>
            {result.sources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.sources.map((source) => (
                  <Link
                    key={source.slug}
                    href={`/wiedza-smart-home/${source.slug}`}
                    className="rounded-full border border-border bg-surface-muted/40 px-2.5 py-1 text-xs text-muted hover:text-foreground"
                  >
                    {source.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
