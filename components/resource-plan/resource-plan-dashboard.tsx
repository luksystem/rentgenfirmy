"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, UserX } from "lucide-react";
import { BarPanel, PiePanel } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeResourcePlanDashboardMetrics } from "@/lib/resource-plan/dashboard-metrics";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import { useAppStore } from "@/store/app-store";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useProcessStore } from "@/store/process-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";
import { useUserResourceStore } from "@/store/user-resource-store";
import { ResourcePlanSidePanel } from "@/components/resource-plan/resource-plan-side-panel";

function startOfMonthIso(offsetMonths = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offsetMonths);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfMonthIso(offsetMonths = 0) {
  const date = startOfMonthIso(offsetMonths);
  date.setMonth(date.getMonth() + 1);
  date.setMilliseconds(-1);
  return date;
}

export function ResourcePlanDashboard() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourcePlanItem | null>(null);

  const from = startOfMonthIso(monthOffset).toISOString();
  const to = endOfMonthIso(monthOffset).toISOString();

  const ensureRange = useResourcePlanStore((state) => state.ensureRange);
  const loading = useResourcePlanStore((state) => state.loading);
  const hydrated = useResourcePlanStore((state) => state.hydrated);
  const showInitialLoading = loading && !hydrated;
  const items = useResourcePlanStore((state) => state.allItems());

  const projects = useAppStore((state) => state.projects);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const dictionaryItems = useDictionaryStore((state) => state.items);

  const ensureProfiles = useUserResourceStore((state) => state.ensureProfiles);
  const resourceProfilesById = useUserResourceStore((state) => state.byUser);

  useEffect(() => {
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    void ensureRange(from, to);
  }, [ensureRange, from, to]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.startAt < to && item.endAt > from),
    [items, from, to],
  );

  useEffect(() => {
    const ids = teamProfiles.map((profile) => profile.id);
    if (ids.length > 0) void ensureProfiles(ids);
  }, [teamProfiles, ensureProfiles]);

  const profilesById = useMemo(() => Object.fromEntries(teamProfiles.map((profile) => [profile.id, profile])), [teamProfiles]);

  const metrics = useMemo(
    () =>
      computeResourcePlanDashboardMetrics({
        items: visibleItems,
        from,
        to,
        profilesById,
        resourceProfilesById,
        dictionaryItems,
      }),
    [visibleItems, from, to, profilesById, resourceProfilesById, dictionaryItems],
  );

  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    startOfMonthIso(monthOffset),
  );

  function openEdit(item: ResourcePlanItem) {
    setEditingItem(item);
    setPanelOpen(true);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setMonthOffset((v) => v - 1)}>
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Poprzedni</span>
        </Button>
        <span className="min-w-[120px] text-center text-sm font-medium capitalize text-foreground">{monthLabel}</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => setMonthOffset((v) => v + 1)}>
          <span className="hidden sm:inline">Następny</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
        {monthOffset !== 0 ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setMonthOffset(0)}>
            Dziś
          </Button>
        ) : null}
      </div>

      {showInitialLoading ? (
        <p className="text-sm text-muted">Ładowanie danych…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
            <MetricCard label="Elementy planu" value={metrics.totalItems} size="hero" />
            <MetricCard
              label="Planowane godziny"
              value={`${Math.round(metrics.totalPlannedHours)}h`}
              size="hero"
            />
            <MetricCard
              label="Budżet robocizny"
              value={metrics.totalLaborBudget > 0 ? `${Math.round(metrics.totalLaborBudget).toLocaleString("pl-PL")} zł` : "—"}
              size="hero"
            />
            <MetricCard
              label="Nieprzypisane"
              value={metrics.unassignedItems.length}
              tone={metrics.unassignedItems.length > 0 ? "amber" : "green"}
              size="hero"
            />
            <MetricCard
              label="Konflikty"
              value={metrics.conflictRows.length}
              tone={metrics.conflictRows.length > 0 ? "red" : "green"}
              size="hero"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <BarPanel title="Obciążenie godzinowe per osoba (top 8)" data={metrics.workloadChartData} />
            <PiePanel title="Elementy planu wg statusu" data={metrics.statusChartData} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Obciążenie i wolna zdolność</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {metrics.workloadByPerson.length === 0 ? (
                <p className="text-sm text-muted">Brak elementów planu z przypisaną osobą w tym miesiącu.</p>
              ) : (
                metrics.workloadByPerson.map((row) => (
                  <div
                    key={row.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{row.name}</span>
                    <span className="text-xs text-muted">
                      {row.hours.toFixed(1)}h zaplanowane
                      {row.estimatedCapacity != null ? ` · limit ~${row.estimatedCapacity.toFixed(0)}h (${row.weeklyHoursLimit}h/tydz.)` : ""}
                    </span>
                    {row.estimatedCapacity != null ? (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          row.overloaded ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {row.overloaded ? "Przeciążenie" : "W normie"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-muted px-2 py-1 text-xs text-muted">Brak limitu</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Konflikty i ryzyka ({metrics.conflictRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {metrics.conflictRows.length === 0 ? (
                <p className="text-sm text-muted">Brak konfliktów w tym miesiącu.</p>
              ) : (
                metrics.conflictRows.map(({ item, warnings }) => {
                  const project = projects.find((p) => p.id === item.projectId);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex flex-col gap-1 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-left transition hover:bg-rose-500/10"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {item.title || project?.name || "Element planu"}
                      </span>
                      <span className="text-xs text-rose-300">
                        {warnings
                          .filter((w) => w.severity === "danger")
                          .map((w) => w.message)
                          .join(" · ")}
                      </span>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-amber-400" />
                Nieprzypisane elementy planu ({metrics.unassignedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {metrics.unassignedItems.length === 0 ? (
                <p className="text-sm text-muted">Wszystkie elementy planu mają przypisaną osobę.</p>
              ) : (
                metrics.unassignedItems.map((item) => {
                  const project = projects.find((p) => p.id === item.projectId);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-left transition hover:bg-amber-500/10"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {item.title || project?.name || "Element planu"}
                      </span>
                      <span className="text-xs text-muted">{project?.name ?? "Praca wewnętrzna"}</span>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ResourcePlanSidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        editingItem={editingItem}
        onSaved={() => setPanelOpen(false)}
      />
    </div>
  );
}
