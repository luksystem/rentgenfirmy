"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileCheck2,
  LayoutGrid,
  Lock,
  Receipt,
} from "lucide-react";
import { MilestoneDateBadge } from "@/components/process/milestone-date-badge";
import { ProcessItemPanel } from "@/components/process/process-item-panel";
import { formatAssigneeLabel } from "@/components/process/process-item-responsible-section";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/auth/types";
import { isAgreementBlockingActive, type ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import {
  isChangeRequestBlockingActive,
  type ProjectChangeRequest,
} from "@/lib/dashboard/change-request-types";
import {
  getProcessItemVisualState,
  PROCESS_ITEM_VISUAL_CLASSES,
} from "@/lib/process/item-completion-state";
import { checklistProgress } from "@/lib/process/item-payload";
import { canOpenProcessItem } from "@/lib/process/item-access";
import {
  buildAgreementBlockSources,
  buildProcessItemBlockSources,
  computeStageGate,
  findUnblockedIncompleteStagesBeforeActive,
} from "@/lib/process/stage-gate";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ChecklistItemPayload,
  type ProcessItem,
  type ProcessItemKind,
  type ProcessTemplate,
  type ProjectProcess,
  type ProjectProcessItem,
} from "@/lib/process/types";
import { useProcessStore } from "@/store/process-store";

const kindIcon: Record<ProcessItemKind, React.ComponentType<{ className?: string }>> = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
  kanban: LayoutGrid,
};

type ProcessPipelineProps = {
  template: ProcessTemplate;
  process?: ProjectProcess | null;
  projectId?: string;
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
  /** Ustalenia projektu — źródło blokady kaskadowej etapów (deadline akceptacji). */
  agreements?: ProjectClientAgreement[];
  /** Karta zmian Projektu — kolejne źródło blokady kaskadowej etapów (deadline akceptacji). */
  changeRequests?: ProjectChangeRequest[];
};

export function ProcessPipeline({
  template,
  process,
  projectId,
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
  agreements,
  changeRequests,
}: ProcessPipelineProps) {
  const [activeItem, setActiveItem] = useState<ProcessItem | null>(null);
  const ensureProjectProcessItems = useProcessStore((state) => state.ensureProjectProcessItems);

  const stageGate = useMemo(() => {
    const itemSources = buildProcessItemBlockSources(template, itemInstances, process);
    const agreementSources = buildAgreementBlockSources(
      template,
      (agreements ?? []).map((agreement) => ({
        title: agreement.title,
        acceptanceDeadlineStageId: agreement.acceptanceDeadlineStageId,
        blocksNextStage: agreement.blocksNextStage,
        isFullyAccepted: !isAgreementBlockingActive(agreement),
      })),
      "Ustalenie",
    );
    const changeRequestSources = buildAgreementBlockSources(
      template,
      (changeRequests ?? []).map((entry) => ({
        title: entry.title,
        acceptanceDeadlineStageId: entry.acceptanceDeadlineStageId,
        blocksNextStage: entry.blocksNextStage,
        isFullyAccepted: !isChangeRequestBlockingActive(entry),
      })),
      "Karta zmian Projektu",
    );
    return computeStageGate(template.stages.length, [
      ...itemSources,
      ...agreementSources,
      ...changeRequestSources,
    ]);
  }, [template, itemInstances, process, agreements, changeRequests]);

  const softWarningIndexes = useMemo(
    () =>
      new Set(
        findUnblockedIncompleteStagesBeforeActive(
          template,
          process,
          stageGate.blockedStageIndexes,
        ),
      ),
    [template, process, stageGate.blockedStageIndexes],
  );

  async function handleOpenItem(item: ProcessItem) {
    if (interactive && projectId && !itemInstances?.[item.id]) {
      await ensureProjectProcessItems(projectId, template);
    }
    setActiveItem(item);
  }

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
            const isBlocked = stageGate.blockedStageIndexes.has(stageIndex);
            const hasSoftWarning = !isBlocked && softWarningIndexes.has(stageIndex);
            const blockReasons = stageGate.reasonsByStageIndex.get(stageIndex) ?? [];
            const isActiveStage = process?.activeStageId === stage.id;

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
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-surface-elevated to-surface-muted/50 px-4 py-4 shadow-soft",
                      isActiveStage
                        ? "border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb,59,130,246),0.15)]"
                        : isBlocked
                          ? "border-rose-500/40"
                          : "border-accent/25",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 h-full w-1",
                        isBlocked ? "bg-rose-500" : "bg-accent",
                      )}
                      aria-hidden
                    />
                    <div className="flex items-start gap-3 pl-2">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isBlocked ? "bg-rose-500/15 text-rose-300" : "bg-accent/15 text-accent",
                        )}
                      >
                        {isBlocked ? <Lock className="h-3.5 w-3.5" /> : stageIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                            isBlocked ? "text-rose-300" : "text-accent",
                          )}
                        >
                          Etap {stageIndex + 1}
                          {isActiveStage ? (
                            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-accent">
                              Aktywny
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-base font-semibold leading-snug text-foreground">
                          {stage.title}
                        </p>
                        {stageTotal > 0 ? (
                          <>
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                              {stageCompleted}/{stageTotal} elementów ukończonych
                              {hasSoftWarning ? (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                                  aria-label="Etap nie jest w pełni ukończony"
                                />
                              ) : null}
                            </p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  hasSoftWarning ? "bg-amber-400" : "bg-accent",
                                )}
                                style={{ width: `${stagePercent}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="mt-1.5 text-xs text-muted">Brak elementów w etapie</p>
                        )}
                        {isBlocked && blockReasons.length > 0 ? (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
                            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{blockReasons.join(" · ")}</span>
                          </div>
                        ) : null}
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
                            const kindLabel = item.isInternalAcceptance
                              ? "Odbiór wewnętrzny"
                              : item.kind === "kanban"
                                ? PROCESS_ITEM_KIND_LABELS.kanban
                                : checklistStats && checklistStats.total > 0
                                  ? `${PROCESS_ITEM_KIND_LABELS[item.kind]} · ${checklistStats.total} pkt.`
                                  : PROCESS_ITEM_KIND_LABELS[item.kind];
                            const assigneeLabel = instance ? formatAssigneeLabel(instance) : null;
                            const publicHref =
                              !interactive ? kanbanPublicLinks?.[item.id] : undefined;
                            const canOpen = canOpenProcessItem(item, {
                              stageIndex,
                              blockedStageIndexes: stageGate.blockedStageIndexes,
                            });

                            if (interactive) {
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  disabled={!canOpen}
                                  onClick={() => void handleOpenItem(item)}
                                  className={cn(
                                    "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                                    visualClasses.card,
                                    canOpen
                                      ? "cursor-pointer hover:border-accent/30 hover:bg-surface-elevated/80"
                                      : "cursor-not-allowed opacity-60",
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
                                    {publicHref ? (
                                      onKanbanNavigate ? (
                                        <button
                                          type="button"
                                          onClick={() => onKanbanNavigate(publicHref)}
                                          className="text-left text-accent hover:underline"
                                        >
                                          {item.title}
                                        </button>
                                      ) : (
                                        <Link href={publicHref} className="text-accent hover:underline">
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
        projectId={projectId}
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
