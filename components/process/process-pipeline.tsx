"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Circle, FileCheck2, LayoutGrid, Receipt } from "lucide-react";
import { MilestoneDateBadge } from "@/components/process/milestone-date-badge";
import { ProcessItemPanel } from "@/components/process/process-item-panel";
import { formatAssigneeLabel } from "@/components/process/process-item-responsible-section";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/auth/types";
import {
  getProcessItemVisualState,
  PROCESS_ITEM_VISUAL_CLASSES,
} from "@/lib/process/item-completion-state";
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
  kanban: LayoutGrid,
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
  onSaveMilestoneDate?: (milestoneId: string, date: string | null) => Promise<void>;
  canCustomizeChecklist?: boolean;
  /** Pionowy układ bez poziomego przewijania — np. wąski panel dashboardu klienta. */
  stacked?: boolean;
  /** templateItemId → `/kanban/{token}` — linki publicznych tablic w widoku tylko do odczytu. */
  kanbanPublicLinks?: Record<string, string>;
  /** Zamiast nawigacji na osobną stronę `/kanban/...` (np. osadzenie w publicznym dashboardzie). */
  onKanbanNavigate?: (kanbanHref: string) => void;
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
  onSaveMilestoneDate,
  canCustomizeChecklist = false,
  stacked = false,
  kanbanPublicLinks,
  onKanbanNavigate,
}: ProcessPipelineProps) {
  const [activeItem, setActiveItem] = useState<ProcessItem | null>(null);

  return (
    <>
      <div className={cn(!stacked && "md:overflow-x-auto md:pb-2")}>
        <div
          className={cn(
            "relative flex flex-col gap-8",
            !stacked && "md:min-w-max md:flex-row md:gap-0",
          )}
        >
          {template.stages.map((stage, stageIndex) => {
            const stageItems = stage.milestones.flatMap((milestone) => milestone.items);
            const stageCompleted = stageItems.filter((item) => process?.completions?.[item.id]).length;
            const stageTotal = stageItems.length;
            const stagePercent = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;
            const isLastStage = stageIndex === template.stages.length - 1;

            return (
              <div
                key={stage.id}
                className={cn(
                  "relative flex w-full flex-col",
                  !stacked && "md:w-80 md:shrink-0 md:px-3",
                )}
              >
                {!isLastStage ? (
                  <div
                    className={cn(
                      "absolute left-6 top-24 bottom-0 w-0.5 bg-gradient-to-b from-accent/40 to-border",
                      stacked ? "block" : "md:hidden",
                    )}
                    aria-hidden
                  />
                ) : null}

                <div className={cn("relative mb-5", !stacked && "md:mb-6")}>
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
                  {!isLastStage && !stacked ? (
                    <div
                      className="absolute left-full top-1/2 hidden h-0.5 w-6 -translate-y-1/2 bg-accent/30 md:block"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div className={cn("grid flex-1 gap-4 pl-2", !stacked && "md:pl-0")}>
                  {stage.milestones.map((milestone) => {
                    const plannedDate = process?.milestoneDates?.[milestone.id] ?? null;

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
                          {interactive && onSaveMilestoneDate ? (
                            <MilestoneDateBadge
                              date={plannedDate}
                              editable
                              onSave={(date) => onSaveMilestoneDate(milestone.id, date)}
                            />
                          ) : (
                            <MilestoneDateBadge date={plannedDate} />
                          )}
                        </div>

                        <div className="mt-3 grid gap-2">
                          {milestone.items.map((item) => {
                            const instance = itemInstances?.[item.id];
                            const visualState = getProcessItemVisualState(
                              process?.completions?.[item.id],
                              instance,
                            );
                            const visualClasses = PROCESS_ITEM_VISUAL_CLASSES[visualState];
                            const Icon = kindIcon[item.kind] ?? CheckCircle2;
                            const FallbackIcon =
                              visualState === "signed"
                                ? CheckCircle2
                                : visualState === "completed"
                                  ? CheckCircle2
                                  : Circle;
                            const checklistStats =
                              item.kind === "checklist" && instance
                                ? checklistProgress(instance.payload)
                                : item.kind === "checklist" && !interactive && "lines" in item.defaultPayload
                                  ? checklistProgress(item.defaultPayload)
                                  : null;
                            const kindLabel =
                              item.kind === "kanban"
                                ? PROCESS_ITEM_KIND_LABELS.kanban
                                : checklistStats && checklistStats.total > 0
                                  ? `${PROCESS_ITEM_KIND_LABELS[item.kind]} · ${checklistStats.total} pkt.`
                                  : PROCESS_ITEM_KIND_LABELS[item.kind];
                            const assigneeLabel = instance ? formatAssigneeLabel(instance) : null;
                            const kanbanHref =
                              !interactive && item.kind === "kanban"
                                ? kanbanPublicLinks?.[item.id]
                                : undefined;

                            if (interactive) {
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setActiveItem(item)}
                                  className={cn(
                                    "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                                    visualClasses.card,
                                    "cursor-pointer hover:border-accent/30 hover:bg-surface-elevated/80",
                                  )}
                                >
                                  <FallbackIcon
                                    className={cn("mt-0.5 h-4 w-4 shrink-0", visualClasses.icon)}
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
                                  visualClasses.card,
                                )}
                              >
                                <FallbackIcon
                                  className={cn("mt-0.5 h-4 w-4 shrink-0", visualClasses.icon)}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                                    {kanbanHref ? (
                                      onKanbanNavigate ? (
                                        <button
                                          type="button"
                                          onClick={() => onKanbanNavigate(kanbanHref)}
                                          className="text-left text-accent hover:underline"
                                        >
                                          {item.title}
                                        </button>
                                      ) : (
                                        <Link
                                          href={kanbanHref}
                                          className="text-accent hover:underline"
                                        >
                                          {item.title}
                                        </Link>
                                      )
                                    ) : (
                                      item.title
                                    )}
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
        canCustomizeChecklist={canCustomizeChecklist}
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
