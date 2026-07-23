"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPolishHolidayName } from "@/lib/resource-plan/polish-holidays";
import { resolveDictionaryIcon } from "@/lib/resource-plan/icon-options";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import { useAppStore } from "@/store/app-store";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useProcessStore } from "@/store/process-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";
import { ResourcePlanSidePanel } from "@/components/resource-plan/resource-plan-side-panel";

type CalendarGranularity = "month" | "week";

const WEEKDAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Poniedziałek tygodnia zawierającego `date`. */
function startOfWeek(date: Date) {
  const day = (date.getDay() + 6) % 7; // poniedziałek = 0
  return startOfDay(addDays(date, -day));
}

function buildMonthGrid(refDate: Date): Date[] {
  const firstOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const lastOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDays(startOfWeek(lastOfMonth), 6);
  const days: Date[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

function buildWeekGrid(refDate: Date): Date[] {
  const start = startOfWeek(refDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function ResourcePlanCalendar() {
  const [granularity, setGranularity] = useState<CalendarGranularity>("month");
  const [refDate, setRefDate] = useState(() => startOfDay(new Date()));
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourcePlanItem | null>(null);
  const [defaultStartIso, setDefaultStartIso] = useState<string | undefined>(undefined);

  const days = useMemo(
    () => (granularity === "month" ? buildMonthGrid(refDate) : buildWeekGrid(refDate)),
    [granularity, refDate],
  );

  const from = startOfDay(days[0]).toISOString();
  const to = addDays(startOfDay(days[days.length - 1]), 1).toISOString();

  const ensureRange = useResourcePlanStore((state) => state.ensureRange);
  const loading = useResourcePlanStore((state) => state.loading);
  const hydrated = useResourcePlanStore((state) => state.hydrated);
  const showInitialLoading = loading && !hydrated;
  const items = useResourcePlanStore((state) => state.allItems());

  const projects = useAppStore((state) => state.projects);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const statusOptions = useDictionaryStore((state) => state.byKey("plan_status"));

  useEffect(() => {
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    void ensureRange(from, to);
  }, [ensureRange, from, to]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ResourcePlanItem[]>();
    days.forEach((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = addDays(dayStart, 1);
      const dayItems = items
        .filter((item) => new Date(item.startAt) < dayEnd && new Date(item.endAt) > dayStart)
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
      map.set(dayStart.toISOString(), dayItems);
    });
    return map;
  }, [days, items]);

  const periodLabel =
    granularity === "month"
      ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(refDate)
      : `${new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit" }).format(days[0])} – ${new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(days[6])}`;

  function navigate(direction: 1 | -1) {
    setRefDate((current) =>
      granularity === "month"
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * 7),
    );
  }

  function openEdit(item: ResourcePlanItem) {
    setEditingItem(item);
    setDefaultStartIso(undefined);
    setPanelOpen(true);
  }

  function openCreate(day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    setEditingItem(null);
    setDefaultStartIso(start.toISOString());
    setPanelOpen(true);
  }

  const todayKey = startOfDay(new Date()).toISOString();
  const currentMonth = refDate.getMonth();

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Poprzedni</span>
          </Button>
          <span className="min-w-[140px] flex-1 text-center text-sm font-medium capitalize text-foreground sm:flex-none">
            {periodLabel}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate(1)}>
            <span className="hidden sm:inline">Następny</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRefDate(startOfDay(new Date()))}>
            Dziś
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit gap-1 rounded-2xl border border-border/70 bg-surface-muted/20 p-1">
            {(["month", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGranularity(mode)}
                className={cn(
                  "rounded-xl px-3 py-1 text-xs font-medium transition",
                  granularity === mode ? "bg-accent text-accent-foreground shadow-soft" : "text-muted hover:bg-surface-muted",
                )}
              >
                {mode === "month" ? "Miesiąc" : "Tydzień"}
              </button>
            ))}
          </div>
          <Button type="button" className="w-full sm:w-auto" onClick={() => openCreate(new Date())}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nowy element planu
          </Button>
        </div>
      </div>

      {showInitialLoading ? (
        <p className="text-sm text-muted">Ładowanie planu…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="hidden text-center text-xs font-medium text-muted sm:block">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const dayStart = startOfDay(day);
            const dayItems = itemsByDay.get(dayStart.toISOString()) ?? [];
            const isToday = dayStart.toISOString() === todayKey;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const holidayName = getPolishHolidayName(day);
            const isOtherMonth = granularity === "month" && day.getMonth() !== currentMonth;

            return (
              <div
                key={dayStart.toISOString()}
                className={cn(
                  "flex min-h-[7rem] flex-col gap-1 rounded-xl border p-1.5 sm:min-h-[8rem] sm:p-2",
                  isToday ? "border-accent/60 bg-accent/5" : "border-border/60 bg-surface",
                  (isWeekend || holidayName) && !isToday ? "bg-surface-muted/25" : "",
                  isOtherMonth ? "opacity-40" : "",
                )}
                title={holidayName ?? undefined}
              >
                <button
                  type="button"
                  onClick={() => openCreate(day)}
                  className="flex items-center justify-between text-left"
                  title="Nowy element planu w tym dniu"
                >
                  <span className={cn("text-xs font-semibold", isToday ? "text-accent" : "text-foreground/80")}>
                    {day.getDate()}
                    {granularity === "week" ? (
                      <span className="ml-1 font-normal text-muted">
                        {new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(day)}
                      </span>
                    ) : null}
                  </span>
                  <Plus className="h-3 w-3 shrink-0 text-muted opacity-60 transition hover:opacity-100" />
                </button>
                <div className="grid gap-1 overflow-y-auto" style={{ maxHeight: granularity === "week" ? "16rem" : "5.5rem" }}>
                  {dayItems.map((item) => {
                    const status = statusOptions.find((option) => option.id === item.statusItemId);
                    const project = projects.find((p) => p.id === item.projectId);
                    const assignee = teamProfiles.find((p) => p.id === item.assigneeId);
                    const StatusIcon = resolveDictionaryIcon(status?.icon);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openEdit(item)}
                        title={[item.title || project?.name, assignee ? `${assignee.firstName} ${assignee.lastName}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                        className={cn(
                          "flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium",
                          item.inspectionId && "border",
                        )}
                        style={{
                          backgroundColor: `${status?.color ?? "#64748b"}22`,
                          color: status?.color ?? "#94a3b8",
                          borderStyle: item.inspectionId ? (item.inspectionDateConfirmed ? "solid" : "dashed") : undefined,
                          borderColor: item.inspectionId
                            ? item.inspectionDateConfirmed
                              ? "#10b981"
                              : "#38bdf8"
                            : undefined,
                        }}
                      >
                        <StatusIcon className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{item.title || project?.name || "Element planu"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ResourcePlanSidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        editingItem={editingItem}
        defaultStartIso={defaultStartIso}
        onSaved={() => setPanelOpen(false)}
      />
    </div>
  );
}
