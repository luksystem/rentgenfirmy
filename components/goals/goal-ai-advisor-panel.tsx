"use client";

import { useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GOAL_PERIOD_TYPE_LABELS,
  type GoalAiAdviceResponse,
  type GoalLevel,
  type GoalMethodology,
} from "@/lib/goals/types";

export function GoalAiAdvisorPanel({
  description,
  level,
  boardKind,
  methodologies,
  onApply,
}: {
  description: string;
  level: GoalLevel;
  boardKind: string;
  methodologies: GoalMethodology[];
  onApply: (advice: GoalAiAdviceResponse) => void;
}) {
  const [advice, setAdvice] = useState<GoalAiAdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const canAsk = description.trim().length > 0 && !loading;

  async function handleAsk() {
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const response = await fetch("/api/goals/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), trigger: "create", boardKind, level }),
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

  function handleApply() {
    if (!advice) return;
    onApply(advice);
    setApplied(true);
  }

  function methodologyName(code: string) {
    return methodologies.find((entry) => entry.code === code)?.name ?? code;
  }

  return (
    <div className="grid gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          Doradca AI — metodologia i struktura celu
        </span>
        <Button type="button" size="sm" disabled={!canAsk} onClick={() => void handleAsk()}>
          {loading ? "Analizuję opis…" : advice ? "Zapytaj ponownie" : "Zapytaj AI"}
        </Button>
      </div>

      {!description.trim() ? (
        <p className="text-xs text-muted">Wpisz opis celu powyżej, aby skorzystać z doradcy AI.</p>
      ) : null}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}

      {advice ? (
        <div className="grid gap-3 rounded-lg border border-border/60 bg-surface/60 p-3 text-sm">
          {advice.isTooVague ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Opis może być zbyt ogólny lub niemierzalny
                {advice.vagueWarningReason ? `: ${advice.vagueWarningReason}` : "."} AI mimo to
                zaproponowało wstępną strukturę poniżej.
              </span>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Rekomendowana metodologia
            </p>
            <p className="font-medium text-foreground">
              {advice.recommendedMethodologyName ?? "Brak rekomendacji"}
            </p>
            {advice.justification ? (
              <p className="mt-1 text-xs text-foreground/80">{advice.justification}</p>
            ) : null}
          </div>

          {advice.alternatives.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Alternatywy</p>
              <ul className="mt-1 grid gap-1">
                {advice.alternatives.map((alt) => (
                  <li key={alt.code} className="text-xs text-foreground/80">
                    <span className="font-medium text-foreground">{methodologyName(alt.code)}</span>
                    {" — "}
                    {alt.whenBetter}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {advice.structure.monitoringApproach ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Sposób monitorowania
                </p>
                <p className="text-xs text-foreground/80">{advice.structure.monitoringApproach}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sugerowana częstotliwość przeglądów
              </p>
              <p className="text-xs text-foreground/80">
                {GOAL_PERIOD_TYPE_LABELS[advice.structure.reviewFrequency]}
              </p>
            </div>
          </div>

          {advice.structure.kpis.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">KPI</p>
              <ul className="mt-1 grid gap-0.5 text-xs text-foreground/80">
                {advice.structure.kpis.map((kpi) => (
                  <li key={kpi.name}>
                    {kpi.name}: {kpi.target} {kpi.unit}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {advice.structure.risks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ryzyka</p>
              <ul className="mt-1 list-inside list-disc text-xs text-foreground/80">
                {advice.structure.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {[
            { label: "Inicjatywy", items: advice.structure.initiatives },
            { label: "Zadania", items: advice.structure.tasks },
            { label: "Zasoby", items: advice.structure.resources },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-foreground/80">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

          {advice.structure.budgetEstimate.amount > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Orientacyjny budżet
              </p>
              <p className="text-xs text-foreground/80">
                {advice.structure.budgetEstimate.amount} {advice.structure.budgetEstimate.currency}
                {advice.structure.budgetEstimate.note ? ` — ${advice.structure.budgetEstimate.note}` : ""}
              </p>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" size="sm" variant={applied ? "secondary" : "default"} onClick={handleApply}>
              {applied ? "Zastosowano ✓" : "Zastosuj sugestię AI"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
