"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Lock,
  LayoutGrid,
  Receipt,
  ShieldCheck,
  StickyNote,
} from "lucide-react";
import { ProcessChecklistBoard } from "@/components/process/process-checklist-board";
import { ProcessInternalAcceptanceBoard } from "@/components/process/process-internal-acceptance-board";
import { ProcessKanbanBoard } from "@/components/process/process-kanban-board";
import { ProcessNoteLinksBoard } from "@/components/process/process-note-links-board";
import { ProcessProtocolBoard } from "@/components/process/process-protocol-board";
import { ProcessSettlementPanel } from "@/components/process/process-settlement-panel";
import { ProcessItemResponsibleSection } from "@/components/process/process-item-responsible-section";
import { ProcessPublicLinkControls } from "@/components/process/process-public-link-controls";
import { TemplateChecklistLinesEditor } from "@/components/process/template-checklist-lines-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProcessItemRemoteSync } from "@/hooks/use-process-item-remote-sync";
import type { UserProfile } from "@/lib/auth/types";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ChecklistItemPayload,
  type ProcessItem,
  type ProcessItemCompletion,
  type ProjectProcessItem,
} from "@/lib/process/types";
import { cn, formatDate } from "@/lib/utils";
import { normalizeChecklistPayload, prepareChecklistPayloadForSave } from "@/lib/process/item-payload";
import { useProcessStore } from "@/store/process-store";

const kindIcon = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
  kanban: LayoutGrid,
  note: StickyNote,
} as const;

type ProcessItemPanelProps = {
  item: ProcessItem | null;
  instance?: ProjectProcessItem;
  completion?: ProcessItemCompletion;
  projectId?: string;
  teamProfiles?: UserProfile[];
  currentUserId?: string;
  canManageAssignment?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interactive?: boolean;
  onSaveChecklist?: (payload: ChecklistItemPayload) => Promise<void>;
  onAssign?: (assigneeId: string | null) => Promise<void>;
  onSign?: (signatureNote: string) => Promise<void>;
  onToggleComplete?: (completed: boolean) => void;
  actorName?: string;
  canCustomizeChecklist?: boolean;
  /** Checklista leży na etapie oznaczonym jako „etap zamykający projekt”. */
  isClosingStage?: boolean;
  /** Utwórz taski AI na tablicy wdrożeniowej z notatki tej checklisty (tylko widok zespołu). */
  onCreateTasksFromNote?: (note: string) => void;
  /** Notatka przekazana z checklisty do wstępnego wypełnienia panelu AI na tej tablicy kanban. */
  initialKanbanNote?: string | null;
  onConsumeKanbanNote?: () => void;
};

