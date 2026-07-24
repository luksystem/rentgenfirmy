"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Trash2 } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend as RechartsLegend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientOnlyChart } from "@/components/charts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  deleteProjectRevenueForecast,
  fetchAllProjectRevenueForecastsWithProjectNames,
  updateProjectRevenueForecast,
} from "@/lib/supabase/project-revenue-forecast-repository";
import {
  BUDGET_CONFIDENCE_LABELS,
  BUDGET_CONFIDENCE_LEVELS,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";
import {
  buildYearPeriodColumns,
  MONTH_LABELS_PL,
  QUARTER_LABELS_PL,
  snapDateToGranularity,
  type PeriodColumn,
  type TimesheetGranularity,
} from "@/lib/budget-forecast/week-utils";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { BudgetScenarioActionsPanel } from "@/components/budget-forecast/budget-scenario-actions-panel";

const PERIOD_WIDTH_PX: Record<TimesheetGranularity, number> = { week: 68, month: 96 };
const LABEL_WIDTH_PX = 220;
const ROW_HEIGHT_PX = 48;
const CLICK_THRESHOLD_PX = 5;

const GRANULARITY_LABELS: Record<TimesheetGranularity, string> = { week: "Tydzień", month: "Miesiąc" };

const CONFIDENCE_CHIP_COLOR: Record<BudgetConfidenceLevel, string> = {
  ok: "#22c55e",
  high: "#3b82f6",
  medium: "#f59e0b",
  low: "#a1a1aa",
  frozen: "#71717a",
};

function buildGroupSegments(periods: PeriodColumn[]) {
  const segments: Array<{ label: string; startIndex: number; count: number }> = [];
  for (const period of periods) {
    if (period.isFirstOfGroup || segments.length === 0) {
      segments.push({ label: period.groupLabel, startIndex: period.index, count: 1 });
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

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (current === previous) {
    return <Minus className="h-3 w-3 shrink-0 text-muted" />;
  }
  if (current > previous) {
    return <ArrowUpRight className="h-3 w-3 shrink-0 text-emerald-400" />;
  }
  return <ArrowDownRight className="h-3 w-3 shrink-0 text-rose-400" />;
}

type DragState = {
  entryId: string;
  originalIndex: number;
  offsetPx: number;
  pointerId: number;
};

type EditDraft = {
  date: string;
  amount: string;
  confidence: BudgetConfidenceLevel;
  notes: string;
};

export function BudgetPipelineTimesheetView() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = Boolean(profile && hasFullAppAccess(profile.role));

  const [granularity, setGranularity] = useState<TimesheetGranularity>("week");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entries, setEntries] = useState<ProjectRevenueForecastWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [editingEntry, setEditingEntry] = useState<ProjectRevenueForecastWithProject | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const periods = useMemo(() => buildYearPeriodColumns(year, granularity), [year, granularity]);
  const groupSegments = useMemo(() => buildGroupSegments(periods), [periods]);
  const periodIndexByStart = useMemo(() => {
    const map = new Map<string, number>();
    periods.forEach((p) => map.set(p.periodStart, p.index));
    return map;
  }, [periods]);
  const periodWidth = PERIOD_WIDTH_PX[granularity];

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

  function periodIndexForEntry(entry: ProjectRevenueForecastWithProject): number {
    const snapped = snapDateToGranularity(entry.expectedDate, granularity);
    return periodIndexByStart.get(snapped) ?? 0;
  }

  const periodTotals = useMemo(() => {
    const totals = new Array(periods.length).fill(0) as number[];
    for (const entry of rows) {
      const idx = periodIndexForEntry(entry);
      totals[idx] += entry.amountGross;
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, periods.length, periodIndexByStart, granularity]);

  const periodCumulative = useMemo(() => {
    let running = 0;
    return periodTotals.map((value) => (running += value));
  }, [periodTotals]);

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
  const maxMonthly = Math.max(...monthlyTotals, 1);
  const maxQuarterly = Math.max(...quarterlyTotals, 1);

  const chartData = useMemo(
    () => periods.map((p, i) => ({ label: p.label, total: periodTotals[i] ?? 0, cumulative: periodCumulative[i] ?? 0 })),
    [periods, periodTotals, periodCumulative],
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>, entry: ProjectRevenueForecastWithProject) {
    if (!canManage) return;
    event.preventDefault();
    (event.target as Element).setPointerCapture(event.pointerId);
    const state: DragState = {
      entryId: entry.id,
      originalIndex: periodIndexForEntry(entry),
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

  async function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>, entry: ProjectRevenueForecastWithProject) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    (event.target as Element).releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDrag(null);

    if (Math.abs(current.offsetPx) < CLICK_THRESHOLD_PX) {
      openEditDialog(entry);
      return;
    }

    const delta = Math.round(current.offsetPx / periodWidth);
    if (delta === 0) return;
    const newIndex = Math.min(Math.max(current.originalIndex + delta, 0), periods.length - 1);
    const newPeriodStart = periods[newIndex]?.periodStart;
    if (!newPeriodStart) return;

    const found = entries.find((e) => e.id === current.entryId);
    if (!found || snapDateToGranularity(found.expectedDate, granularity) === newPeriodStart) return;

    setEntries((prev) => prev.map((e) => (e.id === current.entryId ? { ...e, expectedDate: newPeriodStart } : e)));
    try {
      await updateProjectRevenueForecast(current.entryId, { expectedDate: newPeriodStart });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesunąć pozycji.");
      reload();
    }
  }

  function openEditDialog(entry: ProjectRevenueForecastWithProject) {
    setEditingEntry(entry);
    setEditDraft({
      date: entry.expectedDate.slice(0, 10),
      amount: String(entry.amountGross),
      confidence: entry.confidence,
      notes: entry.notes,
    });
  }

  function closeEditDialog() {
    setEditingEntry(null);
    setEditDraft(null);
  }

  async function handleSaveEdit() {
    if (!editingEntry || !editDraft) return;
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await updateProjectRevenueForecast(editingEntry.id, {
        expectedDate: editDraft.date,
        amountGross: Number(editDraft.amount) || 0,
        confidence: editDraft.confidence,
        notes: editDraft.notes.trim(),
      });
      setEntries((prev) => prev.map((e) => (e.id === editingEntry.id ? { ...e, ...updated } : e)));
      closeEditDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać zmian.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteEdit() {
    if (!editingEntry) return;
    setSavingEdit(true);
    setError(null);
    try {
      await deleteProjectRevenueForecast(editingEntry.id);
      setEntries((prev) => prev.filter((e) => e.id !== editingEntry.id));
      closeEditDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć pozycji.");
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie timesheetu...</p>;
  }

  const timelineWidth = periods.length * periodWidth;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">{year}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 rounded-lg border border-border/70 p-1">
          {(["week", "month"] as TimesheetGranularity[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={granularity === key ? "default" : "ghost"}
              onClick={() => setGranularity(key)}
            >
              {GRANULARITY_LABELS[key]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="font-medium text-foreground">Pewność:</span>
        {BUDGET_CONFIDENCE_LEVELS.map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CONFIDENCE_CHIP_COLOR[level] }} />
            {BUDGET_CONFIDENCE_LABELS[level]}
          </span>
        ))}
        {canManage ? <span className="ml-auto">Kliknij pozycję, żeby edytować · przeciągnij, żeby przesunąć.</span> : null}
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
            {/* Nagłówek: grupy (miesiące dla tygodni / kwartały dla miesięcy) */}
            <div className="flex border-b border-border/70 bg-surface-muted/20">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/20"
                style={{ width: LABEL_WIDTH_PX }}
              />
              <div className="relative" style={{ width: timelineWidth, height: 28 }}>
                {groupSegments.map((segment) => (
                  <div
                    key={segment.startIndex}
                    className="absolute top-0 flex h-7 items-center border-l border-border/50 pl-1.5 text-xs font-medium uppercase tracking-wide text-muted"
                    style={{ left: segment.startIndex * periodWidth, width: segment.count * periodWidth }}
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Nagłówek: okresy */}
            <div className="flex border-b border-border/70">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Projekt
              </div>
              <div className="relative" style={{ width: timelineWidth, height: 24 }}>
                {periods.map((period) => (
                  <div
                    key={period.periodStart}
                    className="absolute top-0 flex h-6 items-center justify-center border-l border-border/30 text-[10px] text-muted"
                    style={{ left: period.index * periodWidth, width: periodWidth }}
                  >
                    {period.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Wiersze pozycji pipeline */}
            {rows.map((entry) => {
              const periodIndex = periodIndexForEntry(entry);
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
                    {periods.map((period) => (
                      <div
                        key={period.periodStart}
                        className="absolute top-0 h-full border-l border-border/20"
                        style={{ left: period.index * periodWidth, width: periodWidth }}
                      />
                    ))}
                    <div
                      role="button"
                      className="absolute top-1/2 flex items-center justify-center rounded-lg px-1 text-[11px] font-medium text-white shadow-sm"
                      style={{
                        left: periodIndex * periodWidth + 2,
                        width: periodWidth - 4,
                        height: ROW_HEIGHT_PX - 12,
                        transform: `translate(${offsetPx}px, -50%)`,
                        backgroundColor: CONFIDENCE_CHIP_COLOR[entry.confidence],
                        cursor: canManage ? "grab" : "pointer",
                        touchAction: "none",
                        zIndex: isDragging ? 20 : 1,
                        transition: isDragging ? "none" : "left 0.15s ease",
                      }}
                      onPointerDown={(event) => handlePointerDown(event, entry)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={(event) => void handlePointerUp(event, entry)}
                      title={`${entry.projectName} · ${formatMoney(entry.amountGross)} · ${BUDGET_CONFIDENCE_LABELS[entry.confidence]}`}
                    >
                      {formatCompactAmount(entry.amountGross)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Podsumowanie: suma okresu */}
            <div className="flex border-t-2 border-border bg-surface-muted/30">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/30 px-3 py-2 text-xs font-semibold text-foreground"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Suma {granularity === "week" ? "tygodnia" : "miesiąca"}
              </div>
              <div className="relative" style={{ width: timelineWidth, height: 32 }}>
                {periods.map((period) => (
                  <div
                    key={period.periodStart}
                    className="absolute top-0 flex h-8 items-center justify-center gap-0.5 border-l border-border/20 text-[11px] font-medium tabular-nums text-foreground"
                    style={{ left: period.index * periodWidth, width: periodWidth }}
                    title={formatMoney(periodTotals[period.index])}
                  >
                    {period.index > 0 ? (
                      <TrendArrow current={periodTotals[period.index]} previous={periodTotals[period.index - 1]} />
                    ) : null}
                    {formatCompactAmount(periodTotals[period.index])}
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
                {periods.map((period) => (
                  <div
                    key={period.periodStart}
                    className={cn(
                      "absolute top-0 flex h-8 items-center justify-center gap-0.5 border-l border-border/20 text-[11px] font-medium tabular-nums",
                      periodCumulative[period.index] < 0 ? "text-rose-400" : "text-muted",
                    )}
                    style={{ left: period.index * periodWidth, width: periodWidth }}
                    title={formatMoney(periodCumulative[period.index])}
                  >
                    {period.index > 0 ? (
                      <TrendArrow
                        current={periodCumulative[period.index]}
                        previous={periodCumulative[period.index - 1]}
                      />
                    ) : null}
                    {formatCompactAmount(periodCumulative[period.index])}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Wpływy {granularity === "week" ? "tygodniowo" : "miesięcznie"} i saldo narastające
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 w-full min-w-0 sm:h-72">
            <ClientOnlyChart>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <ComposedChart data={chartData} margin={{ left: 8, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickFormatter={(v) => formatMoney(v)} width={90} />
                  <Tooltip
                    formatter={((value: unknown, name: unknown) => [
                      formatMoney(Number(Array.isArray(value) ? value[0] : value)),
                      name === "total" ? "Suma okresu" : "Narastająco",
                    ]) as (value: unknown, name: unknown) => [string, string]}
                  />
                  <RechartsLegend
                    formatter={(value: string) => (value === "total" ? "Suma okresu" : "Narastająco")}
                    wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
                  />
                  <ReferenceLine y={0} stroke="#71717a" strokeDasharray="4 4" />
                  <Bar dataKey="total" name="total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="cumulative" name="cumulative" stroke="#22c55e" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          </CardContent>
        </Card>
      ) : null}

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
                    <tr
                      key={label}
                      className="border-b border-border/30 last:border-0"
                      style={{
                        background: `linear-gradient(to right, rgba(59,130,246,0.10) ${(monthlyTotals[i] / maxMonthly) * 100}%, transparent ${(monthlyTotals[i] / maxMonthly) * 100}%)`,
                      }}
                    >
                      <td className="px-4 py-1.5 text-muted">{label}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-foreground">
                        <span className="inline-flex items-center gap-1">
                          {i > 0 ? <TrendArrow current={monthlyTotals[i]} previous={monthlyTotals[i - 1]} /> : null}
                          {formatMoney(monthlyTotals[i])}
                        </span>
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
                  {QUARTER_LABELS_PL.map((label, i) => (
                    <tr
                      key={label}
                      className="border-b border-border/30 last:border-0"
                      style={{
                        background: `linear-gradient(to right, rgba(34,197,94,0.10) ${(quarterlyTotals[i] / maxQuarterly) * 100}%, transparent ${(quarterlyTotals[i] / maxQuarterly) * 100}%)`,
                      }}
                    >
                      <td className="px-4 py-1.5 text-muted">{label}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-foreground">
                        <span className="inline-flex items-center gap-1">
                          {i > 0 ? (
                            <TrendArrow current={quarterlyTotals[i]} previous={quarterlyTotals[i - 1]} />
                          ) : null}
                          {formatMoney(quarterlyTotals[i])}
                        </span>
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

          <Card className="min-w-0 overflow-hidden border-accent/30 bg-gradient-to-br from-accent/10 via-transparent to-transparent">
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

      <BudgetScenarioActionsPanel canManage={canManage} />

      <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj spodziewany wpływ</DialogTitle>
          </DialogHeader>

          {editingEntry && editDraft ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted">{editingEntry.projectName}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data">
                  <Input
                    type="date"
                    value={editDraft.date}
                    onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                  />
                </Field>
                <Field label="Kwota (zł)">
                  <Input
                    type="number"
                    step="0.01"
                    value={editDraft.amount}
                    onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Pewność">
                <Select
                  value={editDraft.confidence}
                  onChange={(e) => setEditDraft({ ...editDraft, confidence: e.target.value as BudgetConfidenceLevel })}
                >
                  {BUDGET_CONFIDENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {BUDGET_CONFIDENCE_LABELS[level]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Notatki (opcjonalnie)">
                <Input value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} />
              </Field>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="destructive" onClick={() => void handleDeleteEdit()} disabled={savingEdit}>
              <Trash2 className="h-4 w-4" />
              Usuń
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={closeEditDialog}>
                Anuluj
              </Button>
              <Button type="button" onClick={() => void handleSaveEdit()} disabled={savingEdit}>
                {savingEdit ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
