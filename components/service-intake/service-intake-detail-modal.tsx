"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coffee, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, StackedDialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { CAFE_PRIORITY_OPTIONS } from "@/lib/service-intake/cafe-priorities";
import {
  SERVICE_INTAKE_KANBAN_COLUMNS,
  SERVICE_INTAKE_STATUS_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_TONE,
  isServiceIntakeOverdue,
  serviceIntakeDueAt,
} from "@/lib/service-intake/sla";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS,
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeAttachment,
  type ServiceIntakeComment,
  type ServiceIntakeRecord,
  type ServiceIntakeStatus,
  type ServiceIntakeThread,
} from "@/lib/service-intake/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function cafeOption(priority: ServiceIntakeRecord["priority"]) {
  if (!priority) {
    return null;
  }
  return CAFE_PRIORITY_OPTIONS.find((entry) => entry.id === priority) ?? null;
}

function AttachmentList({ attachments }: { attachments: ServiceIntakeAttachment[] }) {
  if (!attachments.length) {
    return <p className="text-sm text-muted">Brak załączników.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-border/70 bg-surface-muted/15 p-3 text-sm hover:border-accent/30"
        >
          <p className="font-medium text-foreground">
            {attachment.label ?? attachment.kind.toUpperCase()}
          </p>
          <p className="mt-1 truncate text-xs text-muted">{attachment.url}</p>
        </a>
      ))}
    </div>
  );
}

function CommentThread({ comments }: { comments: ServiceIntakeComment[] }) {
  if (!comments.length) {
    return <p className="text-sm text-muted">Brak wiadomości w wątku.</p>;
  }

  return (
    <div className="grid gap-2">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            comment.authorSide === "team"
              ? "border-accent/30 bg-accent/10"
              : "border-border/70 bg-surface-muted/15",
          )}
        >
          <p className="text-xs text-muted">
            {comment.authorName} · {formatDateTime(comment.createdAt)}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{comment.body}</p>
        </article>
      ))}
    </div>
  );
}

export function ServiceIntakeDetailModal({
  intakeId,
  authorName,
  open,
  onOpenChange,
  onUpdated,
}: {
  intakeId: string | null;
  authorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (item: ServiceIntakeRecord) => void;
}) {
  const [thread, setThread] = useState<ServiceIntakeThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<ServiceIntakeStatus>("new");

  const loadThread = useCallback(async () => {
    if (!intakeId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać zgłoszenia.");
      }
      setThread(payload as ServiceIntakeThread);
      setStatusDraft((payload as ServiceIntakeThread).intake.status);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }, [intakeId]);

  useEffect(() => {
    if (open && intakeId) {
      void loadThread();
    } else if (!open) {
      setThread(null);
      setCommentDraft("");
      setError(null);
    }
  }, [intakeId, loadThread, open]);

  const intake = thread?.intake ?? null;
  const cafe = useMemo(() => cafeOption(intake?.priority ?? null), [intake?.priority]);
  const overdue = intake ? isServiceIntakeOverdue(intake) : false;
  const dueAt = intake ? serviceIntakeDueAt(intake.createdAt, intake.priority) : null;

  async function changeStatus(nextStatus: ServiceIntakeStatus) {
    if (!intakeId || !intake) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zmienić statusu.");
      }
      const updated = {
        ...intake,
        ...(payload.item as ServiceIntakeRecord),
        clientName: intake.clientName,
        projectName: intake.projectName,
      };
      setThread((current) => (current ? { ...current, intake: updated } : current));
      setStatusDraft(updated.status);
      onUpdated?.(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    if (!intakeId || !commentDraft.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(intakeId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commentDraft, authorName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać wiadomości.");
      }
      setThread((current) =>
        current
          ? { ...current, comments: [...current.comments, payload.comment as ServiceIntakeComment] }
          : current,
      );
      setCommentDraft("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StackedDialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="text-xl font-semibold">
            {intake?.referenceNumber ?? "Zgłoszenie serwisowe"}
          </DialogTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ładowanie zgłoszenia…
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {intake ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {cafe ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                    cafe.toneClass,
                  )}
                >
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", cafe.letterClass)}>
                    {cafe.letter}
                  </span>
                  CAFE · {cafe.title}
                  <Coffee className="h-4 w-4 opacity-80" />
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                  SERVICE_INTAKE_STATUS_BADGE_CLASS[SERVICE_INTAKE_STATUS_TONE[intake.status]],
                )}
              >
                {SERVICE_INTAKE_STATUS_LABELS[intake.status]}
              </span>
              {overdue ? (
                <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200">
                  Po terminie
                </span>
              ) : null}
            </div>

            <div className="grid gap-1 text-sm text-muted">
              <p>
                {intake.clientName ?? intake.contactFullName} · {intake.projectName ?? "Obiekt"}
              </p>
              <p>Zgłoszono: {formatDateTime(intake.createdAt)}</p>
              {dueAt ? <p>Termin reakcji: {formatDate(dueAt.slice(0, 10))}</p> : null}
              <p>{SERVICE_INTAKE_REQUEST_TYPE_LABELS[intake.requestType]} · {intake.serviceTypeHint}</p>
              {intake.priority ? <p>{SERVICE_INTAKE_PRIORITY_LABELS[intake.priority]}</p> : null}
              {intake.postWarrantyAction ? (
                <p>{SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS[intake.postWarrantyAction]}</p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Opis</p>
              <p className="whitespace-pre-wrap rounded-xl border border-border/70 bg-surface-muted/10 p-3 text-sm text-foreground">
                {intake.description}
              </p>
            </div>

            <Field label="Etap na tablicy">
              <div className="flex flex-wrap items-end gap-2">
                <Select
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value as ServiceIntakeStatus)}
                  className="min-w-[220px]"
                >
                  {SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => (
                    <option key={status} value={status}>
                      {SERVICE_INTAKE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  disabled={busy || statusDraft === intake.status}
                  onClick={() => void changeStatus(statusDraft)}
                >
                  Przenieś
                </Button>
              </div>
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Załączniki</p>
              <AttachmentList attachments={thread?.attachments ?? []} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Wątek</p>
              <CommentThread comments={thread?.comments ?? []} />
              {intake.status !== "closed" && intake.status !== "rejected" ? (
                <div className="mt-3 grid gap-2">
                  <Textarea
                    rows={3}
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Odpowiedź zespołu…"
                  />
                  <Button
                    type="button"
                    disabled={busy || !commentDraft.trim()}
                    onClick={() => void submitComment()}
                  >
                    Wyślij wiadomość
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button asChild variant="secondary">
                <Link href={`/zgloszenie/watek/${intake.trackingToken}`} target="_blank" rel="noreferrer">
                  Wątek publiczny
                  <ExternalLink className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/oferty/nowy">Utwórz ofertę</Link>
              </Button>
              {intake.status !== "closed" && intake.status !== "rejected" ? (
                <>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void changeStatus("closed")}>
                    Zamknij
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void changeStatus("rejected")}
                  >
                    Odrzuć
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </StackedDialogContent>
    </Dialog>
  );
}
