"use client";

import { useMemo, useRef, useState } from "react";
import { Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import { isChangeRequestPendingAttention, type ProjectChangeRequest } from "@/lib/dashboard/change-request-types";

type EmailPreview = { subject: string; html: string; to: string };
type BatchScope = "reminder" | "new_batch";

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

export function ChangeRequestBatchDeliveryActions({
  projectId,
  changeRequests,
  clientEmail,
  onSent,
}: {
  projectId: string;
  changeRequests: ProjectChangeRequest[];
  clientEmail?: string | null;
  onSent?: () => void | Promise<void>;
}) {
  const pending = changeRequests.filter(
    (entry) => entry.status === "pending_client" && isChangeRequestPendingAttention(entry),
  );
  // Paczka obejmuje też szkice (jeszcze nigdy nie wysłane klientowi wcale) — wysyłka w paczce jest
  // ich pierwszym zgłoszeniem, razem z tymi już zgłoszonymi pojedynczo, ale nigdy nie ujętymi
  // w paczce/przypomnieniu.
  const neverSent = changeRequests.filter(
    (entry) => entry.status === "draft" || (entry.status === "pending_client" && !entry.sentAt),
  );
  const alreadySent = pending.filter((entry) => entry.sentAt);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [scope, setScope] = useState<BatchScope | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadPreview(nextScope: BatchScope, ids: Set<string>, currentNote: string) {
    setPreviewError(null);
    setPreview(null);
    try {
      const data = await postJson<EmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/preview-email`,
        {
          scope: nextScope,
          changeRequestIds: nextScope === "new_batch" ? [...ids] : undefined,
          note: currentNote,
        },
      );
      setPreview(data);
    } catch (loadError) {
      setPreviewError(
        loadError instanceof Error ? loadError.message : "Nie udało się przygotować podglądu.",
      );
    }
  }

  function handleOpenReminderPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    setFeedback(null);
    setNote("");
    setScope("reminder");
    setPreviewOpen(true);
    void loadPreview("reminder", new Set(), "");
  }

  function handleOpenNewBatchPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    const allIds = new Set(neverSent.map((entry) => entry.id));
    setFeedback(null);
    setNote("");
    setSelectedIds(allIds);
    setScope("new_batch");
    setPreviewOpen(true);
    void loadPreview("new_batch", allIds, "");
  }

  function handleToggleSelected(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    void loadPreview("new_batch", next, note);
  }

  function handleNoteChange(nextNote: string) {
    setNote(nextNote);
    if (!scope) {
      return;
    }
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    noteDebounceRef.current = setTimeout(() => {
      void loadPreview(scope, selectedIds, nextNote);
    }, 600);
  }

  async function handleConfirmSend() {
    if (!scope) {
      return;
    }
    setSending(true);
    setPreviewError(null);
    try {
      const data = await postJson<{ subject?: string }>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/send-email`,
        {
          scope,
          changeRequestIds: scope === "new_batch" ? [...selectedIds] : undefined,
          note,
        },
      );
      setFeedback(data.subject ? `Wysłano: ${data.subject}` : "E-mail wysłany.");
      setPreviewOpen(false);
      await onSent?.();
    } catch (sendError) {
      setPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSending(false);
    }
  }

  const selectionSlot = useMemo(() => {
    if (scope !== "new_batch") {
      return null;
    }
    return (
      <div className="grid gap-1.5 rounded-xl border border-border/70 bg-surface-muted/25 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Zmiany do wysłania ({selectedIds.size}/{neverSent.length})
        </p>
        {neverSent.map((entry) => (
          <label key={entry.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selectedIds.has(entry.id)}
              disabled={sending}
              onChange={() => handleToggleSelected(entry.id)}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {entry.title}
              {entry.status === "draft" ? (
                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Szkic
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, neverSent, selectedIds, sending]);

  if ((!neverSent.length && !alreadySent.length) || !clientEmail?.trim()) {
    return null;
  }

  return (
    <div className="grid min-w-0 w-full gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Zbiorcza wysyłka zmian</p>
        <p className="mt-1 text-xs text-muted">
          Wyślij w jednym mailu zmiany oczekujące na akceptację — z kosztami i przyciskiem do decyzji
          dla każdej.
        </p>
      </div>

      <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
        {neverSent.length ? (
          <Button
            type="button"
            size="sm"
            className="h-auto w-full min-w-0 whitespace-normal text-left sm:w-auto"
            onClick={handleOpenNewBatchPreview}
          >
            <Send className="mr-2 h-3.5 w-3.5 shrink-0" />
            Wyślij paczkę do akceptacji ({neverSent.length})
          </Button>
        ) : null}
        {alreadySent.length ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-auto w-full min-w-0 whitespace-normal text-left sm:w-auto"
            onClick={handleOpenReminderPreview}
          >
            <Bell className="mr-2 h-3.5 w-3.5 shrink-0" />
            Przypomnij o akceptacjach ({alreadySent.length})
          </Button>
        ) : null}
      </div>

      {feedback ? <p className="text-xs text-emerald-300">{feedback}</p> : null}

      <OfferEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        sending={sending}
        error={previewError}
        note={note}
        onNoteChange={handleNoteChange}
        onConfirmSend={() => void handleConfirmSend()}
        confirmDisabled={scope === "new_batch" && selectedIds.size === 0}
        selection={selectionSlot}
      />
    </div>
  );
}
