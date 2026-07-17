"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_VIZ_CHART_CONFIG,
  VIZ_CHART_MODES,
  VIZ_CHART_PERIODS,
  VIZ_CHART_TYPES,
  normalizeChartConfig,
  type VizChartConfig,
  type VizChartType,
  type VizDashboardChart,
} from "@/lib/viz/chart-types";
import type { VizDashboardProject } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";
import { useVizDashboardCacheStore } from "@/store/viz-dashboard-cache-store";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/viz/chart-time-range";
import { VizChartRenderer } from "@/components/viz/viz-chart-renderer";

type VizChartsConfigProps = {
  dashboardId: string;
};

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

type ChartFormState = {
  name: string;
  description: string;
  chartType: VizChartType;
  config: VizChartConfig;
  isWidget: boolean;
};

function chartConfigForForm(config: VizChartConfig): VizChartConfig {
  const normalized = normalizeChartConfig(config);
  return {
    ...normalized,
    enabledProjectIds: [...normalized.projectIds],
    enabledRoleCodes: [...normalized.roleCodes],
  };
}

function chartConfigForSave(config: VizChartConfig): VizChartConfig {
  const normalized = normalizeChartConfig(config);
  return {
    ...normalized,
    enabledProjectIds: [...normalized.projectIds],
    enabledRoleCodes: [...normalized.roleCodes],
  };
}

function emptyForm(): ChartFormState {
  return {
    name: "",
    description: "",
    chartType: "line",
    config: { ...DEFAULT_VIZ_CHART_CONFIG },
    isWidget: true,
  };
}

