"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, FileCheck2, LayoutGrid, Receipt, ShieldCheck } from "lucide-react";
import { ProcessChecklistBoard } from "@/components/process/process-checklist-board";
import { ProcessInternalAcceptanceBoard } from "@/components/process/process-internal-acceptance-board";
import { ProcessKanbanBoard } from "@/components/process/process-kanban-board";
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
}: ProcessItemPanelProps) {
  const [structureDraft, setStructureDraft] = useState<ChecklistItemPayload | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [structureSaving, setStructureSaving] = useState(false);
  const replaceProjectProcessItem = useProcessStore((state) => state.replaceProjectProcessItem);
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
  const checklistPayload = resolvedInstance?.payload ?? { sections: [] };
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen={isFullscreen}>
        <DialogHeader className={isFullscreen ? "shrink-0 pb-2" : undefined}>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 shrink-0 text-accent" />
            {item.title}
          </DialogTitle>
          {!isInternalAcceptance ? (
            <DialogDescription>{PROCESS_ITEM_KIND_LABELS[item.kind]}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div
          data-process-scroll-root
          className={cn(
            "grid gap-4",
            isFullscreen && "min-h-0 flex-1 overflow-y-auto",
            showMobileNavPadding && "pb-24",
          )}
        >
          {interactive && resolvedInstance && item.kind !== "kanban" ? (
            <ProcessPublicLinkControls
              projectProcessItemId={resolvedInstance.id}
              kind={item.kind}
              isInternalAcceptance={isInternalAcceptance}
              defaultOpen={false}
            />
          ) : null}

          {interactive && resolvedInstance && onAssign && onSign && item.kind !== "kanban" && !isInternalAcceptance ? (
            <ProcessItemResponsibleSection
              key={`${resolvedInstance.id}-${resolvedInstance.updatedAt}`}
              instance={resolvedInstance}
              teamProfiles={teamProfiles}
              currentUserId={currentUserId}
              canManageAssignment={canManageAssignment}
              onAssign={onAssign}
              onSign={onSign}
            />
          ) : null}

          {isInternalAcceptance && projectId ? (
            <ProcessInternalAcceptanceBoard
              projectId={projectId}
              templateItemId={item.id}
              initialState={resolvedInstance?.internalAcceptanceState}
              actorId={currentUserId}
              actorName={actorName}
              teamProfiles={teamProfiles}
            />
          ) : null}

          {item.kind === "checklist" && !isInternalAcceptance && interactive && onSaveChecklist ? (
            <>
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
              <ProcessChecklistBoard
                key={`${item.id}-${resolvedInstance?.updatedAt ?? "new"}-checklist`}
                initialPayload={checklistPayload}
                actorId={currentUserId}
                actorName={actorName}
                teamProfiles={teamProfiles}
                onSave={onSaveChecklist}
              />
            </>
          ) : null}

          {item.kind === "checklist" && !isInternalAcceptance && !interactive ? (
            <ProcessChecklistBoard initialPayload={checklistPayload} readOnly />
          ) : null}

          {item.kind === "kanban" && interactive && resolvedInstance ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ProcessKanbanBoard
                projectProcessItemId={resolvedInstance.id}
                templatePayload={
                  isKanbanTemplatePayload(item.defaultPayload) ? item.defaultPayload : { columns: [] }
                }
                authorSide="team"
                authorName={actorName ?? "Zespół"}
                showPublicLink
                embedded
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

          {item.kind === "protocol" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Protokół odbioru</p>
              <p className="mt-2 text-sm text-muted">
                Formularz protokołu z podpisem klienta będzie dostępny w kolejnej fazie.
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
      </DialogContent>
    </Dialog>
  );
}
