"use client";

import { CheckCircle2, FileCheck2, Receipt } from "lucide-react";
import { ProcessChecklistEditor } from "@/components/process/process-checklist-editor";
import { ProcessItemResponsibleSection } from "@/components/process/process-item-responsible-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserProfile } from "@/lib/auth/types";
import { checklistProgress } from "@/lib/process/item-payload";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ChecklistItemPayload,
  type ProcessItem,
  type ProcessItemCompletion,
  type ProjectProcessItem,
} from "@/lib/process/types";
import { cn, formatDate } from "@/lib/utils";

const kindIcon = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
} as const;

type ProcessItemPanelProps = {
  item: ProcessItem | null;
  instance?: ProjectProcessItem;
  completion?: ProcessItemCompletion;
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
};

export function ProcessItemPanel({
  item,
  instance,
  completion,
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
  if (!item) {
    return null;
  }

  const completed = Boolean(completion) || instance?.status === "completed" || Boolean(instance?.signedAt);
  const Icon = kindIcon[item.kind];
  const checklistPayload = instance?.payload ?? { lines: [] };
  const checklistStats = checklistProgress(checklistPayload);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 shrink-0 text-accent" />
            {item.title}
          </DialogTitle>
          <DialogDescription>{PROCESS_ITEM_KIND_LABELS[item.kind]}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {interactive && instance && onAssign && onSign ? (
            <ProcessItemResponsibleSection
              key={`${instance.id}-${instance.updatedAt}`}
              instance={instance}
              teamProfiles={teamProfiles}
              currentUserId={currentUserId}
              canManageAssignment={canManageAssignment}
              onAssign={onAssign}
              onSign={onSign}
            />
          ) : null}

          {item.kind === "checklist" && interactive && onSaveChecklist ? (
            <ProcessChecklistEditor
              key={`${item.id}-${instance?.updatedAt ?? "new"}-checklist`}
              initialPayload={checklistPayload}
              actorName={actorName}
              onSave={onSaveChecklist}
            />
          ) : null}

          {item.kind === "checklist" && !interactive ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4 text-sm text-muted">
              {checklistStats.total > 0
                ? `${checklistStats.completed}/${checklistStats.total} punktów ukończonych`
                : "Brak zapisanych punktów checklisty."}
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

          {item.kind === "settlement" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Rozliczenie</p>
              <p className="mt-2 text-sm text-muted">
                Powiązanie z ofertą serwisową będzie dostępne w kolejnej fazie.
              </p>
            </div>
          ) : null}

          {completed ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-emerald-200">Ukończono</p>
              <p className="mt-1 text-muted">
                {formatDate(completion?.completedAt ?? instance?.signedAt ?? undefined)}
                {completion?.completedBy || instance?.signedByName
                  ? ` · ${completion?.completedBy ?? instance?.signedByName}`
                  : ""}
              </p>
            </div>
          ) : null}

          {interactive && item.kind !== "checklist" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={completed ? "secondary" : "default"}
                onClick={() => onToggleComplete?.(!completed)}
              >
                {completed ? "Cofnij ukończenie" : "Oznacz jako ukończone"}
              </Button>
            </div>
          ) : (
            item.kind !== "checklist" ? (
              <p className={cn("text-sm", completed ? "text-emerald-300" : "text-muted")}>
                {completed ? "Element ukończony" : "Element oczekuje na realizację"}
              </p>
            ) : null
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
