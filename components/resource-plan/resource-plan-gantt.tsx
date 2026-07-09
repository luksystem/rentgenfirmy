"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import { resolveDictionaryIcon } from "@/lib/resource-plan/icon-options";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import { resourcePlanItemToInput } from "@/lib/resource-plan/types";
import { validateResourcePlanItem } from "@/lib/resource-plan/validations";
import {
  GANTT_DAY_WIDTH_PX,
  GANTT_DRAG_THRESHOLD_PX,
  GANTT_ROW_LANE_HEIGHT_PX,
  applyGanttDrag,
  assignGanttLanes,
  dayOffsetPx,
  type GanttDragMode,
} from "@/lib/resource-plan/gantt-drag";
import { useAppStore } from "@/store/app-store";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useProcessStore } from "@/store/process-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";
import { useUserResourceStore } from "@/store/user-resource-store";
import { ResourcePlanSidePanel } from "@/components/resource-plan/resource-plan-side-panel";

type GroupBy = "user" | "team" | "project";

type GanttRow = {
  id: string;
  label: string;
  sublabel?: string;
};

const ROW_LABEL_WIDTH_PX = 180;

function startOfMonth(offsetMonths: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offsetMonths);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function ResourcePlanGantt() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [groupBy, setGroupBy] = useState<GroupBy>("user");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourcePlanItem | null>(null);
  const [defaultStartIso, setDefaultStartIso] = useState<string | undefined>(undefined);
  const [dragWarning, setDragWarning] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(monthOffset), [monthOffset]);
  const totalDays = useMemo(() => daysInMonth(monthStart), [monthStart]);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, index) => addDays(monthStart, index)), [monthStart, totalDays]);

  const from = monthStart.toISOString();
  const to = useMemo(() => new Date(addDays(monthStart, totalDays).getTime() - 1).toISOString(), [monthStart, totalDays]);

  const ensureRange = useResourcePlanStore((state) => state.ensureRange);
  const updateItem = useResourcePlanStore((state) => state.updateItem);
  const loading = useResourcePlanStore((state) => state.loading);
  const items = useResourcePlanStore((state) => state.allItems());

  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const dictionaryItems = useDictionaryStore((state) => state.items);
  const statusOptions = useDictionaryStore((state) => state.byKey("plan_status"));
  const riskOptions = useDictionaryStore((state) => state.byKey("risk_level"));
  const teamOptions = useDictionaryStore((state) => state.byKey("team"));

  const ensureProfiles = useUserResourceStore((state) => state.ensureProfiles);
  const resourceProfilesById = useUserResourceStore((state) => state.byUser);

  useEffect(() => {
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    void ensureRange(from, to);
  }, [ensureRange, from, to]);

  useEffect(() => {
    const ids = teamProfiles.map((profile) => profile.id);
    if (ids.length > 0) void ensureProfiles(ids);
  }, [teamProfiles, ensureProfiles]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.startAt < to && item.endAt > from),
    [items, from, to],
  );

  const profilesById = useMemo(() => Object.fromEntries(teamProfiles.map((profile) => [profile.id, profile])), [teamProfiles]);

  const rows: GanttRow[] = useMemo(() => {
    if (groupBy === "user") {
      return teamProfiles.map((profile) => ({ id: profile.id, label: getUserDisplayName(profile) }));
    }
    if (groupBy === "team") {
      return teamOptions.map((team) => ({ id: team.id, label: team.name }));
    }
    return projects
      .filter((project) => project.isActive)
      .map((project) => ({
        id: project.id,
        label: project.name,
        sublabel: clients.find((client) => client.id === project.clientId)?.fullName,
      }));
  }, [groupBy, teamProfiles, teamOptions, projects, clients]);

  function itemsForRow(rowId: string): ResourcePlanItem[] {
    if (groupBy === "user") return visibleItems.filter((item) => item.assigneeId === rowId);
    if (groupBy === "team") return visibleItems.filter((item) => item.teamItemId === rowId);
    return visibleItems.filter((item) => item.projectId === rowId);
  }

  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(monthStart);
  const todayKey = new Date().toDateString();

  function openCreate(startIso?: string) {
    setEditingItem(null);
    setDefaultStartIso(startIso);
    setPanelOpen(true);
  }

  function openEdit(item: ResourcePlanItem) {
    setEditingItem(item);
    setDefaultStartIso(undefined);
    setPanelOpen(true);
  }

  async function commitDrag(item: ResourcePlanItem, nextStartAt: string, nextEndAt: string) {
    const baseInput = resourcePlanItemToInput(item);
    const nextInput = { ...baseInput, startAt: nextStartAt, endAt: nextEndAt };
    try {
      await updateItem(item.id, nextInput);
      const warnings = validateResourcePlanItem({
        input: nextInput,
        editingId: item.id,
        otherItems: items,
        stage: null,
        profilesById,
        resourceProfilesById,
        dictionaryItems,
      });
      setDragWarning(
        warnings.length === 0
          ? null
          : `${warnings[0].message}${warnings.length > 1 ? ` (+${warnings.length - 1} więcej ostrzeżeń)` : ""}`,
      );
    } catch (error) {
      setDragWarning(error instanceof Error ? error.message : "Nie udało się zapisać nowego terminu.");
    }
  }

  function describeItem(item: ResourcePlanItem) {
    const status = statusOptions.find((option) => option.id === item.statusItemId);
    const risk = riskOptions.find((option) => option.id === item.riskItemId);
    const project = projects.find((p) => p.id === item.projectId);
    const assignee = profilesById[item.assigneeId ?? ""];
    const team = teamOptions.find((option) => option.id === item.teamItemId);
    const label = item.title || project?.name || "Element planu";
    const tooltipParts = [
      label,
      project?.name,
      assignee ? getUserDisplayName(assignee) : null,
      team?.name,
      risk ? `Ryzyko: ${risk.name}` : null,
    ].filter(Boolean);
    return {
      color: status?.color ?? "#64748b",
      Icon: resolveDictionaryIcon(status?.icon),
      label,
      tooltip: tooltipParts.join(" · "),
    };
  }

  const emptyLabel = groupBy === "user" ? "osób" : groupBy === "team" ? "zespołów" : "aktywnych projektów";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonthOffset((v) => v - 1)}>
            ← Poprzedni
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize text-foreground">{monthLabel}</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonthOffset((v) => v + 1)}>
            Następny →
          </Button>
          {monthOffset !== 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setMonthOffset(0)}>
              Dziś
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-2xl border border-border/70 bg-surface-muted/20 p-1">
            {(["user", "team", "project"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setGroupBy(key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                  groupBy === key ? "bg-accent text-accent-foreground shadow-soft" : "text-muted hover:bg-surface-muted",
                )}
              >
                {key === "user" ? "Osoby" : key === "team" ? "Zespoły" : "Projekty"}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => openCreate()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nowy element planu
          </Button>
        </div>
      </div>

      {dragWarning ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{dragWarning}</span>
          <button type="button" onClick={() => setDragWarning(null)} aria-label="Zamknij">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <p className="text-xs text-muted">
        Przeciągnij blok, aby zmienić termin. Chwyć lewy/prawy brzeg, aby zmienić długość. Kliknięcie otwiera edycję,
        dwuklik na pustym miejscu w wierszu tworzy nowy element z tą datą startu.
      </p>

      {loading && visibleItems.length === 0 ? (
        <p className="text-sm text-muted">Ładowanie planu…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">Brak {emptyLabel} do wyświetlenia.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface">
          <div style={{ minWidth: ROW_LABEL_WIDTH_PX + totalDays * GANTT_DAY_WIDTH_PX }}>
            <div className="flex border-b border-border/60 bg-surface-muted/20">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/60 bg-surface-muted/20 px-3 py-2 text-xs font-medium text-foreground"
                style={{ width: ROW_LABEL_WIDTH_PX }}
              >
                {groupBy === "user" ? "Osoba" : groupBy === "team" ? "Zespół" : "Projekt"}
              </div>
              <div className="flex">
                {days.map((day) => {
                  const isToday = day.toDateString() === todayKey;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={day.toISOString()}
                      style={{ width: GANTT_DAY_WIDTH_PX }}
                      className={cn(
                        "shrink-0 border-r border-border/40 py-2 text-center text-[11px] text-muted",
                        isWeekend && "bg-surface-muted/30",
                        isToday && "bg-accent/10 font-semibold text-accent",
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            {rows.map((row) => {
              const rowItems = itemsForRow(row.id);
              const { laneById, laneCount } = assignGanttLanes(rowItems);
              const rowHeight = laneCount * GANTT_ROW_LANE_HEIGHT_PX;
              return (
                <div key={row.id} className="flex border-b border-border/40 last:border-b-0">
                  <div
                    className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-border/60 bg-surface px-3 py-2"
                    style={{ width: ROW_LABEL_WIDTH_PX, minHeight: rowHeight }}
                  >
                    <span className="truncate text-xs font-medium text-foreground">{row.label}</span>
                    {row.sublabel ? <span className="truncate text-[10px] text-muted">{row.sublabel}</span> : null}
                  </div>
                  <div
                    className="relative"
                    style={{ width: totalDays * GANTT_DAY_WIDTH_PX, height: rowHeight }}
                    onDoubleClick={(event) => {
                      if (event.target !== event.currentTarget) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const dayIndex = Math.floor((event.clientX - rect.left) / GANTT_DAY_WIDTH_PX);
                      openCreate(addDays(monthStart, dayIndex).toISOString());
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 flex">
                      {days.map((day) => {
                        const isToday = day.toDateString() === todayKey;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={day.toISOString()}
                            style={{ width: GANTT_DAY_WIDTH_PX }}
                            className={cn(
                              "h-full border-r border-border/20",
                              isWeekend && "bg-surface-muted/15",
                              isToday && "bg-accent/5",
                            )}
                          />
                        );
                      })}
                    </div>

                    {rowItems.map((item) => {
                      const { color, Icon, label, tooltip } = describeItem(item);
                      return (
                        <GanttBlock
                          key={item.id}
                          item={item}
                          monthStart={monthStart}
                          laneIndex={laneById.get(item.id) ?? 0}
                          color={color}
                          Icon={Icon}
                          label={label}
                          tooltip={tooltip}
                          onOpen={() => openEdit(item)}
                          onDragCommit={(startAt, endAt) => commitDrag(item, startAt, endAt)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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

function GanttBlock({
  item,
  monthStart,
  laneIndex,
  color,
  Icon,
  label,
  tooltip,
  onOpen,
  onDragCommit,
}: {
  item: ResourcePlanItem;
  monthStart: Date;
  laneIndex: number;
  color: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  onOpen: () => void;
  onDragCommit: (startAt: string, endAt: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<{ startAt: string; endAt: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragInfoRef = useRef<{
    mode: GanttDragMode;
    pointerId: number;
    startClientX: number;
    originalStartAt: string;
    originalEndAt: string;
    moved: boolean;
  } | null>(null);

  const effective = draft ?? { startAt: item.startAt, endAt: item.endAt };
  const left = dayOffsetPx(monthStart, effective.startAt, GANTT_DAY_WIDTH_PX);
  const width = Math.max(dayOffsetPx(monthStart, effective.endAt, GANTT_DAY_WIDTH_PX) - left, 8);
  const top = laneIndex * GANTT_ROW_LANE_HEIGHT_PX + 3;
  const height = GANTT_ROW_LANE_HEIGHT_PX - 6;

  function beginDrag(event: ReactPointerEvent<HTMLElement>, mode: GanttDragMode) {
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    dragInfoRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      originalStartAt: item.startAt,
      originalEndAt: item.endAt,
      moved: false,
    };
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragInfoRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const deltaPx = event.clientX - drag.startClientX;
    if (!drag.moved && Math.abs(deltaPx) < GANTT_DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const deltaDays = Math.round(deltaPx / GANTT_DAY_WIDTH_PX);
    setDraft(
      applyGanttDrag({
        mode: drag.mode,
        originalStartAt: drag.originalStartAt,
        originalEndAt: drag.originalEndAt,
        deltaDays,
      }),
    );
  }

  async function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragInfoRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragInfoRef.current = null;
    setDragging(false);
    if ((event.target as Element).hasPointerCapture?.(event.pointerId)) {
      (event.target as Element).releasePointerCapture(event.pointerId);
    }

    if (!drag.moved) {
      setDraft(null);
      onOpen();
      return;
    }

    const next = draft;
    if (next && (next.startAt !== item.startAt || next.endAt !== item.endAt)) {
      try {
        await onDragCommit(next.startAt, next.endAt);
      } finally {
        setDraft(null);
      }
    } else {
      setDraft(null);
    }
  }

  return (
    <div
      className="absolute overflow-hidden rounded-md border px-1.5 text-[11px] font-medium shadow-sm select-none"
      style={{
        left,
        width,
        top,
        height,
        backgroundColor: `${color}22`,
        borderColor: `${color}66`,
        color,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={(event) => beginDrag(event, "move")}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => void handlePointerUp(event)}
      title={tooltip}
    >
      <span
        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize"
        onPointerDown={(event) => beginDrag(event, "resize-start")}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => void handlePointerUp(event)}
      />
      <span className="flex h-full items-center gap-1 px-1">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
        onPointerDown={(event) => beginDrag(event, "resize-end")}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => void handlePointerUp(event)}
      />
    </div>
  );
}