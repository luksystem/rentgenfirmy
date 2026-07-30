"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import { isChangeRequestPendingAttention, type ProjectChangeRequest } from "@/lib/dashboard/change-request-types";

type EmailPreview = { subject: string; html: string; to: string };

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

  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleOpenPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    setError(null);
    setFeedback(null);
    setPreviewError(null);
    setPreview(null);
    setNote("");
    setPreviewOpen(true);
    try {
      const data = await postJson<EmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/preview-email`,
        { scope: "client_all_pending" },
      );
      setPreview(data);
    } catch (loadError) {
      setPreviewError(
        loadError instanceof Error ? loadError.message : "Nie udało się przygotować podglądu.",
      );
    }
  }

  function handleNoteChange(nextNote: string) {
    setNote(nextNote);
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    noteDebounceRef.current = setTimeout(() => {
      void postJson<EmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/preview-email`,
        { scope: "client_all_pending", note: nextNote },
      )
        .then((data) => setPreview(data))
        .catch(() => undefined);
    }, 600);
  }

  async function handleConfirmSend() {
    setSending(true);
    setPreviewError(null);
    try {
      const data = await postJson<{ subject?: string }>(
        `/api/projects/${encodeURIComponent(projectId)}/change-requests/send-email`,
        { scope: "client_all_pending", note },
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

  if (!pending.length || !clientEmail?.trim()) {
    return null;
  }

  return (
    <div className="grid min-w-0 w-full gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Zbiorcza wysyłka zmian</p>
        <p className="mt-1 text-xs text-muted">
          Wyślij w jednym mailu wszystkie oczekujące zmiany ({pending.length}) — z kosztami i
          przyciskiem do decyzji dla każdej.
        </p>
      </div>

      <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="sm"
          className="h-auto w-full min-w-0 whitespace-normal text-left sm:w-auto"
          onClick={() => void handleOpenPreview()}
        >
          <Send className="mr-2 h-3.5 w-3.5 shrink-0" />
          Wszystkie oczekujące → klient ({pending.length})
        </Button>
      </div>

      {feedback ? <p className="text-xs text-emerald-300">{feedback}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <OfferEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        sending={sending}
        error={previewError}
        note={note}
        onNoteChange={handleNoteChange}
        onConfirmSend={() => void handleConfirmSend()}
      />
    </div>
  );
}
