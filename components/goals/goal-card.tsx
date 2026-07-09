"use client";

import { Calendar, ClipboardList, Repeat, ShieldAlert, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  GOAL_BOARD_COLUMNS,
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
};

const PRIORITY_TONE: Record<Goal["priority"], "neutral" | "waiting" | "critical"> = {
  low: "neutral",
  normal: "neutral",
  high: "waiting",
  critical: "critical",
};

export function GoalCard({
  goal,
  meta,
  ownerName,
  onOpen,
  draggable,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: {
  goal: Goal;
  meta?: GoalCardMeta;
  ownerName: string;
  onOpen: () => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onStatusChange?: (status: GoalStatus) => void;
}) {
  const reviewOverdue = meta?.nextReviewAt ? new Date(meta.nextReviewAt).getTime() < Date.now() : false;

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="cursor-grab rounded-xl border border-border/70 bg-surface-muted/20 p-3 shadow-sm transition hover:border-accent/30 active:cursor-grabbing"
    >
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold leading-tight text-foreground">{goal.name}</p>
          {goal.isRecurring ? <Repeat className="h-3.5 w-3.5 shrink-0 text-sky-300" /> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted/80">{goal.description}</p>
      </button>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-muted">{goal.progressPercent}% realizacji</p>

      {onStatusChange ? (
        <select
          value={goal.status}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onStatusChange(event.target.value as GoalStatus)}
          className={cn(
            "mt-2 w-full cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold outline-none transition focus:ring-2 focus:ring-accent/20",
            STATUS_SELECT_TONE[goal.status],
          )}
        >
          {[...GOAL_BOARD_COLUMNS, "cancelled" as const].map((status) => (
            <option key={status} value={status}>
              {GOAL_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="blue">{GOAL_LEVEL_LABELS[goal.level]}</Badge>
        <Badge tone={PRIORITY_TONE[goal.priority]}>{GOAL_PRIORITY_LABELS[goal.priority]}</Badge>
        <Badge tone="neutral">{GOAL_PERIOD_TYPE_LABELS[goal.periodType]}</Badge>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        <User className="h-3 w-3" />
        {ownerName}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        {meta && meta.linkedTaskCount > 0 ? (
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            {meta.linkedTaskCount} zadań
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
    </article>
  );
}
