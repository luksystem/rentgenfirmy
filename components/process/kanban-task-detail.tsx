"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, Pencil, Trash2, X } from "lucide-react";
import { KanbanPriorityPicker } from "@/components/process/kanban-task-card";
import { KanbanAssigneePicker } from "@/components/process/kanban-board-controls";
import { KanbanAttachmentGallery, type KanbanAttachmentUploadOptions } from "@/components/process/kanban-attachment-gallery";
import { Button } from "@/components/ui/button";
import { Dialog, StackedDialogContent, DialogTitle } from "@/components/ui/dialog";
import { KanbanMentionTextarea } from "@/components/process/kanban-mention-textarea";
import { KanbanTaskReactions } from "@/components/process/kanban-task-reactions";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  formatKanbanEventAuthor,
  formatKanbanEventDate,
  getKanbanTaskEvents,
  KANBAN_TASK_EVENT_LABELS,
} from "@/lib/process/kanban-events";
import type { KanbanReactionEmoji } from "@/lib/process/kanban-reactions";
import { milestoneDateToInput } from "@/lib/process/dates";
import type {
  KanbanAttachment,
  KanbanAuthorSide,
  KanbanBoard,
  KanbanTask,
  KanbanTaskEvent,
  KanbanTaskReaction,
} from "@/lib/process/kanban-types";
import { isOwnKanbanComment } from "@/lib/process/kanban-types";

