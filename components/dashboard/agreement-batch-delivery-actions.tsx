"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { isAgreementPendingAttention } from "@/lib/dashboard/agreement-types";

type TradeBatch = {
  tradeId: string;
  tradeName: string;
  tradeLabel: string;
  email: string;
  count: number;
};

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

export function AgreementBatchDeliveryActions({
  projectId,
  agreements,
  clientEmail,
}: {
  projectId: string;
  agreements: ProjectClientAgreement[];
  clientEmail?: string | null;
}) {
  const [tradeBatches, setTradeBatches] = useState<TradeBatch[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingAgreements = useMemo(
    () =>
      agreements.filter(
        (entry) => entry.status === "pending_client" && isAgreementPendingAttention(entry),
      ),
    [agreements],
  );

  useEffect(() => {
    if (!pendingAgreements.length) {
      setTradeBatches([]);
      return;
    }

    let cancelled = false;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = (await response.json()) as { tradeBatches?: TradeBatch[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Błąd pobierania podglądu wysyłki.");
        }
        if (!cancelled) {
          setTradeBatches(payload.tradeBatches ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTradeBatches([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pendingAgreements.length, projectId, agreements]);

  const runSend = async (
    key: string,
    payload: { scope: "client_all_pending" | "trade_pending"; tradeId?: string },
  ) => {
    setBusyKey(key);
    setError(null);
    setFeedback(null);
    try {
      const data = await postJson<{ subject?: string }>(
        `/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`,
        payload,
      );
      setFeedback(data.subject ? `Wysłano: ${data.subject}` : "E-mail wysłany.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Błąd wysyłki.");
    } finally {
      setBusyKey(null);
    }
  };

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
        `/api/projects/${encodeURIComponent(projectId)}/agreements/preview-email`,
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
        `/api/projects/${encodeURIComponent(projectId)}/agreements/preview-email`,
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
        `/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`,
        { scope: "client_all_pending", note },
      );
      setFeedback(data.subject ? `Wysłano: ${data.subject}` : "E-mail wysłany.");
      setPreviewOpen(false);
    } catch (sendError) {
      setPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSending(false);
    }
  }

  if (!pendingAgreements.length) {
    return null;
  }

  return (
    <div className="grid min-w-0 w-full gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Zbiorcza wysyłka ustaleń</p>
        <p className="mt-1 text-xs text-muted">
          Wyślij w jednym mailu HTML wszystkie oczekujące ustalenia ({pendingAgreements.length}) — z
          kosztami, przyciskami akceptacji i dyskusji oraz dopiskiem o wiążącym charakterze.
        </p>
      </div>

      <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
        {clientEmail?.trim() ? (
          <Button
            type="button"
            size="sm"
            className="h-auto w-full min-w-0 whitespace-normal text-left sm:w-auto"
            onClick={() => void handleOpenPreview()}
          >
            <Send className="mr-2 h-3.5 w-3.5 shrink-0" />
            Wszystkie oczekujące → klient ({pendingAgreements.length})
          </Button>
        ) : null}

        {tradeBatches.map((batch) =>
          batch.email ? (
            <Button
              key={batch.tradeId}
              type="button"
              size="sm"
              variant="secondary"
              className="h-auto w-full min-w-0 whitespace-normal text-left sm:w-auto"
              disabled={busyKey !== null}
              onClick={() =>
                void runSend(`trade-all-${batch.tradeId}`, {
                  scope: "trade_pending",
                  tradeId: batch.tradeId,
                })
              }
            >
              {busyKey === `trade-all-${batch.tradeId}` ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Send className="mr-2 h-3.5 w-3.5 shrink-0" />
              )}
              Wszystkie → {batch.tradeName} ({batch.count})
            </Button>
          ) : (
            <span key={batch.tradeId} className="text-xs text-muted">
              {batch.tradeName} ({batch.count}): brak e-maila wykonawcy
            </span>
          ),
        )}
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
