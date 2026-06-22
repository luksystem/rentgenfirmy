"use client";

import { useState } from "react";
import { summarizeKanbanTaskReactions, type KanbanReactionEmoji } from "@/lib/process/kanban-reactions";
import type { KanbanAuthorSide, KanbanTaskReaction } from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";

export function KanbanTaskReactions({
  taskId,
  reactions,
  authorName,
  authorSide,
  disabled,
  onToggle,
}: {
  taskId: string;
  reactions: KanbanTaskReaction[];
  authorName: string;
  authorSide: KanbanAuthorSide;
  disabled?: boolean;
  onToggle: (emoji: KanbanReactionEmoji) => Promise<void>;
}) {
  const summaries = summarizeKanbanTaskReactions(reactions, taskId, authorName, authorSide);
  const [pendingEmoji, setPendingEmoji] = useState<KanbanReactionEmoji | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {summaries.map((entry) => (
        <button
          key={entry.emoji}
          type="button"
          disabled={disabled || pendingEmoji !== null}
          title={entry.count > 0 ? `${entry.count} reakcji` : "Dodaj reakcję"}
          onClick={() => {
            if (pendingEmoji) {
              return;
            }
            setPendingEmoji(entry.emoji);
            void onToggle(entry.emoji).finally(() => setPendingEmoji(null));
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition",
            entry.reactedByMe
              ? "border-accent/40 bg-accent/15 text-foreground"
              : "border-border/70 bg-surface/50 text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-foreground",
            pendingEmoji === entry.emoji && "opacity-60",
          )}
        >
          <span aria-hidden>{entry.emoji}</span>
          {entry.count > 0 ? (
            <span className="text-xs font-semibold tabular-nums">{entry.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function KanbanTaskReactionPreview({
  taskId,
  reactions,
}: {
  taskId: string;
  reactions: KanbanTaskReaction[];
}) {
  const summaries = summarizeKanbanTaskReactions(reactions, taskId, "", "team").filter(
    (entry) => entry.count > 0,
  );

  if (!summaries.length) {
    return null;
  }

  return (
    <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
      {summaries.map((entry) => (
        <span
          key={entry.emoji}
          className="inline-flex items-center gap-0.5 rounded-md bg-surface/80 px-1.5 py-0.5"
        >
          <span>{entry.emoji}</span>
          {entry.count > 1 ? <span className="font-medium tabular-nums">{entry.count}</span> : null}
        </span>
      ))}
    </p>
  );
}
