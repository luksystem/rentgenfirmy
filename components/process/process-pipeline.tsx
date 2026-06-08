"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronRight, Circle, FileCheck2, Receipt } from "lucide-react";
import { ProcessItemPanel } from "@/components/process/process-item-panel";
import { cn } from "@/lib/utils";
import { formatMilestoneDate } from "@/lib/process/dates";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ProcessItem,
  type ProcessItemKind,
  type ProcessTemplate,
  type ProjectProcess,
} from "@/lib/process/types";

const kindIcon: Record<ProcessItemKind, React.ComponentType<{ className?: string }>> = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
};

type ProcessPipelineProps = {
  template: ProcessTemplate;
  process?: ProjectProcess | null;
  interactive?: boolean;
  onToggleItem?: (itemId: string, completed: boolean) => void;
};

export function ProcessPipeline({
  template,
  process,
  interactive = false,
  onToggleItem,
}: ProcessPipelineProps) {
  const [activeItem, setActiveItem] = useState<ProcessItem | null>(null);

  return (
    <>
      <div className="md:overflow-x-auto md:pb-2">
        <div className="relative flex flex-col gap-6 md:min-w-max md:flex-row md:gap-4">
          {template.stages.map((stage, stageIndex) => {
            const stageItems = stage.milestones.flatMap((milestone) => milestone.items);
            const stageCompleted = stageItems.filter((item) => process?.completions?.[item.id]).length;
            const stageTotal = stageItems.length;
            const isLastStage = stageIndex === template.stages.length - 1;

            return (
              <div
                key={stage.id}
                className="relative flex w-full flex-col md:w-72 md:shrink-0"
              >
                {!isLastStage ? (
                  <div
                    className="absolute left-5 top-[4.5rem] bottom-0 w-px bg-border md:hidden"
                    aria-hidden
                  />
                ) : null}

                <div className="relative mb-4 md:mb-4">
                  <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 shadow-soft">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                      Etap {stageIndex + 1}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{stage.title}</p>
                    {stageTotal > 0 ? (
                      <p className="mt-1 text-xs text-muted">
                        {stageCompleted}/{stageTotal} ukończone
                      </p>
                    ) : null}
                  </div>
                  {!isLastStage ? (
                    <div
                      className="absolute left-full top-1/2 hidden h-0.5 w-4 -translate-y-1/2 bg-border md:block"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div className="grid flex-1 gap-3 pl-0 md:pl-0">
                  {stage.milestones.map((milestone) => {
                    const plannedLabel = formatMilestoneDate(milestone.plannedDate);

                    return (
                      <div
                        key={milestone.id}
                        className="rounded-2xl border border-border/80 bg-surface-muted/40 p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Kamień milowy
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">{milestone.title}</p>
                        {plannedLabel ? (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-accent/80" />
                            Plan: {plannedLabel}
                          </p>
                        ) : null}

                        <div className="mt-3 grid gap-2">
                          {milestone.items.map((item) => {
                            const completed = Boolean(process?.completions?.[item.id]);
                            const Icon = kindIcon[item.kind] ?? CheckCircle2;
                            const FallbackIcon = completed ? CheckCircle2 : Circle;

                            if (interactive) {
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setActiveItem(item)}
                                  className={cn(
                                    "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                                    completed
                                      ? "border-emerald-500/30 bg-emerald-500/10"
                                      : "border-border/70 bg-surface/60",
                                    "cursor-pointer hover:border-accent/30",
                                  )}
                                >
                                  <FallbackIcon
                                    className={cn(
                                      "mt-0.5 h-4 w-4 shrink-0",
                                      completed ? "text-emerald-400" : "text-muted",
                                    )}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                                      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                                      {item.title}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-muted">
                                      {PROCESS_ITEM_KIND_LABELS[item.kind]}
                                    </span>
                                  </span>
                                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                                </button>
                              );
                            }

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                                  completed
                                    ? "border-emerald-500/30 bg-emerald-500/10"
                                    : "border-border/70 bg-surface/60",
                                )}
                              >
                                <FallbackIcon
                                  className={cn(
                                    "mt-0.5 h-4 w-4 shrink-0",
                                    completed ? "text-emerald-400" : "text-muted",
                                  )}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                                    {item.title}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] text-muted">
                                    {PROCESS_ITEM_KIND_LABELS[item.kind]}
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ProcessItemPanel
        item={activeItem}
        completion={activeItem ? process?.completions?.[activeItem.id] : undefined}
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveItem(null);
          }
        }}
        interactive={interactive}
        onToggleComplete={(completed) => {
          if (!activeItem) {
            return;
          }
          onToggleItem?.(activeItem.id, completed);
        }}
      />
    </>
  );
}
