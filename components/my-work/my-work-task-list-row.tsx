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

function listMetaLine(item: WorkItemView) {
  return [item.projectName, item.clientName, item.sourceTypeMeta?.label]
    .filter(Boolean)
    .join(" · ");
}

export function MyWorkTaskListRow({
  item,
  onOpen,
}: {
  item: WorkItemView;
  onOpen: () => void;
}) {
  const hasObstacle = item.status === "blocked" || Boolean(item.blockedReason?.trim());
  const needsReaction =
    item.status === "sent" ||
    item.status === "pending_ack" ||
    item.status === "needs_clarification";
  const dueKey = item.plannedEnd ?? item.dueDate;
  const isOverdue =
    Boolean(dueKey) &&
    dueKey! < new Date().toISOString().slice(0, 10) &&
    item.status !== "verified";
  const meta = listMetaLine(item);
  const statusLabel = WORK_ITEM_STATUS_LABELS[item.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-2 border-b border-border/50 px-2 py-2 text-left transition last:border-b-0 hover:bg-surface-muted/30 sm:gap-3 sm:px-3 sm:py-1.5",
        needsReaction && "bg-amber-500/5 hover:bg-amber-500/10",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          PRIORITY_DOT[item.priority] ?? PRIORITY_DOT.normal,
        )}
        title={WORK_ITEM_PRIORITY_LABELS[item.priority]}
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
          {item.aiGenerated ? (
            <span className="shrink-0 rounded bg-accent/15 px-1 py-px text-[10px] font-medium text-accent">
              AI
            </span>
          ) : null}
        </div>
        {meta ? (
          <p className="truncate text-[11px] text-muted sm:hidden">{meta}</p>
        ) : null}
      </div>

      <p className="hidden max-w-[30%] truncate text-xs text-muted sm:block">{meta || "—"}</p>

      <span
        className={cn(
          "hidden shrink-0 text-xs tabular-nums text-muted sm:inline",
          isOverdue && "font-medium text-rose-400",
        )}
      >
        {dueKey ? formatDate(dueKey) : "—"}
      </span>

      <span
        className="max-w-[7.5rem] shrink-0 truncate rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted sm:max-w-[9rem]"
        title={statusLabel}
      >
        {statusLabel}
      </span>

      <div className="flex w-8 shrink-0 items-center justify-end gap-1 text-muted">
        {hasObstacle ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-label="Przeszkoda" />
        ) : null}
        {item.commentCount > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-[10px]">
            <MessageCircle className="h-3 w-3" />
            {item.commentCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}
