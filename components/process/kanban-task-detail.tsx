"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { History, X } from "lucide-react";
import { KanbanPriorityPicker } from "@/components/process/kanban-task-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  formatKanbanEventAuthor,
  formatKanbanEventDate,
  getKanbanTaskEvents,
  KANBAN_TASK_EVENT_LABELS,
} from "@/lib/process/kanban-events";
import { milestoneDateToInput } from "@/lib/process/dates";
import type { KanbanBoard, KanbanTask, KanbanTaskEvent } from "@/lib/process/kanban-types";

export function KanbanTaskDetailModal({
  task,
  comments,
  events,
  authorName,
  canDelete,
  showDueDate = true,
  columns,
  currentColumnId,
  onMoveToColumn,
  commentDraft,
  onCommentDraftChange,
  onClose,
  onSave,
  onCloseTask,
  onDelete,
  onComment,
}: {
  task: KanbanTask;
  comments: KanbanBoard["comments"];
  events: KanbanTaskEvent[];
  authorName: string;
  canDelete?: boolean;
  showDueDate?: boolean;
  columns?: { id: string; title: string }[];
  currentColumnId?: string;
  onMoveToColumn?: (columnId: string) => Promise<void>;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: (patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate">>) => Promise<void>;
  onCloseTask: (closed: boolean) => Promise<void>;
  onDelete?: () => Promise<void>;
  onComment: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(milestoneDateToInput(task.dueDate));
  const [stageId, setStageId] = useState(currentColumnId ?? task.columnId);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(milestoneDateToInput(task.dueDate));
    setStageId(currentColumnId ?? task.columnId);
    setError(null);
    setIsClosing(false);
    setIsReopening(false);
  }, [task, currentColumnId]);

  const isClosed = Boolean(task.closedAt);
  const taskEvents = getKanbanTaskEvents(events, task.id, task.createdAt);

  async function handleMoveStage(nextColumnId: string) {
    if (!onMoveToColumn || nextColumnId === stageId) {
      return;
    }
    setIsMoving(true);
    setError(null);
    try {
      await onMoveToColumn(nextColumnId);
      setStageId(nextColumnId);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Nie udało się przenieść zgłoszenia.");
    } finally {
      setIsMoving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description,
        priority,
        ...(showDueDate ? { dueDate: dueDate.trim() || null } : {}),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseTask() {
    setIsClosing(true);
    setError(null);
    try {
      await onCloseTask(true);
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Nie udało się zamknąć zgłoszenia.");
    } finally {
      setIsClosing(false);
    }
  }

  async function handleReopenTask() {
    setIsReopening(true);
    setError(null);
    try {
      await onCloseTask(false);
    } catch (reopenError) {
      setError(reopenError instanceof Error ? reopenError.message : "Nie udało się ponownie otworzyć zgłoszenia.");
    } finally {
      setIsReopening(false);
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="grid max-h-[92dvh] w-full max-w-lg gap-4 overflow-y-auto rounded-t-3xl border border-border bg-surface-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft sm:max-h-[90vh] sm:rounded-2xl sm:pb-5">
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border/80 sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Szczegóły zgłoszenia</h3>
            {isClosed ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">Zamknięte</p>
            ) : null}
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Field label="Tytuł">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Opis">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        <Field label="Priorytet">
          <KanbanPriorityPicker
            value={priority}
            disabled={isSaving || isMoving}
            onChange={(next) => {
              setPriority(next);
            }}
          />
        </Field>

        {columns && columns.length > 0 && onMoveToColumn && !isClosed ? (
          <Field label="Etap">
            <Select
              value={stageId}
              disabled={isMoving || isSaving}
              onChange={(event) => void handleMoveStage(event.target.value)}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {showDueDate ? (
          <Field label="Termin">
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isSaving || isClosing || isReopening} onClick={() => void handleSave()}>
            {isSaving ? "Zapisywanie…" : "Zapisz"}
          </Button>
          {!isClosed ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSaving || isClosing || isReopening}
              onClick={() => void handleCloseTask()}
            >
              {isClosing ? "Zamykanie…" : "Zamknij zgłoszenie"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSaving || isClosing || isReopening}
              onClick={() => void handleReopenTask()}
            >
              {isReopening ? "Otwieranie…" : "Otwórz ponownie"}
            </Button>
          )}
          {canDelete && onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isDeleting || isSaving || isClosing || isReopening}
              className="text-rose-300 hover:text-rose-200"
              onClick={() => {
                if (!window.confirm("Usunąć to zgłoszenie na stałe? Tej operacji nie można cofnąć.")) {
                  return;
                }
                setIsDeleting(true);
                setError(null);
                void onDelete().catch((deleteError) => {
                  setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć.");
                  setIsDeleting(false);
                });
              }}
            >
              {isDeleting ? "Usuwanie…" : "Usuń"}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-border/60 pt-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <History className="h-4 w-4 text-muted" />
            Historia
          </p>
          <div className="grid max-h-40 gap-2 overflow-y-auto">
            {taskEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{KANBAN_TASK_EVENT_LABELS[event.eventType]}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatKanbanEventDate(event.createdAt)} · {formatKanbanEventAuthor(event)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-foreground">Komentarze</p>
          <div className="grid max-h-48 gap-2 overflow-y-auto">
            {comments.length ? (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-sm">
                  <p className="text-xs text-muted">
                    {comment.authorName} · {comment.authorSide === "client" ? "Klient" : "Zespół"}
                  </p>
                  <p className="mt-1 text-foreground">{comment.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Brak komentarzy.</p>
            )}
          </div>
          <Textarea
            value={commentDraft}
            placeholder={`Komentarz (${authorName})…`}
            onChange={(event) => onCommentDraftChange(event.target.value)}
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => void onComment()}>
            Dodaj komentarz
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
