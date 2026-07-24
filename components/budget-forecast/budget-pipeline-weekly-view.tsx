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
  type WeekColumn,
} from "@/lib/budget-forecast/week-utils";
import { formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const WEEK_WIDTH_PX = 68;
const LABEL_WIDTH_PX = 220;
const ROW_HEIGHT_PX = 48;

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
                      {formatMoney(entry.amountGross)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
