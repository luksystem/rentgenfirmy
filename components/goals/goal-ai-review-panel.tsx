"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveReviewOutcomeLabel } from "@/lib/goals/module-settings";
import type { GoalAiAdviceResponse, GoalLevel, GoalReviewOutcome } from "@/lib/goals/types";
import { useGoalStore } from "@/store/goal-store";

/** Doradca AI w trakcie trwania celu (trigger='review', Faza 6) — sugestia korekty planu. */
export function GoalAiReviewPanel({
  goalId,
  description,
  level,
  boardKind,
  onApplyStatusSuggestion,
}: {
  goalId: string;
  description: string;
  level: GoalLevel;
  boardKind: string;
  onApplyStatusSuggestion?: (outcome: GoalReviewOutcome) => void;
}) {
  const reviewOutcomes = useGoalStore((state) => state.moduleSettings.reviewOutcomes);
  const [open, setOpen] = useState(false);
  const [advice, setAdvice] = useState<GoalAiAdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/goals/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || "Ocena bieżącej realizacji celu.",
          trigger: "review",
          goalId,
          boardKind,
          level,
        }),
      });
      const payload = (await response.json()) as GoalAiAdviceResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się uzyskać sugestii AI.");
      }
      setAdvice(payload);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Błąd doradcy AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Doradca AI — sugestia korekty w trakcie realizacji
        </span>
        <span className="text-xs text-muted">{open ? "Zwiń" : "Rozwiń"}</span>
      </button>

      {open ? (
        <div className="grid gap-3">
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={loading} onClick={() => void handleAsk()}>
              {loading ? "Analizuję…" : advice ? "Zapytaj ponownie" : "Zapytaj AI o korektę"}
            </Button>
          </div>

          {error ? <p className="text-xs text-rose-400">{error}</p> : null}

          {advice?.ongoingAdjustment ? (
            <div className="grid gap-2 rounded-lg border border-border/60 bg-surface/60 p-3 text-sm">
              <p className="text-foreground/90">{advice.ongoingAdjustment.summary}</p>

              {advice.ongoingAdjustment.recommendedActions.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Zalecane działania
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-foreground/80">
                    {advice.ongoingAdjustment.recommendedActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {advice.ongoingAdjustment.statusSuggestion ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted">
                    Sugerowany wynik przeglądu:{" "}
                    <span className="font-medium text-foreground">
                      {resolveReviewOutcomeLabel(
                        advice.ongoingAdjustment.statusSuggestion,
                        reviewOutcomes,
                      )}
                    </span>
                  </p>
                  {onApplyStatusSuggestion ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onApplyStatusSuggestion(advice.ongoingAdjustment!.statusSuggestion!)
                      }
                    >
                      Zastosuj do przeglądu
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
