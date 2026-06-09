"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { KanbanPriorityPicker } from "@/components/process/kanban-task-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { milestoneDateToInput } from "@/lib/process/dates";
import type { KanbanBoard, KanbanTask } from "@/lib/process/kanban-types";

export function KanbanTaskDetailModal({
  task,
  comments,
  authorName,
  canDelete,
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
  authorName: string;
  canDelete?: boolean;
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
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setError(null);
  }, [task]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description,
        priority,
        dueDate: dueDate.trim() || null,
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
      setError(closeError instanceof Error ? closeError.message : "Nie udało się zamknąć taska.");
      setIsClosing(false);
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="grid max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Szczegóły zgłoszenia</h3>
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
            disabled={isSaving}
            onChange={(next) => {
              setPriority(next);
            }}
          />
        </Field>

        <Field label="Termin">
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </Field>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isSaving || isClosing} onClick={() => void handleSave()}>
            {isSaving ? "Zapisywanie…" : "Zapisz"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isSaving || isClosing}
            onClick={() => void handleCloseTask()}
          >
            {isClosing ? "Zamykanie…" : "Zamknij zgłoszenie"}
          </Button>
          {canDelete && onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isDeleting || isSaving || isClosing}
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