export function KanbanTaskDetailModal({
  task,
  comments,
  reactions = [],
  events,
  attachments,
  authorName,
  authorSide,
  canDelete,
  showDueDate = true,
  allowAttachmentUpload = false,
  columns,
  currentColumnId,
  onMoveToColumn,
  assigneeOptions = [],
  mentionOptions = [],
  commentDraft,
  onCommentDraftChange,
  onClose,
  onSave,
  onCloseTask,
  onDelete,
  onComment,
  onUpdateComment,
  onDeleteComment,
  onToggleReaction,
  onUploadAttachment,
  onSetAttachmentCover,
}: {
  task: KanbanTask;
  comments: KanbanBoard["comments"];
  reactions?: KanbanTaskReaction[];
  events: KanbanTaskEvent[];
  attachments: KanbanAttachment[];
  authorName: string;
  authorSide: KanbanAuthorSide;
  canDelete?: boolean;
  showDueDate?: boolean;
  allowAttachmentUpload?: boolean;
  columns?: { id: string; title: string }[];
  currentColumnId?: string;
  onMoveToColumn?: (columnId: string) => Promise<void>;
  assigneeOptions?: string[];
  mentionOptions?: string[];
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: (
    patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate" | "assigneeName">>,
  ) => Promise<void>;
  onCloseTask: (closed: boolean) => Promise<void>;
  onDelete?: () => Promise<void>;
  onComment: () => Promise<void>;
  onUpdateComment?: (commentId: string, body: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onToggleReaction?: (emoji: KanbanReactionEmoji) => Promise<void>;
  onUploadAttachment?: (file: File, options?: KanbanAttachmentUploadOptions) => Promise<void>;
  onSetAttachmentCover?: (attachmentId: string, isCardCover: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(milestoneDateToInput(task.dueDate));
  const [assigneeName, setAssigneeName] = useState(task.assigneeName ?? "");
  const [stageId, setStageId] = useState(currentColumnId ?? task.columnId);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [coverUpdatingId, setCoverUpdatingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const isFlushingRef = useRef(false);

  const taskSyncKey = useMemo(() => `${task.id}:${task.updatedAt}`, [task.id, task.updatedAt]);

  const getTaskSavePayload = useCallback(
    () => ({
      title: title.trim(),
      description,
      priority,
      assigneeName: assigneeName.trim() || null,
      ...(showDueDate ? { dueDate: dueDate.trim() || null } : {}),
    }),
    [assigneeName, description, dueDate, priority, showDueDate, title],
  );

  const hasUnsavedTaskChanges = useCallback(() => {
    const payload = getTaskSavePayload();
    const currentDueDate = milestoneDateToInput(task.dueDate);
    return (
      payload.title !== task.title ||
      payload.description !== task.description ||
      payload.priority !== task.priority ||
      payload.assigneeName !== (task.assigneeName ?? null) ||
      (showDueDate && (payload.dueDate ?? null) !== (currentDueDate || null))
    );
  }, [getTaskSavePayload, showDueDate, task]);

  const flushPendingChanges = useCallback(async () => {
    if (isFlushingRef.current) {
      return;
    }
    isFlushingRef.current = true;
    try {
      if (hasUnsavedTaskChanges()) {
        await onSave(getTaskSavePayload());
      }

      if (editingCommentId && onUpdateComment && editingCommentBody.trim()) {
        const originalBody = comments.find((entry) => entry.id === editingCommentId)?.body;
        if (editingCommentBody !== originalBody) {
          await onUpdateComment(editingCommentId, editingCommentBody);
        }
        setEditingCommentId(null);
        setEditingCommentBody("");
      }

      if (commentDraft.trim()) {
        await onComment();
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [
    commentDraft,
    comments,
    editingCommentBody,
    editingCommentId,
    getTaskSavePayload,
    hasUnsavedTaskChanges,
    onComment,
    onSave,
    onUpdateComment,
  ]);

  const handleClose = useCallback(async () => {
    if (isClosingModal || isFlushingRef.current) {
      return;
    }
    setIsClosingModal(true);
    setError(null);
    try {
      await flushPendingChanges();
      onClose();
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Nie udało się zapisać zmian.");
      setIsClosingModal(false);
    }
  }, [flushPendingChanges, isClosingModal, onClose]);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(milestoneDateToInput(task.dueDate));
    setAssigneeName(task.assigneeName ?? "");
    setStageId(currentColumnId ?? task.columnId);
    setError(null);
    setIsClosing(false);
    setIsReopening(false);
  }, [taskSyncKey, task, currentColumnId]);

  const isClosed = Boolean(task.closedAt);
  const taskEvents = getKanbanTaskEvents(events, task.id, task.createdAt);
  const hasVideo = attachments.some((entry) => entry.mediaKind === "video");

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
    if (!hasUnsavedTaskChanges()) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(getTaskSavePayload());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearDueDate() {
    if (!showDueDate) {
      return;
    }
    setDueDate("");
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ dueDate: null });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się usunąć terminu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseTask() {
    setIsClosing(true);
    setError(null);
    try {
      await flushPendingChanges();
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
      await flushPendingChanges();
      await onCloseTask(false);
    } catch (reopenError) {
      setError(reopenError instanceof Error ? reopenError.message : "Nie udało się ponownie otworzyć zgłoszenia.");
    } finally {
      setIsReopening(false);
    }
  }

  async function handleSaveCommentEdit(commentId: string) {
    if (!onUpdateComment || !editingCommentBody.trim()) {
      return;
    }
    setCommentActionId(commentId);
    setError(null);
    try {
      await onUpdateComment(commentId, editingCommentBody);
      setEditingCommentId(null);
      setEditingCommentBody("");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Nie udało się zapisać komentarza.");
    } finally {
      setCommentActionId(null);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!onDeleteComment) {
      return;
    }
    if (!window.confirm("Usunąć ten komentarz?")) {
      return;
    }
    setCommentActionId(commentId);
    setError(null);
    try {
      await onDeleteComment(commentId);
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentBody("");
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć komentarza.");
    } finally {
      setCommentActionId(null);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          void handleClose();
        }
      }}
    >
      <StackedDialogContent aria-describedby={undefined}>
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border/80 sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-lg font-semibold text-foreground">Szczegóły zgłoszenia</DialogTitle>
            {isClosed ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">Zamknięte</p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isClosingModal || isSaving}
            onClick={() => void handleClose()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Field label="Tytuł">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Opis">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        {onToggleReaction ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium text-foreground">Reakcje</p>
            <KanbanTaskReactions
              taskId={task.id}
              reactions={reactions}
              authorName={authorName}
              authorSide={authorSide}
              disabled={isSaving || isMoving || isClosing || isReopening}
              onToggle={onToggleReaction}
            />
          </div>
        ) : null}

        <Field label="Priorytet">
          <KanbanPriorityPicker
            value={priority}
            disabled={isSaving || isMoving}
            onChange={(next) => {
              setPriority(next);
            }}
          />
        </Field>

        {assigneeOptions.length > 0 ? (
          <Field label="Odpowiedzialny">
            <KanbanAssigneePicker
              value={assigneeName || null}
              options={assigneeOptions}
              disabled={isSaving || isMoving}
              onChange={(value) => setAssigneeName(value ?? "")}
            />
          </Field>
        ) : null}

        {columns && columns.length > 0 && onMoveToColumn ? (
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
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="min-w-[11rem] flex-1"
                value={dueDate}
                disabled={isSaving}
                onChange={(event) => setDueDate(event.target.value)}
                onInput={(event) => setDueDate(event.currentTarget.value)}
              />
              {dueDate || task.dueDate ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => void handleClearDueDate()}
                >
                  Usuń termin
                </Button>
              ) : null}
            </div>
            <p className="text-xs font-normal text-muted">Zadanie może pozostać bez terminu.</p>
          </Field>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSaving || isClosing || isReopening || isClosingModal || !hasUnsavedTaskChanges()}
            onClick={() => void handleSave()}
          >
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
                void (async () => {
                  try {
                    await flushPendingChanges();
                    await onDelete();
                  } catch (deleteError) {
                    setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć.");
                    setIsDeleting(false);
                  }
                })();
              }}
            >
              {isDeleting ? "Usuwanie…" : "Usuń"}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-foreground">Zdjęcia i film</p>
          <KanbanAttachmentGallery
            attachments={attachments}
            allowUpload={allowAttachmentUpload}
            allowCoverManage={allowAttachmentUpload}
            hasVideo={hasVideo}
            uploading={isUploadingAttachment}
            coverUpdatingId={coverUpdatingId}
            uploadError={uploadError}
            onUpload={
              onUploadAttachment
                ? async (file, options) => {
                    setIsUploadingAttachment(true);
                    setUploadError(null);
                    try {
                      await onUploadAttachment(file, options);
                    } catch (uploadErr) {
                      setUploadError(
                        uploadErr instanceof Error ? uploadErr.message : "Nie udało się przesłać pliku.",
                      );
                      throw uploadErr;
                    } finally {
                      setIsUploadingAttachment(false);
                    }
                  }
                : undefined
            }
            onSetCover={
              onSetAttachmentCover
                ? async (attachmentId, isCardCover) => {
                    setCoverUpdatingId(attachmentId || "all");
                    setUploadError(null);
                    try {
                      await onSetAttachmentCover(attachmentId, isCardCover);
                    } catch (coverErr) {
                      setUploadError(
                        coverErr instanceof Error ? coverErr.message : "Nie udało się zmienić okładki.",
                      );
                      throw coverErr;
                    } finally {
                      setCoverUpdatingId(null);
                    }
                  }
                : undefined
            }
          />
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
              comments.map((comment) => {
                const isOwn = isOwnKanbanComment(comment, authorName, authorSide);
                const isEditing = editingCommentId === comment.id;
                const isBusy = commentActionId === comment.id;

                return (
                  <div key={comment.id} className="rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-muted">
                        {comment.authorName} · {comment.authorSide === "client" ? "Klient" : "Zespół"}
                      </p>
                      {isOwn && onUpdateComment && onDeleteComment ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
                            disabled={isBusy || isCommentSubmitting}
                            aria-label="Edytuj komentarz"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentBody(comment.body);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                            disabled={isBusy || isCommentSubmitting}
                            aria-label="Usuń komentarz"
                            onClick={() => void handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 grid gap-2">
                        <Textarea
                          value={editingCommentBody}
                          disabled={isBusy}
                          onChange={(event) => setEditingCommentBody(event.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isBusy || !editingCommentBody.trim()}
                            onClick={() => void handleSaveCommentEdit(comment.id)}
                          >
                            {isBusy ? "Zapisywanie…" : "Zapisz"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentBody("");
                            }}
                          >
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{comment.body}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">Brak komentarzy.</p>
            )}
          </div>
          {mentionOptions.length > 0 ? (
            <KanbanMentionTextarea
              value={commentDraft}
              mentionOptions={mentionOptions}
              disabled={isCommentSubmitting}
              placeholder={`Komentarz (${authorName})… użyj @ aby oznaczyć`}
              onChange={onCommentDraftChange}
            />
          ) : (
            <Textarea
              value={commentDraft}
              placeholder={`Komentarz (${authorName})…`}
              disabled={isCommentSubmitting}
              onChange={(event) => onCommentDraftChange(event.target.value)}
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isCommentSubmitting || !commentDraft.trim()}
            onClick={() => {
              if (isCommentSubmitting || !commentDraft.trim()) {
                return;
              }
              void (async () => {
                setIsCommentSubmitting(true);
                try {
                  await onComment();
                } finally {
                  setIsCommentSubmitting(false);
                }
              })();
            }}
          >
            {isCommentSubmitting ? "Dodawanie…" : "Dodaj komentarz"}
          </Button>
        </div>
      </StackedDialogContent>
    </Dialog>
  );
}
