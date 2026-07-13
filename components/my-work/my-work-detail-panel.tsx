"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import {
  isTerminalWorkItemStatus,
  WORK_ITEM_ACCEPTANCE_ACTION_LABELS,
  WORK_ITEM_PRIORITY_LABELS,
  WORK_ITEM_STATUS_LABELS,
  type WorkItemDetail,
} from "@/lib/my-work/types";
import { workItemLogActionLabel } from "@/lib/my-work/display-labels";
import { formatDate } from "@/lib/utils";
import { canEditWorkItem } from "@/lib/my-work/permissions";
import { useAuthStore } from "@/store/auth-store";
import { useCanManageWorkItems } from "@/store/my-work-store";
import { TaskChecklistPanel } from "@/components/task-checklist/task-checklist-panel";
import type { TaskChecklistParent } from "@/lib/task-checklist/types";

export function MyWorkDetailPanel({
  detail,
  open,
  onOpenChange,
  onAccept,
  onComplete,
  onStart,
  onVerify,
  onSend,
  onComment,
  onReportObstacle,
  onEdit,
  onRequestTakeover,
  onCompleteAllocation,
}: {
  detail: WorkItemDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onComplete: () => void;
  onStart: () => Promise<void>;
  onVerify: () => Promise<void>;
  onSend: () => Promise<void>;
  onComment: (body: string) => Promise<void>;
  onReportObstacle?: () => void;
  onEdit?: () => void;
  onRequestTakeover?: () => Promise<void>;
  onCompleteAllocation?: () => Promise<void>;
}) {
  const profile = useAuthStore((state) => state.profile);
  const canManage = useCanManageWorkItems(profile?.role);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!detail) return null;
  const { item, comments, logs, acceptances } = detail;
  const isAssignee = profile?.id === item.assignedUserId;
  const canAccept = isAssignee && (item.status === "sent" || item.status === "pending_ack");
  const canComplete =
    isAssignee && ["accepted", "in_progress", "blocked", "risk_reported"].includes(item.status);
  const canVerify = canManage && item.status === "pending_verification";
  const canSend = canManage && (item.status === "draft" || item.status === "planned");
  const canEdit = profile ? canEditWorkItem(profile, item) : false;
  const canRequestTakeover = Boolean(item.isSupporting && !isAssignee && onRequestTakeover);
  const isResourcePlanAllocation = item.sourceType === "resource_plan_item";
  const canCompleteAllocation =
    Boolean(onCompleteAllocation) &&
    isResourcePlanAllocation &&
    !isTerminalWorkItemStatus(item.status) &&
    (isAssignee || canManage);

  const checklistParent: TaskChecklistParent | null =
    item.sourceType === "manual"
      ? { kind: "work_item", id: item.id }
      : item.sourceType === "resource_plan_item" && item.sourceId
        ? { kind: "resource_plan_item", id: item.sourceId }
        : null;

  async function handleComment() {
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      await onComment(commentBody.trim());
      setCommentBody("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <p className="text-sm text-muted">
            {WORK_ITEM_STATUS_LABELS[item.status]} · {WORK_ITEM_PRIORITY_LABELS[item.priority]}
            {item.sourceTypeMeta ? ` · ${item.sourceTypeMeta.moduleLabel}` : ""}
          </p>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1 text-sm">
          {item.description ? (
            <section>
              <h3 className="font-medium text-foreground">Opis</h3>
              <p className="mt-1 whitespace-pre-wrap text-muted">{item.description}</p>
            </section>
          ) : null}

          {item.expectedResult ? (
            <section>
              <h3 className="font-medium text-foreground">Oczekiwany rezultat</h3>
              <p className="mt-1 text-muted">{item.expectedResult}</p>
            </section>
          ) : null}

          {item.completionCriteria ? (
            <section>
              <h3 className="font-medium text-foreground">Kryterium zakończenia</h3>
              <p className="mt-1 text-muted">{item.completionCriteria}</p>
            </section>
          ) : null}

          <div className="grid gap-1 text-muted sm:grid-cols-2">
            {item.projectName ? <p>Projekt: {item.projectName}</p> : null}
            {item.clientName ? <p>Klient: {item.clientName}</p> : null}
            {item.dueDate ? <p>Termin: {formatDate(item.dueDate)}</p> : null}
            {item.managerName ? <p>Zlecający: {item.managerName}</p> : null}
            {item.assignedUserName ? <p>Odpowiedzialny: {item.assignedUserName}</p> : null}
          </div>

          {item.blockedReason ? (
            <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <h3 className="font-medium text-amber-200">Przeszkoda / uwaga</h3>
              <p className="mt-1 text-muted">{item.blockedReason}</p>
            </section>
          ) : null}

          {item.aiGenerated && item.aiSuggestionReason ? (
            <section className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
              <h3 className="font-medium text-accent">Sugestia AI</h3>
              <p className="mt-1 text-muted">{item.aiSuggestionReason}</p>
            </section>
          ) : null}

          {item.sourceLinkUrl ? (
            <Link
              href={item.sourceLinkUrl}
              className="inline-flex items-center gap-1 text-sky-400 hover:underline"
            >
              Przejdź do źródła
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          {checklistParent ? <TaskChecklistPanel parent={checklistParent} /> : null}

          <section>
            <h3 className="mb-2 font-medium text-foreground">Komentarze</h3>
            <div className="grid gap-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-surface-muted px-3 py-2">
                  <p className="text-xs text-muted">
                    {comment.authorName} · {formatDate(comment.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))}
              {!comments.length ? <p className="text-muted">Brak komentarzy.</p> : null}
            </div>
            <div className="mt-3 grid gap-2">
              <Field label="Dodaj komentarz">
                <Textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={2} />
              </Field>
              <Button size="sm" onClick={() => void handleComment()} disabled={submitting}>
                Dodaj komentarz
              </Button>
            </div>
          </section>

          {acceptances.length ? (
            <section>
              <h3 className="mb-2 font-medium text-foreground">Historia przyjęć</h3>
              <div className="grid gap-2">
                {acceptances.map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
                    {WORK_ITEM_ACCEPTANCE_ACTION_LABELS[entry.action]} · {formatDate(entry.createdAt)}
                    {entry.comment ? <p className="mt-1">{entry.comment}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {logs.length ? (
            <section>
              <h3 className="mb-2 font-medium text-foreground">Aktywność</h3>
              <div className="grid gap-1 text-xs text-muted">
                {logs.slice(0, 8).map((log) => (
                  <p key={log.id}>
                    {workItemLogActionLabel(log.action)} · {formatDate(log.createdAt)}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {canEdit && onEdit ? (
            <Button variant="outline" onClick={onEdit}>
              Edytuj zadanie
            </Button>
          ) : null}
          {canAccept ? (
            <Button onClick={onAccept}>Przyjmij zadanie</Button>
          ) : null}
          {isAssignee && item.status === "accepted" ? (
            <Button variant="secondary" onClick={() => void onStart()}>
              Rozpocznij realizację
            </Button>
          ) : null}
          {canCompleteAllocation ? (
            <Button onClick={() => void onCompleteAllocation?.()}>
              {canManage && item.status === "pending_verification"
                ? "Zatwierdź przydział"
                : "Zakończ przydział"}
            </Button>
          ) : null}
          {canComplete ? (
            <Button variant="secondary" onClick={onComplete}>
              Podsumuj wykonanie
            </Button>
          ) : null}
          {isAssignee && canComplete && onReportObstacle ? (
            <Button variant="outline" onClick={onReportObstacle}>
              Zgłoś przeszkodę
            </Button>
          ) : null}
          {canRequestTakeover ? (
            <Button
              variant="outline"
              onClick={() => void onRequestTakeover?.()}
            >
              Poproś o przejęcie
            </Button>
          ) : null}
          {canVerify ? (
            <Button onClick={() => void onVerify()}>Zatwierdź wykonanie</Button>
          ) : null}
          {canSend ? (
            <Button onClick={() => void onSend()}>Wyślij do pracownika</Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
