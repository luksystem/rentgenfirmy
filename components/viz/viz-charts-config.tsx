"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_VIZ_CHART_CONFIG,
  VIZ_CHART_MODES,
  VIZ_CHART_PERIODS,
  VIZ_CHART_TYPES,
  type VizChartConfig,
  type VizChartType,
  type VizDashboardChart,
} from "@/lib/viz/chart-types";
import type { VizDashboardProject } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";
import { VizChartRenderer } from "@/components/viz/viz-chart-renderer";

type VizChartsConfigProps = {
  dashboardId: string;
};

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

export function VizChartsConfig({ dashboardId }: VizChartsConfigProps) {
  const variableRoles = useVizStore((s) => s.variableRoles);
  const ensureViz = useVizStore((s) => s.hydrate);

  const [projects, setProjects] = useState<VizDashboardProject[]>([]);
  const [charts, setCharts] = useState<VizDashboardChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chartType, setChartType] = useState<VizChartType>("line");
  const [config, setConfig] = useState<VizChartConfig>({ ...DEFAULT_VIZ_CHART_CONFIG });
  const [isWidget, setIsWidget] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectsRes, chartsRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=projects`),
        fetch(`/api/viz/dashboards/${dashboardId}/charts`),
      ]);

      if (!projectsRes.ok || !chartsRes.ok) {
        throw new Error("Nie udało się pobrać konfiguracji wykresów.");
      }

      const projectsData = (await projectsRes.json()) as { projects: VizDashboardProject[] };
      const chartsData = (await chartsRes.json()) as { charts: VizDashboardChart[] };

      setProjects(projectsData.projects);
      setCharts(chartsData.charts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void ensureViz();
    void loadData();
  }, [ensureViz, loadData]);

  function toggleProject(projectId: string) {
    setConfig((current) => {
      const exists = current.projectIds.includes(projectId);
      if (current.mode === "single") {
        return { ...current, projectIds: exists ? [] : [projectId] };
      }
      return {
        ...current,
        projectIds: exists
          ? current.projectIds.filter((id) => id !== projectId)
          : [...current.projectIds, projectId],
      };
    });
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          chartType,
          config,
          isWidget,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się utworzyć wykresu.");
      }

      setName("");
      setDescription("");
      setChartType("line");
      setConfig({ ...DEFAULT_VIZ_CHART_CONFIG });
      setIsWidget(true);
      setMessage("Wykres został dodany.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(chartId: string) {
    if (!window.confirm("Usunąć ten wykres?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/charts?id=${encodeURIComponent(chartId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć wykresu.");
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie wykresów…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Nowy wykres</h2>
        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Nazwa</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Opis (opcjonalnie)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Typ wykresu</label>
            <select
              className={selectClassName}
              value={chartType}
              onChange={(e) => setChartType(e.target.value as VizChartType)}
            >
              {VIZ_CHART_TYPES.filter((type) => type !== "mixed").map((type) => (
                <option key={type} value={type}>
                  {type === "line" ? "Liniowy" : type === "area" ? "Obszarowy" : "Słupkowy"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tryb</label>
            <select
              className={selectClassName}
              value={config.mode}
              onChange={(e) =>
                setConfig((current) => ({
                  ...current,
                  mode: e.target.value as VizChartConfig["mode"],
                  projectIds: [],
                }))
              }
            >
              {VIZ_CHART_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "single" ? "Jeden sklep" : "Porównanie sklepów"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Rola zmiennej</label>
            <select
              className={selectClassName}
              value={config.roleCode}
              onChange={(e) => setConfig((current) => ({ ...current, roleCode: e.target.value }))}
            >
              {variableRoles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Okres</label>
            <select
              className={selectClassName}
              value={config.periodHours}
              onChange={(e) =>
                setConfig((current) => ({
                  ...current,
                  periodHours: Number(e.target.value),
                }))
              }
            >
              {VIZ_CHART_PERIODS.map((period) => (
                <option key={period.hours} value={period.hours}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Sklepy ({config.mode === "single" ? "wybierz jeden" : "wybierz wiele"})
            </label>
            {!projects.length ? (
              <p className="text-sm text-muted">Najpierw przypisz sklepy w konfiguracji dashboardu.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => {
                  const selected = config.projectIds.includes(project.projectId);
                  return (
                    <button
                      key={project.projectId}
                      type="button"
                      onClick={() => toggleProject(project.projectId)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        selected
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-muted text-muted hover:text-foreground"
                      }`}
                    >
                      {project.displayName ?? project.projectName ?? project.projectId}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="viz-chart-widget"
              type="checkbox"
              checked={isWidget}
              onChange={(e) => setIsWidget(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="viz-chart-widget" className="text-sm">
              Pokaż jako widget na Command Center
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSaving || !config.projectIds.length}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Dodaj wykres
            </Button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      <div className="space-y-4">
        <h2 className="text-base font-semibold">Skonfigurowane wykresy ({charts.length})</h2>
        {!charts.length ? (
          <Card className="p-6 text-sm text-muted">Brak wykresów — dodaj pierwszy powyżej.</Card>
        ) : (
          charts.map((chart) => (
            <div key={chart.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{chart.name}</p>
                  <p className="text-xs text-muted">
                    {chart.chartType} · {chart.config.mode === "single" ? "1 sklep" : "porównanie"} ·
                    {chart.isWidget ? " widget" : " tylko ta strona"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleDelete(chart.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </Button>
              </div>
              <VizChartRenderer dashboardId={dashboardId} chart={chart} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
