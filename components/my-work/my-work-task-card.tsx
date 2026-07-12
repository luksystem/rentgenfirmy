"use client";

import { AlertTriangle, MessageCircle } from "lucide-react";
import {
  WORK_ITEM_PRIORITY_LABELS,
  WORK_ITEM_STATUS_LABELS,
  type WorkItemView,
} from "@/lib/my-work/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  normal: "bg-sky-400",
  high: "bg-amber-400",
  urgent: "bg-rose-500",
};

export function MyWorkTaskCard({
  item,
  onOpen,
  draggable,
  onDragStart,
  isDragging,
}: {
  item: WorkItemView;
  onOpen: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  isDragging?: boolean;
}) {
  const hasObstacle = item.status === "blocked" || Boolean(item.blockedReason?.trim());
  const needsReaction =
    item.status === "sent" ||
    item.status === "pending_ack" ||
    item.status === "needs_clarification";

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        "w-full rounded-xl border border-border bg-surface-elevated p-3 text-left shadow-sm transition hover:border-border-strong",
        isDragging && "opacity-50",
        needsReaction && "border-amber-500/40",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[item.priority] ?? PRIORITY_DOT.normal)}
          title={WORK_ITEM_PRIORITY_LABELS[item.priority]}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground line-clamp-2">{item.title}</p>
          {item.projectName ? (
            <p className="mt-0.5 truncate text-xs text-muted">{item.projectName}</p>
          ) : null}
          {item.clientName ? (
            <p className="truncate text-xs text-muted">{item.clientName}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {item.dueDate ? (
          <span className={cn(item.status !== "verified" && item.dueDate < new Date().toISOString().slice(0, 10) && "text-rose-400")}>
            {formatDate(item.dueDate)}
          </span>
        ) : (
          <span>Bez terminu</span>
        )}
        <span className="rounded bg-surface-muted px-1.5 py-0.5">
          {WORK_ITEM_STATUS_LABELS[item.status]}
        </span>
        {item.sourceTypeMeta ? (
          <span className="rounded bg-surface-muted px-1.5 py-0.5">{item.sourceTypeMeta.label}</span>
        ) : null}
        {item.aiGenerated ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">AI</span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        {item.managerName ? <span>Zlecający: {item.managerName}</span> : null}
        {hasObstacle ? (
          <span className="inline-flex items-center gap-0.5 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Przeszkoda
          </span>
        ) : null}
        {item.commentCount > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle className="h-3 w-3" />
            {item.commentCount}
          </span>
        ) : null}
      </div>

      {item.expectedResult ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted">Rezultat: {item.expectedResult}</p>
      ) : null}
    </button>
  );
}
