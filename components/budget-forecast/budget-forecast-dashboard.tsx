"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BudgetForecastSlidersPanel } from "@/components/budget-forecast/budget-forecast-sliders-panel";
import { BudgetForecastTable } from "@/components/budget-forecast/budget-forecast-table";
import { BudgetForecastChart } from "@/components/budget-forecast/budget-forecast-chart";
import { BudgetScenarioActionsPanel } from "@/components/budget-forecast/budget-scenario-actions-panel";
import { buildMonthlyForecast } from "@/lib/budget-forecast/engine";
import { loadBudgetForecastDataset, type BudgetForecastDataset } from "@/lib/budget-forecast/load-forecast-data";
import { saveBudgetForecastSettings } from "@/lib/supabase/budget-forecast-settings-repository";
import { getUserDisplayName, hasFullAppAccess } from "@/lib/auth/types";
import { useAuthStore } from "@/store/auth-store";
import type { BudgetConfidenceLevel } from "@/lib/budget-forecast/types";

export function BudgetForecastDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const canManageSettings = Boolean(profile && hasFullAppAccess(profile.role));

  const [dataset, setDataset] = useState<BudgetForecastDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [openingBalance, setOpeningBalance] = useState(0);
  const [variableCostPercent, setVariableCostPercent] = useState(0.45);
  const [confidenceWeights, setConfidenceWeights] = useState<Record<BudgetConfidenceLevel, number>>({
    ok: 1,
    high: 0.7,
    medium: 0.4,
    low: 0.15,
    frozen: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadBudgetForecastDataset()
      .then((loaded) => {
        if (cancelled) return;
        setDataset(loaded);
        setOpeningBalance(loaded.settings.openingBalance);
        setVariableCostPercent(loaded.settings.variableCostPercent);
        setConfidenceWeights(loaded.settings.confidenceWeights);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nie udało się wczytać prognozy.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!dataset) return [];
    return buildMonthlyForecast({
      months: dataset.months,
      currentMonth: dataset.currentMonth,
      openingBalance,
      actualPayments: dataset.actualPayments,
      scheduledEntries: dataset.scheduledEntries,
      pipelineForecasts: dataset.pipelineForecasts,
      confidenceWeights,
      costItems: dataset.costItems,
      variableCostPercent,
      scenarioActions: dataset.scenarioActions,
    });
  }, [dataset, openingBalance, variableCostPercent, confidenceWeights]);

  const dirty = Boolean(
    dataset &&
      (openingBalance !== dataset.settings.openingBalance ||
        variableCostPercent !== dataset.settings.variableCostPercent ||
        BUDGET_CONFIDENCE_KEYS.some((key) => confidenceWeights[key] !== dataset.settings.confidenceWeights[key])),
  );

  async function handleSave() {
    if (!dataset) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveBudgetForecastSettings({
        ...dataset.settings,
        openingBalance,
        variableCostPercent,
        confidenceWeights,
        updatedByName: profile ? getUserDisplayName(profile) : null,
        updatedAt: new Date().toISOString(),
      });
      setDataset({ ...dataset, settings: saved });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">Wczytywanie prognozy...</CardContent>
      </Card>
    );
  }

  if (error && !dataset) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-rose-400">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 gap-6">
        <BudgetScenarioActionsPanel
          actions={dataset?.scenarioActions ?? []}
          onActionsChange={(next) => setDataset(dataset ? { ...dataset, scenarioActions: next } : dataset)}
          canManage={canManageSettings}
        />
        <BudgetForecastChart rows={rows} />
        <BudgetForecastTable rows={rows} />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
      <BudgetForecastSlidersPanel
        assumptions={{ openingBalance, variableCostPercent, confidenceWeights }}
        onChange={(next) => {
          setOpeningBalance(next.openingBalance);
          setVariableCostPercent(next.variableCostPercent);
          setConfidenceWeights(next.confidenceWeights);
        }}
        canManageSettings={canManageSettings}
        onSave={() => void handleSave()}
        saving={saving}
        dirty={dirty}
      />
    </div>
  );
}

const BUDGET_CONFIDENCE_KEYS: BudgetConfidenceLevel[] = ["ok", "high", "medium", "low", "frozen"];
