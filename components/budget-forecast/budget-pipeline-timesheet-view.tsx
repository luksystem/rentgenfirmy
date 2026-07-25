"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Package,
  Plus,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
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
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  fetchAllProjectRevenueForecastsWithProjectNames,
  updateProjectRevenueForecast,
} from "@/lib/supabase/project-revenue-forecast-repository";
import { fetchAllBudgetCostItems } from "@/lib/supabase/budget-cost-item-repository";
import { fetchAllBudgetScenarioActions } from "@/lib/supabase/budget-scenario-action-repository";
import { fetchBudgetForecastSettings } from "@/lib/supabase/budget-forecast-settings-repository";
import { fetchAllCompanyScheduleEntries } from "@/lib/supabase/project-settlement-repository";
import type { ProjectSettlementEntry } from "@/lib/settlements/types";
import { expandAmountToMonths } from "@/lib/budget-forecast/engine";
import {
  BUDGET_CONFIDENCE_LABELS,
  BUDGET_CONFIDENCE_LEVELS,
  type BudgetConfidenceLevel,
  type BudgetCostItem,
  type BudgetScenarioAction,
  type ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";
import {
  buildYearPeriodColumns,
  MONTH_LABELS_PL,
  QUARTER_LABELS_PL,
  snapDateToGranularity,
  toDateOnly,
  type PeriodColumn,
  type TimesheetGranularity,
} from "@/lib/budget-forecast/week-utils";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { BudgetScenarioActionsPanel } from "@/components/budget-forecast/budget-scenario-actions-panel";
import { BudgetPipelineEntryDialog } from "@/components/budget-forecast/budget-pipeline-entry-dialog";
import { BudgetCostItemDialog } from "@/components/budget-forecast/budget-cost-item-dialog";
import { BudgetScenarioActionDialog } from "@/components/budget-forecast/budget-scenario-action-dialog";

const PERIOD_WIDTH_PX: Record<TimesheetGranularity, number> = { week: 68, month: 96 };
const LABEL_WIDTH_PX = 220;
const PROJECT_ROW_BASE_HEIGHT_PX = 44;
const LANE_HEIGHT_PX = 26;
const SUMMARY_ROW_HEIGHT_PX = 36;
const CLICK_THRESHOLD_PX = 5;

const GRANULARITY_LABELS: Record<TimesheetGranularity, string> = { week: "Tydzień", month: "Miesiąc" };

const CONFIDENCE_CHIP_COLOR: Record<BudgetConfidenceLevel, string> = {
  ok: "#22c55e",
  high: "#3b82f6",
  medium: "#f59e0b",
  low: "#a1a1aa",
  frozen: "#71717a",
};

const COST_COLOR = "#f43f5e";
const REVENUE_SCENARIO_COLOR = "#22c55e";
const SCHEDULE_CHIP_COLOR = "#8b5cf6";

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

/** Zwięzły zapis kwoty dla ciasnych komórek siatki (np. "418k" zamiast "417 941,91 zł"). */
function formatCompactAmount(value: number): string {
  if (Math.abs(value) < 1) return "0";
  const sign = value < 0 ? "-" : "";
  const rounded = Math.round(Math.abs(value) / 1000);
  return `${sign}${rounded.toLocaleString("pl-PL")}k`;
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

type CadenceSchedule = {
  cadence: BudgetCostItem["cadence"];
  intervalMonths: number | null;
  month: string | null;
  startMonth: string;
  endMonth: string | null;
};

/** Rozkłada pozycję cykliczną (koszt/akcja) na kolumny siatki — dla granulacji tygodniowej
 * pokazuje ją w pierwszym tygodniu danego miesiąca, bo cykliczność liczona jest w miesiącach. */
function mapRecurringAmountToPeriods(
  schedule: CadenceSchedule,
  amount: number,
  periods: PeriodColumn[],
  granularity: TimesheetGranularity,
  year: number,
): Record<string, number> {
  const monthKeys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
  const perMonth = expandAmountToMonths(schedule, amount, monthKeys);

  if (granularity === "month") {
    return perMonth;
  }

  const result: Record<string, number> = {};
  for (const [monthStart, value] of Object.entries(perMonth)) {
    const targetPeriod = periods.find((p) => p.periodStart.slice(0, 7) === monthStart.slice(0, 7));
    if (targetPeriod) {
      result[targetPeriod.periodStart] = (result[targetPeriod.periodStart] ?? 0) + value;
    }
  }
  return result;
}

type PipelineChip = {
  kind: "pipeline";
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  entry: ProjectRevenueForecastWithProject;
};

type ScheduleChip = {
  kind: "schedule";
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  entry: ProjectSettlementEntry;
};

type TimesheetChip = PipelineChip | ScheduleChip;

type ProjectRowEntry = {
  chip: TimesheetChip;
  periodIndex: number;
  lane: number;
};

type ProjectRow = {
  projectId: string;
  projectName: string;
  entries: ProjectRowEntry[];
  laneCount: number;
};

function groupEntriesByProject(
  chips: TimesheetChip[],
  periodIndexFor: (chip: TimesheetChip) => number,
): ProjectRow[] {
  const byProject = new Map<string, ProjectRow>();
  for (const chip of chips) {
    let row = byProject.get(chip.projectId);
    if (!row) {
      row = { projectId: chip.projectId, projectName: chip.projectName, entries: [], laneCount: 1 };
      byProject.set(chip.projectId, row);
    }
    row.entries.push({ chip, periodIndex: periodIndexFor(chip), lane: 0 });
  }

  const result = Array.from(byProject.values());
  for (const row of result) {
    const occupiedAtPeriod = new Map<number, number>();
    for (const item of row.entries) {
      const lane = occupiedAtPeriod.get(item.periodIndex) ?? 0;
      item.lane = lane;
      occupiedAtPeriod.set(item.periodIndex, lane + 1);
    }
    row.laneCount = Math.max(1, ...Array.from(occupiedAtPeriod.values()));
  }
  result.sort((a, b) => a.projectName.localeCompare(b.projectName));
  return result;
}

type DragState = {
  entryId: string;
  originalIndex: number;
  offsetPx: number;
  pointerId: number;
};

export function BudgetPipelineTimesheetView() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = Boolean(profile && hasFullAppAccess(profile.role));
  const projects = useAppStore((state) => state.projects);
  const activeProjects = useMemo(() => projects.filter((p) => p.isActive), [projects]);

  const [granularity, setGranularity] = useState<TimesheetGranularity>("week");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entries, setEntries] = useState<ProjectRevenueForecastWithProject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ProjectSettlementEntry[]>([]);
  const [costItems, setCostItems] = useState<BudgetCostItem[]>([]);
  const [scenarioActions, setScenarioActions] = useState<BudgetScenarioAction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);

  const [costsExpanded, setCostsExpanded] = useState(false);
  const [revenueActionsExpanded, setRevenueActionsExpanded] = useState(false);
  const [costActionsExpanded, setCostActionsExpanded] = useState(false);

  const [editingEntry, setEditingEntry] = useState<ProjectRevenueForecastWithProject | null>(null);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [pipelineDefaults, setPipelineDefaults] = useState<{ projectId?: string; date?: string }>({});

  const [editingCostItem, setEditingCostItem] = useState<BudgetCostItem | null>(null);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [costDefaultMonth, setCostDefaultMonth] = useState<string | undefined>(undefined);

  const [editingScenarioAction, setEditingScenarioAction] = useState<BudgetScenarioAction | null>(null);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [scenarioDefaults, setScenarioDefaults] = useState<{ month?: string; effectType?: "cost" | "revenue" }>({});

  const periods = useMemo(() => buildYearPeriodColumns(year, granularity), [year, granularity]);
  const groupSegments = useMemo(() => buildGroupSegments(periods), [periods]);
  const periodIndexByStart = useMemo(() => {
    const map = new Map<string, number>();
    periods.forEach((p) => map.set(p.periodStart, p.index));
    return map;
  }, [periods]);
  const periodWidth = PERIOD_WIDTH_PX[granularity];
  const todayKey = useMemo(() => toDateOnly(new Date()), []);

  useEffect(() => {
    reload();
  }, []);

  function reload() {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAllProjectRevenueForecastsWithProjectNames(),
      fetchAllCompanyScheduleEntries(),
      fetchAllBudgetCostItems(),
      fetchAllBudgetScenarioActions(),
      fetchBudgetForecastSettings(),
    ])
      .then(([pipelineEntries, schedule, costs, actions, settings]) => {
        setEntries(pipelineEntries);
        setScheduleEntries(schedule);
        setCostItems(costs);
        setScenarioActions(actions);
        setOpeningBalance(settings.openingBalance);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać danych."))
      .finally(() => setLoading(false));
  }

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) map.set(project.id, project.name);
    return map;
  }, [projects]);

  const rows = useMemo(() => {
    return entries.filter((entry) => Number(entry.expectedDate.slice(0, 4)) === year);
  }, [entries, year]);

  const scheduleRows = useMemo(() => {
    return scheduleEntries.filter((entry) => entry.entryDate && Number(entry.entryDate.slice(0, 4)) === year);
  }, [scheduleEntries, year]);

  function periodIndexForEntry(entry: ProjectRevenueForecastWithProject): number {
    const snapped = snapDateToGranularity(entry.expectedDate, granularity);
    return periodIndexByStart.get(snapped) ?? 0;
  }

  function periodIndexForSchedule(entry: ProjectSettlementEntry): number {
    const snapped = snapDateToGranularity(entry.entryDate as string, granularity);
    return periodIndexByStart.get(snapped) ?? 0;
  }

  const chips = useMemo<TimesheetChip[]>(() => {
    const pipelineChips: PipelineChip[] = rows.map((entry) => ({
      kind: "pipeline",
      id: `pipeline:${entry.id}`,
      projectId: entry.projectId,
      projectName: entry.projectName,
      date: entry.expectedDate,
      entry,
    }));
    const scheduleChips: ScheduleChip[] = scheduleRows.map((entry) => ({
      kind: "schedule",
      id: `schedule:${entry.id}`,
      projectId: entry.projectId,
      projectName: projectNameById.get(entry.projectId) ?? "Nieznany projekt",
      date: entry.entryDate as string,
      entry,
    }));
    return [...pipelineChips, ...scheduleChips];
  }, [rows, scheduleRows, projectNameById]);

  function periodIndexForChip(chip: TimesheetChip): number {
    return chip.kind === "pipeline" ? periodIndexForEntry(chip.entry) : periodIndexForSchedule(chip.entry);
  }

  const projectRows = useMemo(
    () => groupEntriesByProject(chips, periodIndexForChip),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chips, periods, granularity],
  );

  const activeCostItems = useMemo(() => costItems.filter((item) => item.isActive), [costItems]);
  const enabledRevenueActions = useMemo(
    () => scenarioActions.filter((a) => a.isEnabled && a.effectType === "revenue"),
    [scenarioActions],
  );
  const enabledCostActions = useMemo(
    () => scenarioActions.filter((a) => a.isEnabled && a.effectType === "cost"),
    [scenarioActions],
  );
  const costActionsAll = useMemo(() => scenarioActions.filter((a) => a.effectType === "cost"), [scenarioActions]);
  const revenueActionsAll = useMemo(() => scenarioActions.filter((a) => a.effectType === "revenue"), [scenarioActions]);

  function sumByPeriod(items: Array<{ amount: number } & CadenceSchedule>): number[] {
    const totals = new Array(periods.length).fill(0) as number[];
    for (const item of items) {
      const perPeriod = mapRecurringAmountToPeriods(item, item.amount, periods, granularity, year);
      for (const [periodStart, value] of Object.entries(perPeriod)) {
        const idx = periodIndexByStart.get(periodStart);
        if (idx !== undefined) totals[idx] += value;
      }
    }
    return totals;
  }

  const pipelinePeriodTotals = useMemo(() => {
    const totals = new Array(periods.length).fill(0) as number[];
    for (const entry of rows) {
      totals[periodIndexForEntry(entry)] += entry.amountNet;
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, periods, periodIndexByStart, granularity]);

  const schedulePeriodTotals = useMemo(() => {
    const totals = new Array(periods.length).fill(0) as number[];
    for (const entry of scheduleRows) {
      totals[periodIndexForSchedule(entry)] += entry.amountGross;
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRows, periods, periodIndexByStart, granularity]);

  const costPeriodTotals = useMemo(
    () => sumByPeriod(activeCostItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCostItems, periods, granularity, year],
  );
  const revenueScenarioPeriodTotals = useMemo(
    () => sumByPeriod(enabledRevenueActions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledRevenueActions, periods, granularity, year],
  );
  const costScenarioPeriodTotals = useMemo(
    () => sumByPeriod(enabledCostActions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledCostActions, periods, granularity, year],
  );

  const netPeriodTotals = useMemo(
    () =>
      periods.map(
        (_, i) =>
          (pipelinePeriodTotals[i] ?? 0) +
          (schedulePeriodTotals[i] ?? 0) +
          (revenueScenarioPeriodTotals[i] ?? 0) -
          (costPeriodTotals[i] ?? 0) -
          (costScenarioPeriodTotals[i] ?? 0),
      ),
    [
      periods,
      pipelinePeriodTotals,
      schedulePeriodTotals,
      revenueScenarioPeriodTotals,
      costPeriodTotals,
      costScenarioPeriodTotals,
    ],
  );

  const netCumulative = useMemo(() => {
    let running = openingBalance;
    return netPeriodTotals.map((value) => (running += value));
  }, [netPeriodTotals, openingBalance]);

  // Rozliczenie miesięczne/kwartalne (niezależnie od granulacji siatki) — do kart podsumowania.
  const monthColumns = useMemo(() => buildYearPeriodColumns(year, "month"), [year]);
  const monthlyPipeline = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const entry of rows) {
      totals[Number(entry.expectedDate.slice(5, 7)) - 1] += entry.amountNet;
    }
    return totals;
  }, [rows]);
  const monthlySchedule = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const entry of scheduleRows) {
      totals[Number((entry.entryDate as string).slice(5, 7)) - 1] += entry.amountGross;
    }
    return totals;
  }, [scheduleRows]);
  const monthlyCost = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const item of activeCostItems) {
      const perMonth = expandAmountToMonths(item, item.amount, monthColumns.map((m) => m.periodStart));
      for (const [monthStart, value] of Object.entries(perMonth)) {
        const idx = monthColumns.findIndex((m) => m.periodStart === monthStart);
        if (idx !== -1) totals[idx] += value;
      }
    }
    return totals;
  }, [activeCostItems, monthColumns]);
  const monthlyRevenueScenario = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const action of enabledRevenueActions) {
      const perMonth = expandAmountToMonths(action, action.amount, monthColumns.map((m) => m.periodStart));
      for (const [monthStart, value] of Object.entries(perMonth)) {
        const idx = monthColumns.findIndex((m) => m.periodStart === monthStart);
        if (idx !== -1) totals[idx] += value;
      }
    }
    return totals;
  }, [enabledRevenueActions, monthColumns]);
  const monthlyCostScenario = useMemo(() => {
    const totals = new Array(12).fill(0) as number[];
    for (const action of enabledCostActions) {
      const perMonth = expandAmountToMonths(action, action.amount, monthColumns.map((m) => m.periodStart));
      for (const [monthStart, value] of Object.entries(perMonth)) {
        const idx = monthColumns.findIndex((m) => m.periodStart === monthStart);
        if (idx !== -1) totals[idx] += value;
      }
    }
    return totals;
  }, [enabledCostActions, monthColumns]);

  const monthlyNet = useMemo(
    () =>
      monthlyPipeline.map(
        (_, i) =>
          monthlyPipeline[i] + monthlySchedule[i] + monthlyRevenueScenario[i] - monthlyCost[i] - monthlyCostScenario[i],
      ),
    [monthlyPipeline, monthlySchedule, monthlyRevenueScenario, monthlyCost, monthlyCostScenario],
  );
  const monthlyCumulative = useMemo(() => {
    let running = openingBalance;
    return monthlyNet.map((value) => (running += value));
  }, [monthlyNet, openingBalance]);

  const quarterlyNet = useMemo(() => {
    const totals = [0, 0, 0, 0];
    monthlyNet.forEach((value, i) => {
      totals[Math.floor(i / 3)] += value;
    });
    return totals;
  }, [monthlyNet]);
  const quarterlyCumulative = useMemo(() => {
    let running = openingBalance;
    return quarterlyNet.map((value) => (running += value));
  }, [quarterlyNet, openingBalance]);

  const yearTotal = useMemo(() => monthlyNet.reduce((sum, value) => sum + value, 0), [monthlyNet]);
  const maxMonthlyAbs = Math.max(...monthlyNet.map((v) => Math.abs(v)), 1);
  const maxQuarterlyAbs = Math.max(...quarterlyNet.map((v) => Math.abs(v)), 1);

  const chartData = useMemo(
    () =>
      periods.map((p, i) => ({
        label: p.label,
        total: netPeriodTotals[i] ?? 0,
        cumulative: netCumulative[i] ?? 0,
      })),
    [periods, netPeriodTotals, netCumulative],
  );

  // Auto-scroll do bieżącego okresu przy pierwszym wczytaniu / zmianie granulacji.
  useEffect(() => {
    if (loading || !scrollRef.current) return;
    const currentStart = snapDateToGranularity(todayKey, granularity);
    const idx = periodIndexByStart.get(currentStart);
    if (idx === undefined) return;
    const targetScroll = Math.max(0, idx * periodWidth - periodWidth * 2);
    scrollRef.current.scrollLeft = targetScroll;
    didAutoScroll.current = true;
  }, [loading, granularity, year, periodIndexByStart, periodWidth, todayKey]);

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
      setEditingEntry(entry);
      setPipelineDialogOpen(true);
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

  function periodIndexFromClick(event: ReactMouseEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return Math.min(Math.max(Math.floor(x / periodWidth), 0), periods.length - 1);
  }

  function handleProjectRowBackgroundClick(event: ReactMouseEvent<HTMLDivElement>, projectId: string) {
    if (!canManage) return;
    const idx = periodIndexFromClick(event);
    setEditingEntry(null);
    setPipelineDefaults({ projectId, date: periods[idx]?.periodStart });
    setPipelineDialogOpen(true);
  }

  function handleCostAggregateClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!canManage) return;
    const idx = periodIndexFromClick(event);
    setEditingCostItem(null);
    setCostDefaultMonth(periods[idx]?.periodStart.slice(0, 7));
    setCostDialogOpen(true);
  }

  function handleScenarioAggregateClick(event: ReactMouseEvent<HTMLDivElement>, effectType: "cost" | "revenue") {
    if (!canManage) return;
    const idx = periodIndexFromClick(event);
    setEditingScenarioAction(null);
    setScenarioDefaults({ month: periods[idx]?.periodStart.slice(0, 7), effectType });
    setScenarioDialogOpen(true);
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

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingEntry(null);
                setPipelineDefaults({});
                setPipelineDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Dodaj spodziewany wpływ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingCostItem(null);
                setCostDefaultMonth(undefined);
                setCostDialogOpen(true);
              }}
            >
              <Package className="h-4 w-4" />
              Koszty stałe
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingScenarioAction(null);
                setScenarioDefaults({});
                setScenarioDialogOpen(true);
              }}
            >
              <TrendingDown className="h-4 w-4" />
              Dodaj akcję
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="font-medium text-foreground">Pewność:</span>
        {BUDGET_CONFIDENCE_LEVELS.map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CONFIDENCE_CHIP_COLOR[level] }} />
            {BUDGET_CONFIDENCE_LABELS[level]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COST_COLOR }} />
          Koszty
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full border border-dashed border-white/60"
            style={{ backgroundColor: SCHEDULE_CHIP_COLOR }}
          />
          Harmonogram spłat
        </span>
        {canManage ? (
          <span className="ml-auto">Kliknij, żeby edytować lub dodać · przeciągnij pozycję, żeby przesunąć.</span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {rows.length === 0 && scheduleRows.length === 0 && costItems.length === 0 && scenarioActions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Brak danych w {year} roku.</p>
      ) : (
        <div ref={scrollRef} className="min-w-0 overflow-x-auto rounded-2xl border border-border/80">
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
                    className={cn(
                      "absolute top-0 flex h-6 items-center justify-center border-l border-border/30 text-[10px]",
                      period.periodStart === snapDateToGranularity(todayKey, granularity)
                        ? "font-semibold text-accent"
                        : "text-muted",
                    )}
                    style={{ left: period.index * periodWidth, width: periodWidth }}
                  >
                    {period.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Wiersze projektów (pipeline) */}
            {projectRows.map((row) => {
              const rowHeight = Math.max(PROJECT_ROW_BASE_HEIGHT_PX, row.laneCount * LANE_HEIGHT_PX + 16);
              return (
                <div key={row.projectId} className="flex border-b border-border/40">
                  <div
                    className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/70 bg-surface px-3 py-1"
                    style={{ width: LABEL_WIDTH_PX, height: rowHeight }}
                  >
                    <p className="truncate text-xs font-medium text-foreground">{row.projectName}</p>
                  </div>
                  <div
                    className="relative"
                    style={{ width: timelineWidth, height: rowHeight, cursor: canManage ? "copy" : "default" }}
                    onClick={(event) => handleProjectRowBackgroundClick(event, row.projectId)}
                  >
                    {periods.map((period) => (
                      <div
                        key={period.periodStart}
                        className="absolute top-0 h-full border-l border-border/20"
                        style={{ left: period.index * periodWidth, width: periodWidth }}
                      />
                    ))}
                    {row.entries.map(({ chip, periodIndex, lane }) => {
                      if (chip.kind === "schedule") {
                        const entry = chip.entry;
                        return (
                          <div
                            key={chip.id}
                            className="absolute flex items-center justify-center rounded-lg border border-dashed border-white/60 px-1 text-[11px] font-medium text-white shadow-sm"
                            style={{
                              left: periodIndex * periodWidth + 2,
                              top: 6 + lane * LANE_HEIGHT_PX,
                              width: periodWidth - 4,
                              height: LANE_HEIGHT_PX - 4,
                              backgroundColor: SCHEDULE_CHIP_COLOR,
                              cursor: "default",
                              zIndex: 1,
                            }}
                            onClick={(event) => event.stopPropagation()}
                            title={`${formatMoney(entry.amountGross)} · Harmonogram spłat${entry.title ? " · " + entry.title : ""}`}
                          >
                            {formatCompactAmount(entry.amountGross)}
                          </div>
                        );
                      }

                      const entry = chip.entry;
                      const isDragging = drag?.entryId === entry.id;
                      const offsetPx = isDragging ? drag.offsetPx : 0;
                      return (
                        <div
                          key={chip.id}
                          className="absolute flex items-center justify-center rounded-lg px-1 text-[11px] font-medium text-white shadow-sm"
                          style={{
                            left: periodIndex * periodWidth + 2,
                            top: 6 + lane * LANE_HEIGHT_PX,
                            width: periodWidth - 4,
                            height: LANE_HEIGHT_PX - 4,
                            transform: `translateX(${offsetPx}px)`,
                            backgroundColor: CONFIDENCE_CHIP_COLOR[entry.confidence],
                            cursor: canManage ? "grab" : "pointer",
                            touchAction: "none",
                            zIndex: isDragging ? 20 : 1,
                            transition: isDragging ? "none" : "left 0.15s ease",
                          }}
                          onPointerDown={(event) => handlePointerDown(event, entry)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={(event) => void handlePointerUp(event, entry)}
                          onClick={(event) => event.stopPropagation()}
                          title={`${formatMoney(entry.amountNet)} · ${BUDGET_CONFIDENCE_LABELS[entry.confidence]}`}
                        >
                          {formatCompactAmount(entry.amountNet)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Koszty stałe */}
            <RecurringCategoryRow
              label="Koszty stałe"
              color={COST_COLOR}
              expanded={costsExpanded}
              onToggleExpand={() => setCostsExpanded((v) => !v)}
              periods={periods}
              periodWidth={periodWidth}
              timelineWidth={timelineWidth}
              totals={costPeriodTotals}
              onBackgroundClick={handleCostAggregateClick}
              canManage={canManage}
            />
            {costsExpanded
              ? costItems.map((item) => (
                  <RecurringItemRow
                    key={item.id}
                    label={item.name}
                    dimmed={!item.isActive}
                    color={COST_COLOR}
                    periods={periods}
                    periodWidth={periodWidth}
                    timelineWidth={timelineWidth}
                    values={mapRecurringAmountToPeriods(item, item.amount, periods, granularity, year)}
                    onClick={() => {
                      setEditingCostItem(item);
                      setCostDialogOpen(true);
                    }}
                    canManage={canManage}
                  />
                ))
              : null}

            {/* Wpływy symulacyjne */}
            <RecurringCategoryRow
              label="Wpływy symulacyjne"
              color={REVENUE_SCENARIO_COLOR}
              expanded={revenueActionsExpanded}
              onToggleExpand={() => setRevenueActionsExpanded((v) => !v)}
              periods={periods}
              periodWidth={periodWidth}
              timelineWidth={timelineWidth}
              totals={revenueScenarioPeriodTotals}
              onBackgroundClick={(event) => handleScenarioAggregateClick(event, "revenue")}
              canManage={canManage}
            />
            {revenueActionsExpanded
              ? revenueActionsAll.map((action) => (
                  <RecurringItemRow
                    key={action.id}
                    label={action.name}
                    dimmed={!action.isEnabled}
                    color={REVENUE_SCENARIO_COLOR}
                    periods={periods}
                    periodWidth={periodWidth}
                    timelineWidth={timelineWidth}
                    values={mapRecurringAmountToPeriods(action, action.amount, periods, granularity, year)}
                    onClick={() => {
                      setEditingScenarioAction(action);
                      setScenarioDialogOpen(true);
                    }}
                    canManage={canManage}
                  />
                ))
              : null}

            {/* Koszty symulacyjne */}
            <RecurringCategoryRow
              label="Koszty symulacyjne"
              color={COST_COLOR}
              expanded={costActionsExpanded}
              onToggleExpand={() => setCostActionsExpanded((v) => !v)}
              periods={periods}
              periodWidth={periodWidth}
              timelineWidth={timelineWidth}
              totals={costScenarioPeriodTotals}
              onBackgroundClick={(event) => handleScenarioAggregateClick(event, "cost")}
              canManage={canManage}
            />
            {costActionsExpanded
              ? costActionsAll.map((action) => (
                  <RecurringItemRow
                    key={action.id}
                    label={action.name}
                    dimmed={!action.isEnabled}
                    color={COST_COLOR}
                    periods={periods}
                    periodWidth={periodWidth}
                    timelineWidth={timelineWidth}
                    values={mapRecurringAmountToPeriods(action, action.amount, periods, granularity, year)}
                    onClick={() => {
                      setEditingScenarioAction(action);
                      setScenarioDialogOpen(true);
                    }}
                    canManage={canManage}
                  />
                ))
              : null}

            {/* Podsumowanie: wynik netto okresu */}
            <div className="flex border-t-2 border-border bg-surface-muted/30">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/30 px-3 py-2 text-sm font-semibold text-foreground"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Wynik netto {granularity === "week" ? "tygodnia" : "miesiąca"}
              </div>
              <div className="relative" style={{ width: timelineWidth, height: SUMMARY_ROW_HEIGHT_PX }}>
                {periods.map((period) => (
                  <div
                    key={period.periodStart}
                    className={cn(
                      "absolute top-0 flex items-center justify-center gap-1 border-l border-border/20 text-sm font-semibold tabular-nums",
                      netPeriodTotals[period.index] < 0 ? "text-rose-400" : "text-foreground",
                    )}
                    style={{ left: period.index * periodWidth, width: periodWidth, height: SUMMARY_ROW_HEIGHT_PX }}
                    title={formatMoney(netPeriodTotals[period.index])}
                  >
                    {period.index > 0 ? (
                      <TrendArrow current={netPeriodTotals[period.index]} previous={netPeriodTotals[period.index - 1]} />
                    ) : null}
                    {formatCompactAmount(netPeriodTotals[period.index])}
                  </div>
                ))}
              </div>
            </div>

            {/* Podsumowanie: narastająco (płynność) */}
            <div className="flex border-b border-border/70 bg-surface-muted/10">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-surface-muted/10 px-3 py-2 text-sm font-semibold text-foreground"
                style={{ width: LABEL_WIDTH_PX }}
              >
                Narastająco (płynność)
              </div>
              <div className="relative" style={{ width: timelineWidth, height: SUMMARY_ROW_HEIGHT_PX }}>
                {periods.map((period) => (
                  <div
                    key={period.periodStart}
                    className={cn(
                      "absolute top-0 flex items-center justify-center gap-1 border-l border-border/20 text-sm font-semibold tabular-nums",
                      netCumulative[period.index] < 0 ? "text-rose-400" : "text-foreground",
                    )}
                    style={{ left: period.index * periodWidth, width: periodWidth, height: SUMMARY_ROW_HEIGHT_PX }}
                    title={formatMoney(netCumulative[period.index])}
                  >
                    {period.index > 0 ? (
                      <TrendArrow current={netCumulative[period.index]} previous={netCumulative[period.index - 1]} />
                    ) : null}
                    {formatCompactAmount(netCumulative[period.index])}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Wynik netto i płynność ({granularity === "week" ? "tygodniowo" : "miesięcznie"})</CardTitle>
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
                    name === "total" ? "Wynik netto okresu" : "Narastająco (płynność)",
                  ]) as (value: unknown, name: unknown) => [string, string]}
                />
                <RechartsLegend
                  formatter={(value: string) => (value === "total" ? "Wynik netto okresu" : "Narastająco (płynność)")}
                  wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
                />
                <ReferenceLine y={0} stroke="#71717a" strokeDasharray="4 4" />
                <Bar dataKey="total" name="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((point) => (
                    <Cell key={point.label} fill={point.total < 0 ? "#f43f5e" : "#3b82f6"} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cumulative" name="cumulative" stroke="#22c55e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </CardContent>
      </Card>

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
                  <th className="px-4 py-2 text-right font-medium">Wynik netto</th>
                  <th className="px-4 py-2 text-right font-medium">Narastająco</th>
                </tr>
              </thead>
              <tbody>
                {MONTH_LABELS_PL.map((label, i) => (
                  <tr
                    key={label}
                    className="border-b border-border/30 last:border-0"
                    style={{
                      background: `linear-gradient(to right, ${monthlyNet[i] < 0 ? "rgba(244,63,94,0.10)" : "rgba(59,130,246,0.10)"} ${(Math.abs(monthlyNet[i]) / maxMonthlyAbs) * 100}%, transparent ${(Math.abs(monthlyNet[i]) / maxMonthlyAbs) * 100}%)`,
                    }}
                  >
                    <td className="px-4 py-1.5 text-muted">{label}</td>
                    <td
                      className={cn(
                        "px-4 py-1.5 text-right tabular-nums",
                        monthlyNet[i] < 0 ? "text-rose-400" : "text-foreground",
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {i > 0 ? <TrendArrow current={monthlyNet[i]} previous={monthlyNet[i - 1]} /> : null}
                        {formatMoney(monthlyNet[i])}
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
                  <th className="px-4 py-2 text-right font-medium">Wynik netto</th>
                  <th className="px-4 py-2 text-right font-medium">Narastająco</th>
                </tr>
              </thead>
              <tbody>
                {QUARTER_LABELS_PL.map((label, i) => (
                  <tr
                    key={label}
                    className="border-b border-border/30 last:border-0"
                    style={{
                      background: `linear-gradient(to right, ${quarterlyNet[i] < 0 ? "rgba(244,63,94,0.10)" : "rgba(34,197,94,0.10)"} ${(Math.abs(quarterlyNet[i]) / maxQuarterlyAbs) * 100}%, transparent ${(Math.abs(quarterlyNet[i]) / maxQuarterlyAbs) * 100}%)`,
                    }}
                  >
                    <td className="px-4 py-1.5 text-muted">{label}</td>
                    <td
                      className={cn(
                        "px-4 py-1.5 text-right tabular-nums",
                        quarterlyNet[i] < 0 ? "text-rose-400" : "text-foreground",
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {i > 0 ? <TrendArrow current={quarterlyNet[i]} previous={quarterlyNet[i - 1]} /> : null}
                        {formatMoney(quarterlyNet[i])}
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
            <p className="text-xs uppercase tracking-wide text-muted">Wynik netto w roku</p>
            <p className={cn("text-2xl font-semibold", yearTotal < 0 ? "text-rose-400" : "text-foreground")}>
              {formatMoney(yearTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <BudgetScenarioActionsPanel canManage={canManage} compact />

      <BudgetPipelineEntryDialog
        open={pipelineDialogOpen}
        onOpenChange={setPipelineDialogOpen}
        projects={activeProjects}
        entry={editingEntry}
        defaultProjectId={pipelineDefaults.projectId}
        defaultDate={pipelineDefaults.date}
        onSaved={reload}
        onDeleted={reload}
        onImported={reload}
      />
      <BudgetCostItemDialog
        open={costDialogOpen}
        onOpenChange={setCostDialogOpen}
        item={editingCostItem}
        defaultMonth={costDefaultMonth}
        onSaved={reload}
        onDeleted={reload}
      />
      <BudgetScenarioActionDialog
        open={scenarioDialogOpen}
        onOpenChange={setScenarioDialogOpen}
        action={editingScenarioAction}
        defaultMonth={scenarioDefaults.month}
        defaultEffectType={scenarioDefaults.effectType}
        onSaved={reload}
        onDeleted={reload}
      />
    </div>
  );
}

function RecurringCategoryRow({
  label,
  color,
  expanded,
  onToggleExpand,
  periods,
  periodWidth,
  timelineWidth,
  totals,
  onBackgroundClick,
  canManage,
}: {
  label: string;
  color: string;
  expanded: boolean;
  onToggleExpand: () => void;
  periods: PeriodColumn[];
  periodWidth: number;
  timelineWidth: number;
  totals: number[];
  onBackgroundClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  canManage: boolean;
}) {
  return (
    <div className="flex border-b border-border/40 bg-surface-muted/10">
      <button
        type="button"
        onClick={onToggleExpand}
        className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-border/70 bg-surface-muted/10 px-3 py-1 text-left text-xs font-medium text-foreground hover:bg-surface-muted/30"
        style={{ width: LABEL_WIDTH_PX, height: SUMMARY_ROW_HEIGHT_PX }}
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </button>
      <div
        className="relative"
        style={{ width: timelineWidth, height: SUMMARY_ROW_HEIGHT_PX, cursor: canManage ? "copy" : "default" }}
        onClick={onBackgroundClick}
      >
        {periods.map((period) => (
          <div
            key={period.periodStart}
            className="absolute top-0 flex items-center justify-center border-l border-border/20 text-[11px] font-medium tabular-nums"
            style={{ left: period.index * periodWidth, width: periodWidth, height: SUMMARY_ROW_HEIGHT_PX, color }}
          >
            {totals[period.index] ? formatCompactAmount(totals[period.index]) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecurringItemRow({
  label,
  dimmed,
  color,
  periods,
  periodWidth,
  timelineWidth,
  values,
  onClick,
  canManage,
}: {
  label: string;
  dimmed: boolean;
  color: string;
  periods: PeriodColumn[];
  periodWidth: number;
  timelineWidth: number;
  values: Record<string, number>;
  onClick: () => void;
  canManage: boolean;
}) {
  return (
    <div className={cn("flex border-b border-border/30", dimmed && "opacity-40")}>
      <button
        type="button"
        onClick={onClick}
        disabled={!canManage}
        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border/70 bg-surface px-3 py-1 pl-8 text-left text-xs text-muted hover:bg-surface-muted/30 disabled:cursor-default"
        style={{ width: LABEL_WIDTH_PX, height: 28 }}
      >
        <span className="truncate">{label}</span>
      </button>
      <div
        className="relative"
        style={{ width: timelineWidth, height: 28, cursor: canManage ? "pointer" : "default" }}
        onClick={canManage ? onClick : undefined}
      >
        {periods.map((period) => (
          <div
            key={period.periodStart}
            className="absolute top-0 flex items-center justify-center border-l border-border/10 text-[10px] tabular-nums"
            style={{ left: period.index * periodWidth, width: periodWidth, height: 28, color }}
          >
            {values[period.periodStart] ? formatCompactAmount(values[period.periodStart]) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
