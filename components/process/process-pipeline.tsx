"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileCheck2,
  Receipt,
} from "lucide-react";
import { ProcessItemPanel } from "@/components/process/process-item-panel";
import { formatAssigneeLabel } from "@/components/process/process-item-responsible-section";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/auth/types";
import { formatMilestoneDate } from "@/lib/process/dates";
import { checklistProgress } from "@/lib/process/item-payload";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ChecklistItemPayload,
  type ProcessItem,
  type ProcessItemKind,
  type ProcessTemplate,
  type ProjectProcess,
  type ProjectProcessItem,
} from "@/lib/process/types";

const kindIcon: Record<ProcessItemKind, React.ComponentType<{ className?: string }>> = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
};

type ProcessPipelineProps = {
  template: ProcessTemplate;
  process?: ProjectProcess | null;
  itemInstances?: Record<string, ProjectProcessItem>;
  teamProfiles?: UserProfile[];
  currentUserId?: string;
  canManageAssignment?: boolean;
  interactive?: boolean;
  actorName?: string;
  onToggleItem?: (itemId: string, completed: boolean) => void;
  onSaveChecklist?: (itemId: string, payload: ChecklistItemPayload) => Promise<void>;
  onAssign?: (itemId: string, assigneeId: string | null) => Promise<void>;
  onSign?: (itemId: string, signatureNote: string) => Promise<void>;
};

export function ProcessPipeline({
  template,
  process,
  itemInstances,
  teamProfiles,
  currentUserId,
  canManageAssignment,
  interactive = false,
  actorName,
  onToggleItem,
  onSaveChecklist,
  onAssign,
  onSign,
}: ProcessPipelineProps) {
  const [activeItem, setActiveItem] = useState<ProcessItem | null>(null);

  return (
    <>
      <div className="md:overflow-x-auto md:pb-2">
        <div className="relative flex flex-col gap-8 md:min-w-max md:flex-row md:gap-0">
          {template.stages.map((stage, stageIndex) => {
            const stageItems = stage.milestones.flatMap((milestone) => milestone.items);
            const stageCompleted = stageItems.filter((item) => process?.completions?.[item.id]).length;
            const stageTotal = stageItems.length;
            const stagePercent = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;
            const isLastStage = stageIndex === template.stages.length - 1;

            return (
              <div
                key={stage.id}
                className="relative flex w-full flex-col md:w-80 md:shrink-0 md:px-3"
              >
                {!isLastStage ? (
                  <div
                    className="absolute left-6 top-24 bottom-0 w-0.5 bg-gradient-to-b from-accent/40 to-border md:hidden"
                    aria-hidden
                  />
                ) : null}

                <div className="relative mb-5 md:mb-6">
                  <div className="relative overflow-hidden rounded-2xl border-2 border-accent/25 bg-gradient-to-br from-surface-elevated to-surface-muted/50 px-4 py-4 shadow-soft">
                    <div className="absolute left-0 top-0 h-full w-1 bg-accent" aria-hidden />
                    <div className="flex items-start gap-3 pl-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                        {stageIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                          Etap {stageIndex + 1}
                        </p>
                        <p className="mt-0.5 text-base font-semibold leading-snug text-foreground">
                          {stage.title}
                        </p>
                        {stageTotal > 0 ? (
                          <>
                            <p className="mt-1.5 text-xs text-muted">
                              {stageCompleted}/{stageTotal} elementów ukończonych
                            </p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                              <div
                                className="h-full rounded-full bg-accent transition-all duration-300"
                                style={{ width: `${stagePercent}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="mt-1.5 text-xs text-muted">Brak elementów w etapie</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isLastStage ? (
                    <div
                      className="absolute left-full top-1/2 hidden h-0.5 w-6 -translate-y-1/2 bg-accent/30 md:block"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div className="grid flex-1 gap-4 pl-2 md:pl-0">
                  {stage.milestones.map((milestone) => {
                    const plannedDate = process?.milestoneDates?.[milestone.id] ?? null;
                    const plannedLabel = formatMilestoneDate(plannedDate);

                    return (
                      <div
                        key={milestone.id}
                        className="rounded-2xl border border-border/80 bg-surface-muted/40 p-3.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                              Kamień milowy
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {milestone.title}
                            </p>
                          </div>
                          {plannedLabel ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/20 bg-accent/5 px-2 py-1 text-[11px] font-medium text-accent">
                              <CalendarDays className="h-3 w-3" />
                              {plannedLabel}
                            </span>
                          ) : null}
                        </div>

                        {!plannedLabel && interactive ? (
                          <p className="mt-2 text-[11px] text-muted">Brak planowanej daty</p>
                        ) : null}

                        <div className="mt-3 grid gap-2">
                          {milestone.items.map((item) => {
                            const completed = Boolean(process?.completions?.[item.id]);
                            const Icon = kindIcon[item.kind] ?? CheckCircle2;
                            const FallbackIcon = completed ? CheckCircle2 : Circle;
                            const instance = itemInstances?.[item.id];
                            const checklistStats =
                              item.kind === "checklist" && instance
                                ? checklistProgress(instance.payload)
                                : item.kind === "checklist" && !interactive
                                  ? checklistProgress(item.defaultPayload)
                                  : null;
                            const kindLabel =
                              checklistStats && checklistStats.total > 0
                                ? `${PROCESS_ITEM_KIND_LABELS[item.kind]} · ${checklistStats.total} pkt.`
                                : PROCESS_ITEM_KIND_LABELS[item.kind];
                            const assigneeLabel = instance ? formatAssigneeLabel(instance) : null;

                            if (interactive) {
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setActiveItem(item)}
                                  className={cn(
                                    "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                                    completed
                                      ? "border-emerald-500/30 bg-emerald-500/10"
                                      : "border-border/70 bg-surface/60",
                                    "cursor-pointer hover:border-accent/30 hover:bg-surface-elevated/80",
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
                                      {kindLabel}
                                      {checklistStats && checklistStats.total > 0
                                        ? ` · ${checklistStats.completed}/${checklistStats.total} gotowe`
                                        : ""}
                                      {assigneeLabel ? ` · ${assigneeLabel}` : ""}
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
                                  "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
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
                                    {kindLabel}
                                    {assigneeLabel ? ` · ${assigneeLabel}` : ""}
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
        instance={activeItem ? itemInstances?.[activeItem.id] : undefined}
        completion={activeItem ? process?.completions?.[activeItem.id] : undefined}
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveItem(null);
          }
        }}
        teamProfiles={teamProfiles}
        currentUserId={currentUserId}
        canManageAssignment={canManageAssignment}
        interactive={interactive}
        actorName={actorName}
        onSaveChecklist={
          activeItem && onSaveChecklist
            ? (payload) => onSaveChecklist(activeItem.id, payload)
            : undefined
        }
        onAssign={
          activeItem && onAssign
            ? (assigneeId) => onAssign(activeItem.id, assigneeId)
            : undefined
        }
        onSign={
          activeItem && onSign ? (signatureNote) => onSign(activeItem.id, signatureNote) : undefined
        }
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
