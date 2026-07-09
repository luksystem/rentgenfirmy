"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import { resolveDictionaryIcon } from "@/lib/resource-plan/icon-options";
import { getPolishHolidayName } from "@/lib/resource-plan/polish-holidays";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import { resourcePlanItemToInput } from "@/lib/resource-plan/types";
import { validateResourcePlanItem } from "@/lib/resource-plan/validations";
import {
  GANTT_DRAG_THRESHOLD_PX,
  GANTT_ROW_LANE_HEIGHT_PX,
  GANTT_ZOOM_DAY_WIDTH_PX,
  GANTT_ZOOM_SNAP_DAYS,
  applyGanttDrag,
  assignGanttLanes,
  dayOffsetPx,
  formatGanttPeriodLabel,
  getGanttPeriodRange,
  groupGanttDaysByMonth,
  resolveGanttRowId,
  type GanttDragMode,
  type GanttZoom,
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

const ROW_LABEL_WIDTH_PX = 140;

const ZOOM_OPTIONS: { key: GanttZoom; label: string }[] = [
  { key: "month", label: "Miesiąc" },
  { key: "quarter", label: "Kwartał" },
  { key: "year", label: "Rok" },
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function ResourcePlanGantt() {
  const [zoom, setZoom] = useState<GanttZoom>("month");
  const [periodOffset, setPeriodOffset] = useState(0);
  const [groupBy, setGroupBy] = useState<GroupBy>("user");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourcePlanItem | null>(null);
  const [defaultStartIso, setDefaultStartIso] = useState<string | undefined>(undefined);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>(undefined);
  const [dragWarning, setDragWarning] = useState<string | null>(null);
  const [dragHoverRowId, setDragHoverRowId] = useState<string | null>(null);

  const dayWidthPx = GANTT_ZOOM_DAY_WIDTH_PX[zoom];
  const snapDays = GANTT_ZOOM_SNAP_DAYS[zoom];

  function changeZoom(nextZoom: GanttZoom) {
    setZoom(nextZoom);
    setPeriodOffset(0);
  }

  const monthStart = useMemo(() => getGanttPeriodRange(zoom, periodOffset).start, [zoom, periodOffset]);
  const periodEnd = useMemo(() => getGanttPeriodRange(zoom, periodOffset).end, [zoom, periodOffset]);
  const totalDays = useMemo(
    () => Math.round((periodEnd.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)),
    [monthStart, periodEnd],
  );
  const days = useMemo(() => Array.from({ length: totalDays }, (_, index) => addDays(monthStart, index)), [monthStart, totalDays]);
  const monthGroups = useMemo(() => (zoom === "month" ? [] : groupGanttDaysByMonth(days)), [zoom, days]);

  const from = monthStart.toISOString();
  const to = useMemo(() => new Date(periodEnd.getTime() - 1).toISOString(), [periodEnd]);

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
  const templateOptions = useDictionaryStore((state) => state.byKey("plan_item_template"));

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

  // Dla widoku projektów: te z elementami planu w aktualnie widocznym okresie idą na górę —
  // łatwiej znaleźć "co się teraz dzieje" bez przeszukiwania całej (potencjalnie długiej) listy
  // projektów. `activeRowCount` mówi renderowi, po którym wierszu wstawić separator.
  const { rows, activeRowCount } = useMemo<{ rows: GanttRow[]; activeRowCount: number }>(() => {
    if (groupBy === "user") {
      return {
        rows: teamProfiles.map((profile) => ({ id: profile.id, label: getUserDisplayName(profile) })),
        activeRowCount: 0,
      };
    }
    if (groupBy === "team") {
      return { rows: teamOptions.map((team) => ({ id: team.id, label: team.name })), activeRowCount: 0 };
    }

    const projectIdsWithVisibleItems = new Set(
      visibleItems.map((item) => item.projectId).filter((id): id is string => Boolean(id)),
    );
    const projectRows = projects.filter((project) => project.isActive).map((project) => ({
      id: project.id,
      label: project.name,
      sublabel: clients.find((client) => client.id === project.clientId)?.fullName,
    }));
    const withActiveItems: GanttRow[] = [];
    const withoutActiveItems: GanttRow[] = [];
    projectRows.forEach((row) => {
      (projectIdsWithVisibleItems.has(row.id) ? withActiveItems : withoutActiveItems).push(row);
    });
    return { rows: [...withActiveItems, ...withoutActiveItems], activeRowCount: withActiveItems.length };
  }, [groupBy, teamProfiles, teamOptions, projects, clients, visibleItems]);

  function itemsForRow(rowId: string): ResourcePlanItem[] {
    if (groupBy === "user") return visibleItems.filter((item) => item.assigneeId === rowId);
    if (groupBy === "team") return visibleItems.filter((item) => item.teamItemId === rowId);
    return visibleItems.filter((item) => item.projectId === rowId);
  }

  const periodLabel = formatGanttPeriodLabel(zoom, monthStart);
  const todayKey = new Date().toDateString();

  function openCreate(startIso?: string, templateId?: string) {
    setEditingItem(null);
    setDefaultStartIso(startIso);
    setInitialTemplateId(templateId);
    setPanelOpen(true);
  }

  function openEdit(item: ResourcePlanItem) {
    setEditingItem(item);
    setDefaultStartIso(undefined);
    setInitialTemplateId(undefined);
    setPanelOpen(true);
  }

  async function commitDrag(
    item: ResourcePlanItem,
    currentRowId: string,
    nextStartAt: string,
    nextEndAt: string,
    targetRowId: string | null,
  ) {
    const baseInput = resourcePlanItemToInput(item);
    const nextInput = { ...baseInput, startAt: nextStartAt, endAt: nextEndAt };

    if (targetRowId && targetRowId !== currentRowId) {
      if (groupBy === "user") {
        nextInput.assigneeId = targetRowId;
      } else if (groupBy === "team") {
        nextInput.teamItemId = targetRowId;
      } else {
        const targetProject = projects.find((project) => project.id === targetRowId);
        nextInput.projectId = targetRowId;
        nextInput.clientId = targetProject?.clientId ?? null;
        nextInput.processStageId = null;
      }
    }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setPeriodOffset((v) => v - 1)}>
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Poprzedni</span>
          </Button>
          <span className="min-w-[120px] flex-1 text-center text-sm font-medium capitalize text-foreground sm:flex-none">
            {periodLabel}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => setPeriodOffset((v) => v + 1)}>
            <span className="hidden sm:inline">Następny</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
          {periodOffset !== 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setPeriodOffset(0)}>
              Dziś
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-fit gap-1 rounded-2xl border border-border/70 bg-surface-muted/20 p-1">
            {ZOOM_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => changeZoom(option.key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                  zoom === option.key ? "bg-accent text-accent-foreground shadow-soft" : "text-muted hover:bg-surface-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex w-fit gap-1 rounded-2xl border border-border/70 bg-surface-muted/20 p-1">
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
          <div className="flex flex-col gap-2 sm:flex-row">
            {templateOptions.length > 0 ? (
              <Select
                value=""
                className="h-9 w-full sm:w-auto"
                onChange={(event) => {
                  const templateId = event.target.value;
                  if (templateId) openCreate(undefined, templateId);
                }}
              >
                <option value="">Szybko z szablonu…</option>
                {templateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button type="button" className="w-full sm:w-auto" onClick={() => openCreate()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nowy element planu
            </Button>
          </div>
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
        Przeciągnij blok w poziomie, aby zmienić termin, lub w pionie do innego wiersza, aby zmienić{" "}
        {groupBy === "user" ? "osobę" : groupBy === "team" ? "zespół" : "projekt"}. Chwyć lewy/prawy brzeg, aby
        zmienić długość. Kliknięcie otwiera edycję, dwuklik na pustym miejscu w wierszu tworzy nowy element z tą
        datą startu.
      </p>

      {loading && visibleItems.length === 0 ? (
        <p className="text-sm text-muted">Ładowanie planu…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">Brak {emptyLabel} do wyświetlenia.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface">
          <div style={{ minWidth: ROW_LABEL_WIDTH_PX + totalDays * dayWidthPx }}>
            <div className="flex border-b border-border/60 bg-surface-muted/20">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border/60 bg-surface-muted/20 px-3 py-2 text-xs font-medium text-foreground"
                style={{ width: ROW_LABEL_WIDTH_PX }}
              >
                {groupBy === "user" ? "Osoba" : groupBy === "team" ? "Zespół" : "Projekt"}
              </div>
              {zoom === "month" ? (
                <div className="flex">
                  {days.map((day) => {
                    const isToday = day.toDateString() === todayKey;
                    const holidayName = getPolishHolidayName(day);
                    const isDayOff = day.getDay() === 0 || day.getDay() === 6 || Boolean(holidayName);
                    return (
                      <div
                        key={day.toISOString()}
                        style={{ width: dayWidthPx }}
                        title={holidayName ?? undefined}
                        className={cn(
                          "shrink-0 border-r border-border/40 py-2 text-center text-[11px] text-muted",
                          isDayOff && "bg-surface-muted/40 text-muted/70",
                          isToday && "bg-accent/10 font-semibold text-accent",
                        )}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex">
                  {monthGroups.map((group, index) => (
                    <div
                      key={`${group.label}-${index}`}
                      style={{ width: group.count * dayWidthPx }}
                      className="shrink-0 truncate border-r border-border/40 py-2 text-center text-[11px] font-medium capitalize text-muted"
                    >
                      {group.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {rows.map((row, rowIndex) => {
              const rowItems = itemsForRow(row.id);
              const { laneById, laneCount } = assignGanttLanes(rowItems);
              const rowHeight = laneCount * GANTT_ROW_LANE_HEIGHT_PX;
              const showInactiveDivider =
                groupBy === "project" && rowIndex === activeRowCount && activeRowCount > 0 && activeRowCount < rows.length;
              return (
                <div key={row.id}>
                  {showInactiveDivider ? (
                    <div className="flex items-center gap-2 border-y border-border/40 bg-surface-muted/15 px-3 py-1.5 text-[11px] text-muted">
                      <span className="h-px flex-1 bg-border/50" />
                      Projekty bez elementów planu w tym okresie
                      <span className="h-px flex-1 bg-border/50" />
                    </div>
                  ) : null}
                  <div className="flex border-b border-border/40 last:border-b-0">
                    <div
                      className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-border/60 bg-surface px-3 py-2"
                      style={{ width: ROW_LABEL_WIDTH_PX, minHeight: rowHeight }}
                    >
                      <span className="truncate text-xs font-medium text-foreground">{row.label}</span>
                      {row.sublabel ? <span className="truncate text-[10px] text-muted">{row.sublabel}</span> : null}
                    </div>
                    <div
                      className={cn(
                        "relative transition-colors",
                        dragHoverRowId === row.id && "bg-accent/10 ring-1 ring-inset ring-accent/40",
                      )}
                      data-gantt-row-id={row.id}
                      style={{ width: totalDays * dayWidthPx, height: rowHeight }}
                      onDoubleClick={(event) => {
                        if (event.target !== event.currentTarget) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        const dayIndex = Math.floor((event.clientX - rect.left) / dayWidthPx);
                        openCreate(addDays(monthStart, dayIndex).toISOString());
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 flex">
                        {days.map((day) => {
                          const isToday = day.toDateString() === todayKey;
                          const isDayOff = day.getDay() === 0 || day.getDay() === 6 || Boolean(getPolishHolidayName(day));
                          return (
                            <div
                              key={day.toISOString()}
                              style={{ width: dayWidthPx }}
                              className={cn(
                                "h-full border-r border-border/20",
                                isDayOff && "bg-surface-muted/25",
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
                            rowId={row.id}
                            monthStart={monthStart}
                            dayWidthPx={dayWidthPx}
                            snapDays={snapDays}
                            laneIndex={laneById.get(item.id) ?? 0}
                            color={color}
                            Icon={Icon}
                            label={label}
                            tooltip={tooltip}
                            onOpen={() => openEdit(item)}
                            onHoverRowChange={setDragHoverRowId}
                            onDragCommit={(startAt, endAt, targetRowId) =>
                              commitDrag(item, row.id, startAt, endAt, targetRowId)
                            }
                          />
                        );
                      })}
                    </div>
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
        initialTemplateId={initialTemplateId}
        onSaved={() => setPanelOpen(false)}
      />
    </div>
  );
}

function GanttBlock({
  item,
  rowId,
  monthStart,
  dayWidthPx,
  snapDays,
  laneIndex,
  color,
  Icon,
  label,
  tooltip,
  onOpen,
  onHoverRowChange,
  onDragCommit,
}: {
  item: ResourcePlanItem;
  rowId: string;
  monthStart: Date;
  dayWidthPx: number;
  snapDays: number;
  laneIndex: number;
  color: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  onOpen: () => void;
  onHoverRowChange: (rowId: string | null) => void;
  onDragCommit: (startAt: string, endAt: string, targetRowId: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<{ startAt: string; endAt: string } | null>(null);
  const [dragTranslateY, setDragTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const blockRef = useRef<HTMLDivElement | null>(null);
  const dragInfoRef = useRef<{
    mode: GanttDragMode;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originalStartAt: string;
    originalEndAt: string;
    moved: boolean;
  } | null>(null);

  const effective = draft ?? { startAt: item.startAt, endAt: item.endAt };
  const left = dayOffsetPx(monthStart, effective.startAt, dayWidthPx);
  const width = Math.max(dayOffsetPx(monthStart, effective.endAt, dayWidthPx) - left, 8);
  const top = laneIndex * GANTT_ROW_LANE_HEIGHT_PX + 3;
  const height = GANTT_ROW_LANE_HEIGHT_PX - 6;

  function beginDrag(event: ReactPointerEvent<HTMLElement>, mode: GanttDragMode) {
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    dragInfoRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalStartAt: item.startAt,
      originalEndAt: item.endAt,
      moved: false,
    };
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragInfoRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = drag.mode === "move" ? event.clientY - drag.startClientY : 0;
    if (!drag.moved && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < GANTT_DRAG_THRESHOLD_PX) return;
    drag.moved = true;

    const rawDeltaDays = deltaX / dayWidthPx;
    const deltaDays = Math.round(rawDeltaDays / snapDays) * snapDays;
    setDraft(
      applyGanttDrag({
        mode: drag.mode,
        originalStartAt: drag.originalStartAt,
        originalEndAt: drag.originalEndAt,
        deltaDays,
      }),
    );

    if (drag.mode === "move") {
      setDragTranslateY(deltaY);
      const hoveredRowId = resolveGanttRowId(event.clientX, event.clientY, blockRef.current);
      onHoverRowChange(hoveredRowId);
    }
  }

  async function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragInfoRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragInfoRef.current = null;
    setDragging(false);
    setDragTranslateY(0);
    onHoverRowChange(null);
    if ((event.target as Element).hasPointerCapture?.(event.pointerId)) {
      (event.target as Element).releasePointerCapture(event.pointerId);
    }

    if (!drag.moved) {
      setDraft(null);
      onOpen();
      return;
    }

    const next = draft;
    const targetRowId = drag.mode === "move" ? resolveGanttRowId(event.clientX, event.clientY, blockRef.current) : null;
    const dateChanged = Boolean(next) && (next!.startAt !== item.startAt || next!.endAt !== item.endAt);
    const rowChanged = Boolean(targetRowId) && targetRowId !== rowId;

    if (dateChanged || rowChanged) {
      try {
        await onDragCommit(next?.startAt ?? item.startAt, next?.endAt ?? item.endAt, rowChanged ? targetRowId : null);
      } finally {
        setDraft(null);
      }
    } else {
      setDraft(null);
    }
  }

  return (
    <div
      ref={blockRef}
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
        transform: dragTranslateY ? `translateY(${dragTranslateY}px)` : undefined,
        zIndex: dragging ? 50 : undefined,
        boxShadow: dragging ? "0 8px 20px -4px rgb(0 0 0 / 0.35)" : undefined,
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