export function VizChartsConfig({ dashboardId }: VizChartsConfigProps) {
  const variableRoles = useVizStore((s) => s.variableRoles);
  const ensureViz = useVizStore((s) => s.hydrate);

  const [projects, setProjects] = useState<VizDashboardProject[]>([]);
  const [charts, setCharts] = useState<VizDashboardChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [form, setForm] = useState<ChartFormState>(emptyForm);

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
      setCharts(
        chartsData.charts.map((chart) => ({
          ...chart,
          config: normalizeChartConfig(chart.config),
        })),
      );
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
    setForm((current) => {
      const exists = current.config.projectIds.includes(projectId);
      if (current.config.mode === "single") {
        return {
          ...current,
          config: {
            ...current.config,
            projectIds: exists ? [] : [projectId],
          },
        };
      }
      return {
        ...current,
        config: {
          ...current.config,
          projectIds: exists
            ? current.config.projectIds.filter((id) => id !== projectId)
            : [...current.config.projectIds, projectId],
        },
      };
    });
  }

  function toggleRole(roleCode: string) {
    setForm((current) => {
      const exists = current.config.roleCodes.includes(roleCode);
      const roleCodes = exists
        ? current.config.roleCodes.filter((code) => code !== roleCode)
        : [...current.config.roleCodes, roleCode];
      return {
        ...current,
        config: {
          ...current.config,
          roleCodes,
          roleCode: roleCodes[0],
        },
      };
    });
  }

  function startEdit(chart: VizDashboardChart) {
    setEditingChartId(chart.id);
    setForm({
      name: chart.name,
      description: chart.description ?? "",
      chartType: chart.chartType,
      config: chartConfigForForm(chart.config),
      isWidget: chart.isWidget,
    });
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingChartId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      chartType: form.chartType,
      config: chartConfigForSave(form.config),
      isWidget: form.isWidget,
    };

    const wasEditing = Boolean(editingChartId);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/charts`, {
        method: wasEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          wasEditing ? { id: editingChartId, ...payload } : payload,
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Nie udało się zapisać wykresu.");
      }

      setEditingChartId(null);
      setForm(emptyForm());
      setMessage(wasEditing ? "Wykres zaktualizowany." : "Wykres został dodany.");
      await loadData();
      void useVizDashboardCacheStore.getState().ensureWidgetCharts(dashboardId, { force: true });
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
      if (editingChartId === chartId) {
        cancelEdit();
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {editingChartId ? "Edycja wykresu" : "Nowy wykres"}
          </h2>
          {editingChartId ? (
            <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
              <X className="h-4 w-4" />
              Anuluj
            </Button>
          ) : null}
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Nazwa</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Opis (opcjonalnie)</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Typ wykresu</label>
            <select
              className={selectClassName}
              value={form.chartType}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  chartType: e.target.value as VizChartType,
                }))
              }
            >
              {VIZ_CHART_TYPES.filter((type) => type !== "mixed").map((type) => (
                <option key={type} value={type}>
                  {type === "line" ? "Liniowy" : type === "area" ? "Obszarowy" : "Słupkowy"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tryb sklepów</label>
            <select
              className={selectClassName}
              value={form.config.mode}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  config: {
                    ...current.config,
                    mode: e.target.value as VizChartConfig["mode"],
                    projectIds:
                      e.target.value === "single" && current.config.projectIds.length > 1
                        ? [current.config.projectIds[0]!]
                        : current.config.projectIds,
                  },
                }))
              }
            >
              {VIZ_CHART_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "single" ? "Jeden sklep" : "Wiele sklepów (różne kolory)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Zakres czasu</label>
            <select
              className={selectClassName}
              value={form.config.dateRangeMode ?? "relative"}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  config: {
                    ...current.config,
                    dateRangeMode: e.target.value as VizChartConfig["dateRangeMode"],
                  },
                }))
              }
            >
              <option value="relative">Ostatnie N godzin</option>
              <option value="absolute">Zakres dat (od–do)</option>
            </select>
          </div>
          {form.config.dateRangeMode === "absolute" ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Od</label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.config.startAt)}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        startAt: fromDateTimeLocalValue(e.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Do</label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.config.endAt)}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        endAt: fromDateTimeLocalValue(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Okres</label>
              <select
                className={selectClassName}
                value={form.config.periodHours}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    config: { ...current.config, periodHours: Number(e.target.value) },
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
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Oś Y min (opcjonalnie)</label>
            <Input
              type="number"
              value={form.config.yAxisMin ?? ""}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  config: {
                    ...current.config,
                    yAxisMin: e.target.value ? Number(e.target.value) : null,
                  },
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Zmienne ({form.config.roleCodes.length} wybrane)
            </label>
            <div className="flex flex-wrap gap-2">
              {variableRoles.map((role) => {
                const selected = form.config.roleCodes.includes(role.code);
                return (
                  <button
                    key={role.code}
                    type="button"
                    onClick={() => toggleRole(role.code)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      selected
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-muted text-muted hover:text-foreground"
                    }`}
                  >
                    {role.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Sklepy ({form.config.mode === "single" ? "wybierz jeden" : "wybierz wiele"})
            </label>
            {!projects.length ? (
              <p className="text-sm text-muted">Najpierw przypisz sklepy w konfiguracji dashboardu.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => {
                  const selected = form.config.projectIds.includes(project.projectId);
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
              id="viz-chart-dual-axis"
              type="checkbox"
              checked={form.config.dualAxis === true}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  config: { ...current.config, dualAxis: e.target.checked },
                }))
              }
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="viz-chart-dual-axis" className="text-sm">
              Dwie osie Y (np. °C i kWh przy różnych jednostkach)
            </label>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="viz-chart-widget"
              type="checkbox"
              checked={form.isWidget}
              onChange={(e) => setForm((current) => ({ ...current, isWidget: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="viz-chart-widget" className="text-sm">
              Pokaż jako widget na Command Center
            </label>
          </div>
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={isSaving || !form.config.projectIds.length || !form.config.roleCodes.length}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingChartId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingChartId ? "Zapisz zmiany" : "Dodaj wykres"}
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
                    {chart.chartType} · {chart.config.roleCodes.length} zmiennych ·{" "}
                    {chart.config.projectIds.length} sklepów ·
                    {chart.isWidget ? " widget" : " tylko ta strona"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(chart)}>
                    <Pencil className="h-4 w-4" />
                    Edytuj
                  </Button>
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
              </div>
              <VizChartRenderer dashboardId={dashboardId} chart={chart} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
