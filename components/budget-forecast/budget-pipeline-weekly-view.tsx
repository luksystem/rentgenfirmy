"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  fetchAllProjectRevenueForecastsWithProjectNames,
  updateProjectRevenueForecast,
} from "@/lib/supabase/project-revenue-forecast-repository";
import {
  BUDGET_CONFIDENCE_LABELS,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";
import {
  buildYearWeeks,
  formatWeekStartLabel,
  mondayOf,
  MONTH_LABELS_PL,
  type WeekColumn,
} from "@/lib/budget-forecast/week-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const WEEK_WIDTH_PX = 68;
const LABEL_WIDTH_PX = 220;
const ROW_HEIGHT_PX = 48;

const QUARTER_LABELS = ["I kwartał", "II kwartał", "III kwartał", "IV kwartał"];

const CONFIDENCE_CHIP_COLOR: Record<BudgetConfidenceLevel, string> = {
  ok: "#22c55e",
  high: "#3b82f6",
  medium: "#f59e0b",
  low: "#a1a1aa",
  frozen: "#71717a",
};

function buildMonthSegments(weeks: WeekColumn[]) {
  const segments: Array<{ label: string; startIndex: number; count: number }> = [];
  for (const week of weeks) {
    if (week.isFirstWeekOfMonth || segments.length === 0) {
      segments.push({ label: week.monthLabel, startIndex: week.weekIndex, count: 1 });
    } else {
      segments[segments.length - 1].count += 1;
    }
  }
  return segments;
}

/** Zwięzły zapis kwoty dla ciasnych komórek siatki (np. "418 tys." zamiast "417 941,91 zł"). */
function formatCompactAmount(value: number): string {
  if (Math.abs(value) < 1) return "0";
  const rounded = Math.round(value / 1000);
  return `${rounded.toLocaleString("pl-PL")} tys.`;
}

type DragState = {
  entryId: string;
  originalWeekIndex: number;
  offsetPx: number;
  pointerId: number;
};

export function BudgetPipelineWeeklyView() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = Boolean(profile && hasFullAppAccess(profile.role));

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entries, setEntries] = useState<ProjectRevenueForecastWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const weeks = useMemo(() => buildYearWeeks(year), [year]);
  const monthSegments = useMemo(() => buildMonthSegments(weeks), [weeks]);
  const weekIndexByStart = useMemo(() => {
    const map = new Map<string, number>();
    weeks.forEach((w) => map.set(w.weekStart, w.weekIndex));
    return map;
  }, [weeks]);

  useEffect(() => {
    reload();
  }, []);

  function reload() {
    setLoading(true);
    setError(null);
    void fetchAllProjectRevenueForecastsWithProjectNames()
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać pipeline."))
      .finally(() => setLoading(false));
  }

  const rows = useMemo(() => {
    return entries
      .filter((entry) => Number(entry.expectedDate.slice(0, 4)) === year)
      .sort((a, b) => a.projectName.localeCompare(b.projectName) || a.expectedDate.localeCompare(b.expectedDate));
  }, [entries, year]);

  const weeklyTotals = useMemo(() => {
    const totals = new Array(weeks.length).fill(0) as number[];
    for (const entry of rows) {
      const start = mondayOf(entry.expectedDate);
      const idx = weekIndexByStart.get(start);
      if (idx !== undefined) totals[idx] += entry.amountGross;
    }
    return totals;
  }, [rows, weeks.length, weekIndexByStart]);

  const weeklyCumulative = useMemo(() => {
    let running = 0;
    return weeklyTotals.map((value) => (running += value));
  }, [weeklyTotals]);

  const monthlyTotals = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const entry of rows) {
      const month = Number(entry.expectedDate.slice(5, 7)) - 1;
      totals[month] += entry.amountGross;
    }
    return totals;
  }, [rows]);

  const monthlyCumulative = useMemo(() => {
    let running = 0;
    return monthlyTotals.map((value) => (running += value));
  }, [monthlyTotals]);

  const quarterlyTotals = useMemo(() => {
    const totals = [0, 0, 0, 0];
    monthlyTotals.forEach((value, i) => {
      totals[Math.floor(i / 3)] += value;
    });
    return totals;
  }, [monthlyTotals]);

  const quarterlyCumulative = useMemo(() => {
    let running = 0;
    return quarterlyTotals.map((value) => (running += value));
  }, [quarterlyTotals]);

  const yearTotal = useMemo(() => monthlyTotals.reduce((sum, value) => sum + value, 0), [monthlyTotals]);

  function weekIndexForEntry(entry: ProjectRevenueForecastWithProject): number {
    const start = mondayOf(entry.expectedDate);
    return weekIndexByStart.get(start) ?? 0;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>, entry: ProjectRevenueForecastWithProject) {
    if (!canManage) return;
    event.preventDefault();
    (event.target as Element).setPointerCapture(event.pointerId);
    const state: DragState = {
      entryId: entry.id,
      originalWeekIndex: weekIndexForEntry(entry),
      offsetPx: 0,
      pointerId: event.pointerId,
    };
    dragRef.current = state;
    setDrag(state);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const next = { ...current, offsetPx: event.movementX + current.offsetPx };
    dragRef.current = next;
    setDrag(next);
  }

  async function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    (event.target as Element).releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDrag(null);

    const weekDelta = Math.round(current.offsetPx / WEEK_WIDTH_PX);
    if (weekDelta === 0) return;
    const newWeekIndex = Math.min(Math.max(current.originalWeekIndex + weekDelta, 0), weeks.length - 1);
    const newWeekStart = weeks[newWeekIndex]?.weekStart;
    if (!newWeekStart) return;

    const entry = entries.find((e) => e.id === current.entryId);
    if (!entry || mondayOf(entry.expectedDate) === newWeekStart) return;

    setEntries((prev) => prev.map((e) => (e.id === current.entryId ? { ...e, expectedDate: newWeekStart } : e)));
    try {
      await updateProjectRevenueForecast(current.entryId, { expectedDate: newWeekStart });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesunąć pozycji.");
      reload();
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie widoku tygodniowego...</p>;
  }

  const timelineWidth = weeks.length * WEEK_WIDTH_PX;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">{year}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {canManage ? (
          <p className="text-xs text-muted">Przeciągnij pozycję w poziomie, żeby zmienić tydzień wpływu.</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Brak pozycji pipeline w {year} roku.</p>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-border/80">
          <div style={{ minWidth: LABEL_WIDTH_PX + timelineWidth }}>
            {/* Nagłówek: miesiące */}
            <div className="flex border-b border-border/70 bg-surface-muted/20">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/20"
                style={{ width: LABEL_WIDTH_PX }}
              />
              <div className="relative" style={{ width: timelineWidth, height: 28 }}>
                {monthSegments.map((segment) => (
                  <div
                    key={segment.startIndex}
                    className="absolute top-0 flex h-7 items-center border-l border-border/50 pl-1.5 text-xs font-medium uppercase tracking-wide text-muted"
                    style={{ left: segment.startIndex * WEEK_WIDTH_PX, width: segment.count * WEEK_WIDTH_PX }}
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Nagłówek: daty początku tygodnia */}
            <div className="flex border-b border-border/70">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Projekt
              </div>
              <div className="relative" style={{ width: timelineWidth, height: 24 }}>
                {weeks.map((week) => (
                  <div
                    key={week.weekStart}
                    className="absolute top-0 flex h-6 items-center justify-center border-l border-border/30 text-[10px] text-muted"
                    style={{ left: week.weekIndex * WEEK_WIDTH_PX, width: WEEK_WIDTH_PX }}
                  >
                    {formatWeekStartLabel(week.weekStart)}
                  </div>
                ))}
              </div>
            </div>

            {/* Wiersze pozycji pipeline */}
            {rows.map((entry) => {
              const weekIndex = weekIndexForEntry(entry);
              const isDragging = drag?.entryId === entry.id;
              const offsetPx = isDragging ? drag.offsetPx : 0;

              return (
                <div key={entry.id} className="flex border-b border-border/40">
                  <div
                    className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/70 bg-surface px-3 py-1"
                    style={{ width: LABEL_WIDTH_PX, height: ROW_HEIGHT_PX }}
                  >
                    <p className="truncate text-xs font-medium text-foreground">{entry.projectName}</p>
                    <p className="truncate text-[11px] text-muted">{formatMoney(entry.amountGross)}</p>
                  </div>
                  <div className="relative" style={{ width: timelineWidth, height: ROW_HEIGHT_PX }}>
                    {weeks.map((week) => (
                      <div
                        key={week.weekStart}
                        className="absolute top-0 h-full border-l border-border/20"
                        style={{ left: week.weekIndex * WEEK_WIDTH_PX, width: WEEK_WIDTH_PX }}
                      />
                    ))}
                    <div
                      role={canManage ? "button" : undefined}
                      className="absolute top-1/2 flex items-center justify-center rounded-lg px-1 text-[11px] font-medium text-white shadow-sm"
                      style={{
                        left: weekIndex * WEEK_WIDTH_PX + 2,
                        width: WEEK_WIDTH_PX - 4,
                        height: ROW_HEIGHT_PX - 12,
                        transform: `translate(${offsetPx}px, -50%)`,
                        backgroundColor: CONFIDENCE_CHIP_COLOR[entry.confidence],
                        cursor: canManage ? "grab" : "default",
                        touchAction: "none",
                        zIndex: isDragging ? 20 : 1,
                        transition: isDragging ? "none" : "left 0.15s ease",
                      }}
                      onPointerDown={(event) => handlePointerDown(event, entry)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={(event) => void handlePointerUp(event)}
                      title={`${entry.projectName} · ${formatMoney(entry.amountGross)} · ${BUDGET_CONFIDENCE_LABELS[entry.confidence]}`}
                    >
                      {formatCompactAmount(entry.amountGross)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Podsumowanie: suma tygodnia */}
            <div className="flex border-t-2 border-border bg-surface-muted/30">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/30 px-3 py-2 text-xs font-semibold text-foreground"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Suma tygodnia
              </div>
              <div className="relative" style={{ width: timelineWidth, height: 32 }}>
                {weeks.map((week) => (
                  <div
                    key={week.weekStart}
                    className="absolute top-0 flex h-8 items-center justify-center border-l border-border/20 text-[11px] font-medium tabular-nums text-foreground"
                    style={{ left: week.weekIndex * WEEK_WIDTH_PX, width: WEEK_WIDTH_PX }}
                    title={formatMoney(weeklyTotals[week.weekIndex])}
                  >
                    {formatCompactAmount(weeklyTotals[week.weekIndex])}
                  </div>
                ))}
              </div>
            </div>

            {/* Podsumowanie: narastająco */}
            <div className="flex border-b border-border/70 bg-surface-muted/10">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/10 px-3 py-2 text-xs font-semibold text-foreground"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Narastająco
              </div>
              <div className="relative" style={{ width: timelineWidth, height: 32 }}>
                {weeks.map((week) => (
                  <div
                    key={week.weekStart}
                    className={cn(
                      "absolute top-0 flex h-8 items-center justify-center border-l border-border/20 text-[11px] font-medium tabular-nums",
                      weeklyCumulative[week.weekIndex] < 0 ? "text-rose-400" : "text-muted",
                    )}
                    style={{ left: week.weekIndex * WEEK_WIDTH_PX, width: WEEK_WIDTH_PX }}
                    title={formatMoney(weeklyCumulative[week.weekIndex])}
                  >
                    {formatCompactAmount(weeklyCumulative[week.weekIndex])}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Miesiące</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-2 font-medium">Miesiąc</th>
                    <th className="px-4 py-2 text-right font-medium">Suma</th>
                    <th className="px-4 py-2 text-right font-medium">Narastająco</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTH_LABELS_PL.map((label, i) => (
                    <tr key={label} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-1.5 text-muted">{label}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-foreground">
                        {formatMoney(monthlyTotals[i])}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-1.5 text-right tabular-nums font-medium",
                          monthlyCumulative[i] < 0 ? "text-rose-400" : "text-foreground",
                        )}
                      >
                        {formatMoney(monthlyCumulative[i])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Kwartały</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-2 font-medium">Kwartał</th>
                    <th className="px-4 py-2 text-right font-medium">Suma</th>
                    <th className="px-4 py-2 text-right font-medium">Narastająco</th>
                  </tr>
                </thead>
                <tbody>
                  {QUARTER_LABELS.map((label, i) => (
                    <tr key={label} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-1.5 text-muted">{label}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-foreground">
                        {formatMoney(quarterlyTotals[i])}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-1.5 text-right tabular-nums font-medium",
                          quarterlyCumulative[i] < 0 ? "text-rose-400" : "text-foreground",
                        )}
                      >
                        {formatMoney(quarterlyCumulative[i])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Rok {year}</CardTitle>
            </CardHeader>
            <CardContent className="flex h-full flex-col items-start justify-center gap-1">
              <p className="text-xs uppercase tracking-wide text-muted">Suma pipeline w roku</p>
              <p className="text-2xl font-semibold text-foreground">{formatMoney(yearTotal)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
