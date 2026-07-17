"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, CheckSquare, ClipboardList, History, Repeat, RotateCcw, ShieldAlert, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  GOAL_BOARD_COLUMNS,
  GOAL_DEFERRAL_REASON_LABELS,
  GOAL_LEVEL_LABELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_LABELS,
  type Goal,
  type GoalStatus,
} from "@/lib/goals/types";
import { cn, formatDate } from "@/lib/utils";

const STATUS_SELECT_TONE: Record<GoalStatus, string> = {
  planned: "border-border/70 bg-surface-muted/60 text-muted",
  in_progress: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  at_risk: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  on_hold: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  settled: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  cancelled: "border-border/70 bg-surface-muted/60 text-muted",
};

type GoalCardMeta = {
  linkedTaskCount: number;
  openProblemCount: number;
  nextReviewAt: string | null;
  initiativeTaskTotal?: number;
  initiativeTaskDone?: number;
};

const PRIORITY_TONE: Record<Goal["priority"], "neutral" | "waiting" | "critical"> = {
  low: "neutral",
  normal: "neutral",
  high: "waiting",
  critical: "critical",
};

/** Dni kalendarzowe do terminu (południe lokalne — mniej przesunięć strefy). */
function calendarDaysUntil(periodEnd: string): number {
  const end = new Date(`${periodEnd.slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Zielony wcześniej, żółty dzień przed, czerwony w dniu terminu (i po). */
export function dueDateToneClass(periodEnd: string, status: GoalStatus): string {
  if (status === "settled" || status === "cancelled") {
    return "text-muted";
  }
  const days = calendarDaysUntil(periodEnd);
  if (days <= 0) return "text-rose-400 font-bold";
  if (days === 1) return "text-amber-300 font-semibold";
  return "text-emerald-300/80";
}

function StatusSelect({
  goal,
  onStatusChange,
  className,
}: {
  goal: Goal;
  onStatusChange: (status: GoalStatus) => void;
  className?: string;
}) {
  return (
    <select
      value={goal.status}
      draggable={false}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => onStatusChange(event.target.value as GoalStatus)}
      className={cn(
        "cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold outline-none transition focus:ring-2 focus:ring-accent/20",
        STATUS_SELECT_TONE[goal.status],
        className,
      )}
    >
      {[...GOAL_BOARD_COLUMNS, "settled" as const, "cancelled" as const].map((status) => (
        <option key={status} value={status}>
          {GOAL_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

function ProgressSlider({
  progressPercent,
  onProgressChange,
}: {
  progressPercent: number;
  onProgressChange: (percent: number) => void;
}) {
  const [localValue, setLocalValue] = useState(progressPercent);

  useEffect(() => {
    setLocalValue(progressPercent);
  }, [progressPercent]);

  function commit() {
    if (localValue !== progressPercent) {
      onProgressChange(localValue);
    }
  }

  return (
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={localValue}
      draggable={false}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => setLocalValue(Number(event.target.value))}
      onMouseUp={commit}
      onTouchEnd={commit}
      onKeyUp={commit}
      className="h-1.5 w-full cursor-pointer accent-accent"
    />
  );
}

function DueDateInput({
  goal,
  onDueDateChange,
  className,
}: {
  goal: Goal;
  onDueDateChange: (date: string) => void;
  className?: string;
}) {
  return (
    <input
      type="date"
      value={goal.periodEnd.slice(0, 10)}
      draggable={false}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => event.target.value && onDueDateChange(event.target.value)}
      className={cn(
        "rounded-lg border border-border/60 bg-transparent px-1.5 py-0.5 text-[11px] outline-none",
        dueDateToneClass(goal.periodEnd, goal.status),
        className,
      )}
    />
  );
}

export function GoalCard({
  goal,
  meta,
  ownerName,
  onOpen,
  draggable,
  compact,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onProgressChange,
  onDueDateChange,
}: {
  goal: Goal;
  meta?: GoalCardMeta;
  ownerName: string;
  onOpen: () => void;
  draggable?: boolean;
  compact?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onStatusChange?: (status: GoalStatus) => void;
  onProgressChange?: (percent: number) => void;
  onDueDateChange?: (date: string) => void;
}) {
  const reviewOverdue = meta?.nextReviewAt ? new Date(meta.nextReviewAt).getTime() < Date.now() : false;
  const draggedRef = useRef(false);
  const taskTotal = meta?.initiativeTaskTotal ?? 0;
  const taskDone = meta?.initiativeTaskDone ?? 0;
  const tasksComplete = taskTotal > 0 && taskDone >= taskTotal;
  const goalSettled = goal.status === "settled" || goal.status === "cancelled";
  const taskCountClass = goalSettled
    ? "text-muted"
    : tasksComplete
      ? "text-emerald-300"
      : "text-rose-300";

  function handleCardClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onOpen();
  }

  const revisitTone = goal.needsRevisit
    ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-400/30"
    : "border-border/70 bg-surface-muted/20";

  if (compact) {
    return (
      <article
        draggable={draggable}
        onDragStart={(event) => {
          draggedRef.current = true;
          onDragStart?.(event);
        }}
        onDragEnd={onDragEnd}
        onClick={handleCardClick}
        className={cn(
          "cursor-pointer rounded-lg px-2.5 py-2 shadow-sm transition hover:border-accent/30 active:cursor-grabbing",
          revisitTone,
        )}
      >
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-bold leading-tight text-foreground">
            {goal.name}
          </p>
          {goal.needsRevisit ? <RotateCcw className="h-3 w-3 shrink-0 text-violet-300" /> : null}
          {goal.isRecurring ? <Repeat className="h-3 w-3 shrink-0 text-sky-300" /> : null}
          {onDueDateChange ? (
            <DueDateInput goal={goal} onDueDateChange={onDueDateChange} className="shrink-0" />
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {onProgressChange ? (
            <div className="min-w-0 flex-1">
              <ProgressSlider progressPercent={goal.progressPercent} onProgressChange={onProgressChange} />
            </div>
          ) : (
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
              />
            </div>
          )}
          <span className="shrink-0 text-[10px] font-semibold text-muted">{goal.progressPercent}%</span>
          {taskTotal > 0 ? (
            <span className={cn("flex shrink-0 items-center gap-0.5 text-[10px] font-semibold", taskCountClass)}>
              <CheckSquare className="h-3 w-3" />
              {taskDone}/{taskTotal}
            </span>
          ) : null}
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
            <User className="h-3 w-3" />
            <span className="max-w-[96px] truncate">{ownerName}</span>
          </span>
        </div>
        {goal.deferralCount > 0 ? (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-300/90">
            <History className="h-3 w-3" />
            Przekładany {goal.deferralCount}×
            {goal.lastDeferralReason ? ` · ${GOAL_DEFERRAL_REASON_LABELS[goal.lastDeferralReason]}` : ""}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article
      draggable={draggable}
      onDragStart={(event) => {
        draggedRef.current = true;
        onDragStart?.(event);
      }}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      className={cn(
        "cursor-pointer rounded-xl p-3 shadow-sm transition hover:border-accent/30 active:cursor-grabbing",
        revisitTone,
      )}
    >
      <div className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold leading-tight text-foreground">{goal.name}</p>
          <span className="flex shrink-0 items-center gap-1">
            {goal.needsRevisit ? <RotateCcw className="h-3.5 w-3.5 text-violet-300" /> : null}
            {goal.isRecurring ? <Repeat className="h-3.5 w-3.5 text-sky-300" /> : null}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted/80">{goal.description}</p>
      </div>

      {onProgressChange ? (
        <ProgressSlider progressPercent={goal.progressPercent} onProgressChange={onProgressChange} />
      ) : (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
          />
        </div>
      )}
      <p className="mt-1 text-[11px] font-semibold text-muted">{goal.progressPercent}% realizacji</p>

      {onStatusChange ? <StatusSelect goal={goal} onStatusChange={onStatusChange} className="mt-2 w-full" /> : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="blue">{GOAL_LEVEL_LABELS[goal.level]}</Badge>
        <Badge tone={PRIORITY_TONE[goal.priority]}>{GOAL_PRIORITY_LABELS[goal.priority]}</Badge>
        <Badge tone="neutral">{GOAL_PERIOD_TYPE_LABELS[goal.periodType]}</Badge>
        {goal.needsRevisit ? <Badge tone="waiting">Wrócić{goal.revisitAt ? `: ${formatDate(goal.revisitAt)}` : ""}</Badge> : null}
        {goal.deferralCount > 0 ? (
          <Badge tone="critical">
            Przekładany {goal.deferralCount}×
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        <User className="h-3 w-3" />
        {ownerName}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <div className="flex flex-wrap items-center gap-2">
          {taskTotal > 0 ? (
            <span className={cn("flex items-center gap-1 font-semibold", taskCountClass)}>
              <CheckSquare className="h-3 w-3" />
              {taskDone}/{taskTotal} zadań
            </span>
          ) : null}
          {meta && meta.linkedTaskCount > 0 ? (
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              {meta.linkedTaskCount} Kanban
            </span>
          ) : null}
          {meta && meta.openProblemCount > 0 ? (
            <span className="flex items-center gap-1 text-rose-300">
              <ShieldAlert className="h-3 w-3" />
              {meta.openProblemCount} problemów
            </span>
          ) : null}
          {meta?.nextReviewAt ? (
            <span className={cn("flex items-center gap-1", reviewOverdue && "text-amber-300")}>
              <Calendar className="h-3 w-3" />
              Przegląd: {formatDate(meta.nextReviewAt)}
            </span>
          ) : null}
        </div>
        {onDueDateChange ? (
          <DueDateInput goal={goal} onDueDateChange={onDueDateChange} />
        ) : (
          <span className={dueDateToneClass(goal.periodEnd, goal.status)}>
            Termin: {formatDate(goal.periodEnd)}
          </span>
        )}
      </div>
      {goal.lastDeferralReason ? (
        <p className="mt-1.5 text-[10px] text-amber-300/90">
          Ostatnio: {GOAL_DEFERRAL_REASON_LABELS[goal.lastDeferralReason]}
        </p>
      ) : null}
    </article>
  );
}