export function ProcessItemPanel({
  item,
  instance,
  completion,
  projectId,
  teamProfiles = [],
  currentUserId,
  canManageAssignment = false,
  open,
  onOpenChange,
  interactive = false,
  onSaveChecklist,
  onAssign,
  onSign,
  onToggleComplete,
  actorName,
  canCustomizeChecklist = false,
  isClosingStage = false,
  onCreateTasksFromNote,
  initialKanbanNote,
  onConsumeKanbanNote,
}: ProcessItemPanelProps) {
  const [structureDraft, setStructureDraft] = useState<ChecklistItemPayload | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [structureSaving, setStructureSaving] = useState(false);
  const [blockingSaving, setBlockingSaving] = useState(false);
  const replaceProjectProcessItem = useProcessStore((state) => state.replaceProjectProcessItem);
  const setItemBlocksNextStage = useProcessStore((state) => state.setItemBlocksNextStage);
  const storeInstance = useProcessStore((state) =>
    projectId && item ? state.projectProcessItems[projectId]?.[item.id] : undefined,
  );

  const handleRemoteUpdate = useCallback(
    (remote: ProjectProcessItem) => {
      if (projectId) {
        replaceProjectProcessItem(projectId, remote);
      }
    },
    [projectId, replaceProjectProcessItem],
  );

  useProcessItemRemoteSync({
    enabled: open && interactive && Boolean(projectId && item),
    projectId,
    templateItemId: item?.id,
    localUpdatedAt: (instance ?? storeInstance)?.updatedAt,
    onRemoteUpdate: handleRemoteUpdate,
  });

  const resolvedInstance = item ? instance ?? storeInstance : undefined;
  const checklistPayload = useMemo(
    () => resolvedInstance?.payload ?? { sections: [] },
    [resolvedInstance?.payload],
  );
  const structurePayload = normalizeChecklistPayload(structureDraft ?? checklistPayload);

  const handleSaveStructure = useCallback(async () => {
    if (!onSaveChecklist || !item) {
      return;
    }
    setStructureSaving(true);
    try {
      await onSaveChecklist(prepareChecklistPayloadForSave(structureDraft ?? checklistPayload));
      setStructureDraft(null);
    } finally {
      setStructureSaving(false);
    }
  }, [checklistPayload, item, onSaveChecklist, structureDraft]);

  const handleToggleBlocksNextStage = useCallback(
    async (next: boolean) => {
      if (!projectId || !item) {
        return;
      }
      setBlockingSaving(true);
      try {
        await setItemBlocksNextStage(projectId, item.id, next);
      } finally {
        setBlockingSaving(false);
      }
    },
    [item, projectId, setItemBlocksNextStage],
  );

  if (!item) {
    return null;
  }

  const isInternalAcceptance = Boolean(item.isInternalAcceptance ?? resolvedInstance?.isInternalAcceptance);
  const completed =
    Boolean(completion) ||
    resolvedInstance?.status === "completed" ||
    Boolean(resolvedInstance?.signedAt);
  const Icon = isInternalAcceptance ? ShieldCheck : kindIcon[item.kind];
  const canEditChecklistStructure =
    interactive &&
    !isInternalAcceptance &&
    item.kind === "checklist" &&
    Boolean(onSaveChecklist);
  const isBoardItem = item.kind === "checklist" || isInternalAcceptance;
  const isFullscreen = item.kind === "kanban" || (interactive && isBoardItem);
  const showMobileNavPadding = interactive && isBoardItem;

  const isChecklistInteractive =
    item.kind === "checklist" && !isInternalAcceptance && interactive && Boolean(onSaveChecklist);
  const showResponsible =
    interactive && resolvedInstance && onAssign && onSign && item.kind !== "kanban" && !isInternalAcceptance;
  const responsibleKey = `${resolvedInstance?.id ?? "new"}-${resolvedInstance?.updatedAt ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen={isFullscreen}>
        <DialogHeader
          className={cn(
            isFullscreen &&
              "mb-0 shrink-0 border-b border-border/60 bg-surface-elevated pb-3 pt-1 -mx-4 px-4 sm:-mx-5 sm:px-5",
            isFullscreen ? "min-w-0" : undefined,
          )}
        >
          {isFullscreen ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 pr-10 sm:pr-8">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-10 min-h-10 w-full justify-start px-3 text-sm font-medium sm:h-8 sm:w-auto sm:justify-center"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4 shrink-0" />
                Wróć do procesu
              </Button>
            </div>
          ) : null}
          <DialogTitle className="flex items-center gap-2 pr-2">
            <Icon className="h-5 w-5 shrink-0 text-accent" />
            <span className="min-w-0 truncate">{item.title}</span>
          </DialogTitle>
          {!isInternalAcceptance ? (
            <DialogDescription>{PROCESS_ITEM_KIND_LABELS[item.kind]}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div
          data-process-scroll-root
          className={cn(
            item.kind === "kanban"
              ? "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
              : "grid gap-4",
            isFullscreen && item.kind !== "kanban" && "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
            showMobileNavPadding && "pb-36 md:pb-0",
            isFullscreen && "pt-3",
          )}
        >
          {showResponsible && isChecklistInteractive ? (
            <ProcessItemResponsibleSection
              key={`assignee-${responsibleKey}`}
              part="assignee"
              instance={resolvedInstance!}
              teamProfiles={teamProfiles}
              currentUserId={currentUserId}
              canManageAssignment={canManageAssignment}
              onAssign={onAssign!}
              onSign={onSign!}
            />
          ) : null}

          {isInternalAcceptance && projectId ? (
            <ProcessInternalAcceptanceBoard
              projectId={projectId}
              templateItemId={item.id}
              projectProcessItemId={resolvedInstance?.id}
              initialState={resolvedInstance?.internalAcceptanceState}
              actorId={currentUserId}
              actorName={actorName}
              teamProfiles={teamProfiles}
              raisedMobileNavForBack
            />
          ) : null}

          {isChecklistInteractive ? (
            <>
              <ProcessChecklistBoard
                key={`${item.id}-${resolvedInstance?.updatedAt ?? "new"}-checklist`}
                initialPayload={checklistPayload}
                projectProcessItemId={resolvedInstance?.id}
                actorId={currentUserId}
                actorName={actorName}
                teamProfiles={teamProfiles}
                defaultAssigneeId={resolvedInstance?.assigneeId}
                defaultAssigneeName={resolvedInstance?.assigneeName}
                onSave={onSaveChecklist}
                raisedMobileNavForBack
                onCreateTasksFromNote={isClosingStage ? onCreateTasksFromNote : undefined}
              />

              {showResponsible ? (
                <ProcessItemResponsibleSection
                  key={`signature-${responsibleKey}`}
                  part="signature"
                  instance={resolvedInstance!}
                  teamProfiles={teamProfiles}
                  currentUserId={currentUserId}
                  canManageAssignment={canManageAssignment}
                  onAssign={onAssign!}
                  onSign={onSign!}
                />
              ) : null}

              {canEditChecklistStructure ? (
                <div className="rounded-xl border border-border/70 bg-surface-muted/25 p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
                    onClick={() => setStructureOpen((value) => !value)}
                  >
                    Edytuj listy i dodaj punkty
                    <span className="text-xs text-muted">{structureOpen ? "Zwiń" : "Rozwiń"}</span>
                  </button>
                  {structureOpen ? (
                    <div className="mt-3 grid gap-3">
                      <TemplateChecklistLinesEditor
                        payload={structurePayload}
                        label="Struktura checklisty w projekcie"
                        onChange={(next) => setStructureDraft(next)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={structureSaving}
                        onClick={() => void handleSaveStructure()}
                      >
                        {structureSaving ? "Zapisywanie…" : "Zapisz strukturę checklisty"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {resolvedInstance ? (
                <label
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                    resolvedInstance.blocksNextStage
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-border/70 bg-surface-muted/20",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={resolvedInstance.blocksNextStage}
                    disabled={blockingSaving}
                    onChange={(event) => void handleToggleBlocksNextStage(event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      Blokuj kolejny etap
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      Jeśli ten element nie zostanie ukończony, kolejny etap procesu (i wszystkie po
                      nim) będzie zablokowany.
                    </span>
                  </span>
                </label>
              ) : null}

              <ProcessPublicLinkControls
                projectProcessItemId={resolvedInstance!.id}
                kind={item.kind}
                isInternalAcceptance={isInternalAcceptance}
                defaultOpen={false}
              />
            </>
          ) : null}

          {showResponsible && !isChecklistInteractive ? (
            <ProcessItemResponsibleSection
              key={`responsible-${responsibleKey}`}
              instance={resolvedInstance!}
              teamProfiles={teamProfiles}
              currentUserId={currentUserId}
              canManageAssignment={canManageAssignment}
              onAssign={onAssign!}
              onSign={onSign!}
            />
          ) : null}

          {interactive && resolvedInstance && !isInternalAcceptance && !isChecklistInteractive ? (
            <label
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                resolvedInstance.blocksNextStage
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-border/70 bg-surface-muted/20",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={resolvedInstance.blocksNextStage}
                disabled={blockingSaving}
                onChange={(event) => void handleToggleBlocksNextStage(event.target.checked)}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  Blokuj kolejny etap
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  Jeśli ten element nie zostanie ukończony, kolejny etap procesu (i wszystkie po
                  nim) będzie zablokowany.
                </span>
              </span>
            </label>
          ) : null}

          {interactive && resolvedInstance && item.kind !== "kanban" && !isChecklistInteractive ? (
            <ProcessPublicLinkControls
              projectProcessItemId={resolvedInstance.id}
              kind={item.kind}
              isInternalAcceptance={isInternalAcceptance}
              defaultOpen={false}
            />
          ) : null}

          {item.kind === "checklist" && !isInternalAcceptance && !interactive ? (
            <ProcessChecklistBoard
              initialPayload={checklistPayload}
              readOnly
              defaultAssigneeId={resolvedInstance?.assigneeId}
              defaultAssigneeName={resolvedInstance?.assigneeName}
            />
          ) : null}

          {item.kind === "kanban" && interactive && resolvedInstance ? (
            <div className="flex min-h-0 min-w-0 w-full max-w-full flex-col overflow-x-hidden max-md:overflow-visible md:flex-1">
              <ProcessKanbanBoard
                projectProcessItemId={resolvedInstance.id}
                templatePayload={
                  isKanbanTemplatePayload(item.defaultPayload) ? item.defaultPayload : { columns: [] }
                }
                authorSide="team"
                authorName={actorName ?? "Zespół"}
                showPublicLink
                embedded
                initialClientText={initialKanbanNote ?? undefined}
                onConsumeInitialClientText={onConsumeKanbanNote}
              />
            </div>
          ) : null}

          {item.kind === "kanban" && interactive && resolvedInstance && completed ? (
            <div className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-emerald-200">Ukończono</p>
              <p className="mt-1 text-muted">
                {formatDate(completion?.completedAt ?? resolvedInstance?.signedAt ?? undefined)}
                {completion?.completedBy || resolvedInstance?.signedByName
                  ? ` · ${completion?.completedBy ?? resolvedInstance?.signedByName}`
                  : ""}
              </p>
            </div>
          ) : null}

          {item.kind === "settlement" && projectId && interactive ? (
            <ProcessSettlementPanel projectId={projectId} />
          ) : item.kind === "settlement" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Rozliczenie</p>
              <p className="mt-2 text-sm text-muted">
                Powiązanie z ofertą serwisową będzie dostępne w kolejnej fazie.
              </p>
            </div>
          ) : null}

          {item.kind === "protocol" && resolvedInstance && interactive ? (
            <ProcessProtocolBoard
              projectProcessItemId={resolvedInstance.id}
              projectId={projectId}
              actorName={actorName}
              canManageTemplate={canCustomizeChecklist}
              onToggleComplete={onToggleComplete}
            />
          ) : item.kind === "protocol" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Protokół odbioru</p>
              <p className="mt-2 text-sm text-muted">
                Protokół zostanie wypełniony i podpisany elektronicznie (Ty i przedstawiciel firmy)
                na tablecie podczas wizyty.
              </p>
            </div>
          ) : null}

          {item.kind === "note" && projectId && resolvedInstance && interactive ? (
            <ProcessNoteLinksBoard
              projectId={projectId}
              projectProcessItemId={resolvedInstance.id}
              actorName={actorName}
            />
          ) : item.kind === "note" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Notatka / dokument</p>
              <p className="mt-2 text-sm text-muted">
                Podpięte notatki i dokumenty będą dostępne po otwarciu tego elementu w widoku zespołu.
              </p>
            </div>
          ) : null}

          {completed && item.kind !== "kanban" && !isInternalAcceptance ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-emerald-200">Ukończono</p>
              <p className="mt-1 text-muted">
                {formatDate(completion?.completedAt ?? resolvedInstance?.signedAt ?? undefined)}
                {completion?.completedBy || resolvedInstance?.signedByName
                  ? ` · ${completion?.completedBy ?? resolvedInstance?.signedByName}`
                  : ""}
              </p>
            </div>
          ) : null}

          {interactive && item.kind !== "checklist" && item.kind !== "kanban" && !isInternalAcceptance ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={completed ? "secondary" : "default"}
                onClick={() => onToggleComplete?.(!completed)}
              >
                {completed ? "Cofnij ukończenie" : "Oznacz jako ukończone"}
              </Button>
            </div>
          ) : item.kind !== "checklist" && item.kind !== "kanban" && !isInternalAcceptance ? (
            <p className={cn("text-sm", completed ? "text-emerald-300" : "text-muted")}>
              {completed ? "Element ukończony" : "Element oczekuje na realizację"}
            </p>
          ) : null}
        </div>

        {isFullscreen ? (
          <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-border/80 bg-surface-elevated/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full justify-center text-sm font-semibold"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Wróć do procesu
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
