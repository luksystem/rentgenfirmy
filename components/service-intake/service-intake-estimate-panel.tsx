"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntakeAiEstimatePublic, IntakeSuggestedWorkMode } from "@/lib/service-intake/intake-ai-estimate";
import {
  SERVICE_INTAKE_WORK_PREFERENCE_LABELS,
  type ServiceIntakeWorkPreference,
} from "@/lib/service-intake/types";
import { cn, formatMoney } from "@/lib/utils";

const WORK_MODE_HINTS: Record<IntakeSuggestedWorkMode, string> = {
  on_site: "Na podstawie opisu przeważają prace u klienta w obiekcie.",
  remote: "Na podstawie opisu większość prac można wykonać zdalnie.",
  mixed: "Część prac u klienta, część zdalnie — wybierz preferencję poniżej.",
};

export function ServiceIntakeEstimatePanel({
  estimate,
  loading,
  error,
  workPreference,
  onWorkPreferenceChange,
  onRetry,
}: {
  estimate: IntakeAiEstimatePublic | null;
  loading: boolean;
  error: string | null;
  workPreference: ServiceIntakeWorkPreference | null;
  onWorkPreferenceChange: (value: ServiceIntakeWorkPreference) => void;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface-muted/20 p-4 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Szacujemy orientacyjny koszt na podstawie opisu…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        <p>{error}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        ) : null}
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground">Orientacyjna wycena AI</h3>
        </div>
        <span className="text-xs text-muted">Pewność: {Math.round(estimate.confidence * 100)}%</span>
      </div>

      <p className="text-sm text-muted">{estimate.summary}</p>
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
        {estimate.disclaimer}
      </p>

      <div className="grid gap-2 rounded-xl border border-border/70 bg-background/40 p-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted">Szacowana kwota netto usługi</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {formatMoney(estimate.estimatedNetTotal)}
          </span>
        </div>
        {estimate.prioritySurchargeApplied &&
        estimate.estimatedNetTotalBeforeSurcharge != null &&
        estimate.prioritySurchargePercent ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Wliczono dopłatę za priorytet CAFE C/A (+{estimate.prioritySurchargePercent}% do stawek). Bez
            dopłaty: ~{formatMoney(estimate.estimatedNetTotalBeforeSurcharge)} netto.
          </div>
        ) : null}
        {estimate.materialsNetEstimate ? (
          <div className="flex justify-between gap-2 text-xs text-muted">
            <span>Sprzęt / materiały (orientacyjnie, do weryfikacji)</span>
            <span>~{formatMoney(estimate.materialsNetEstimate)}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-1 text-sm">
        <p className="font-medium text-foreground">Szacowane godziny pracy</p>
        <p className="text-muted">
          Instalator {estimate.hours.installer} h · pomocnik {estimate.hours.helper} h · programista u
          klienta {estimate.hours.programmerOnsite} h · programista zdalnie{" "}
          {estimate.hours.programmerRemote} h · nadzór {estimate.hours.supervision} h
        </p>
        <p className="text-xs text-muted">
          Dojazd: {estimate.travel.oneWayDistanceKm} km w jedną stronę · {estimate.travel.trips}{" "}
          wyjazd(y) · {estimate.travel.overnights} nocleg(i)
        </p>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">Sugerowany sposób realizacji</p>
        <p className="text-xs text-muted">{WORK_MODE_HINTS[estimate.suggestedWorkMode]}</p>
        <div className="grid gap-2">
          {(Object.keys(SERVICE_INTAKE_WORK_PREFERENCE_LABELS) as ServiceIntakeWorkPreference[]).map(
            (option) => (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                  workPreference === option
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface-muted/20 hover:border-accent/40",
                )}
              >
                <input
                  type="radio"
                  name="workPreference"
                  checked={workPreference === option}
                  onChange={() => onWorkPreferenceChange(option)}
                  className="mt-0.5"
                />
                <span>{SERVICE_INTAKE_WORK_PREFERENCE_LABELS[option]}</span>
              </label>
            ),
          )}
        </div>
      </div>

      {estimate.questions.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-sm">
          <p className="mb-2 font-medium text-foreground">Do doprecyzowania</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {estimate.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
