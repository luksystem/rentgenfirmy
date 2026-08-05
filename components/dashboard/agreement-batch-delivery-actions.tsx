"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Loader2, Send } from "lucide-react";
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

type EmailPreview = { subject: string; html: string; to: string; hasPhoto?: boolean };
type ClientScope = "reminder" | "new_batch";

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
  onSent,
}: {
  projectId: string;
  agreements: ProjectClientAgreement[];
  clientEmail?: string | null;
  onSent?: () => void | Promise<void>;
}) {
  const [tradeBatches, setTradeBatches] = useState<TradeBatch[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<ClientScope | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includePhoto, setIncludePhoto] = useState(true);
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingAgreements = useMemo(
    () =>
      agreements.filter(
        (entry) => entry.status === "pending_client" && isAgreementPendingAttention(entry),
      ),
    [agreements],
  );
  const neverSent = useMemo(
    () => pendingAgreements.filter((entry) => !entry.sentAt),
    [pendingAgreements],
  );
  const alreadySent = useMemo(
    () => pendingAgreements.filter((entry) => entry.sentAt),
    [pendingAgreements],
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
    payload: { scope: "trade_pending"; tradeId?: string },
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

  async function loadPreview(
    nextScope: ClientScope,
    ids: Set<string>,
    currentNote: string,
    nextIncludePhoto: boolean,
  ) {
    setPreviewError(null);
    setPreview(null);
    try {
      const data = await postJson<EmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/agreements/preview-email`,
        {
          scope: nextScope,
          agreementIds: nextScope === "new_batch" ? [...ids] : undefined,
          note: currentNote,
          includePhoto: nextIncludePhoto,
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
    setError(null);
    setFeedback(null);
    setNote("");
    setIncludePhoto(true);
    setScope("reminder");
    setPreviewOpen(true);
    void loadPreview("reminder", new Set(), "", true);
  }

  function handleOpenNewBatchPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    const allIds = new Set(neverSent.map((entry) => entry.id));
    setError(null);
    setFeedback(null);
    setNote("");
    setIncludePhoto(true);
    setSelectedIds(allIds);
    setScope("new_batch");
    setPreviewOpen(true);
    void loadPreview("new_batch", allIds, "", true);
  }

  function handleToggleSelected(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    void loadPreview("new_batch", next, note, includePhoto);
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
      void loadPreview(scope, selectedIds, nextNote, includePhoto);
    }, 600);
  }

  function handleIncludePhotoChange(next: boolean) {
    setIncludePhoto(next);
    if (!scope) {
      return;
    }
    void loadPreview(scope, selectedIds, note, next);
  }

  async function handleConfirmSend() {
    if (!scope) {
      return;
    }
    setSending(true);
    setPreviewError(null);
    try {
      const data = await postJson<{ subject?: string }>(
        `/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`,
        {
          scope,
          agreementIds: scope === "new_batch" ? [...selectedIds] : undefined,
          note,
          includePhoto,
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
    const photoCheckbox = preview?.hasPhoto ? (
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={includePhoto}
          disabled={sending}
          onChange={(event) => handleIncludePhotoChange(event.target.checked)}
        />
        Dołącz zdjęcie z pierwszego ustalenia do treści maila
      </label>
    ) : null;

    if (scope !== "new_batch") {
      return photoCheckbox;
    }

    return (
      <div className="grid gap-2">
        <div className="grid gap-1.5 rounded-xl border border-border/70 bg-surface-muted/25 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Ustalenia do wysłania ({selectedIds.size}/{neverSent.length})
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
              <span className="min-w-0 flex-1 truncate text-foreground">{entry.title}</span>
            </label>
          ))}
        </div>
        {photoCheckbox}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, neverSent, selectedIds, sending, preview?.hasPhoto, includePhoto]);

  if ((!neverSent.length && !alreadySent.length && !tradeBatches.length) || !clientEmail?.trim()) {
    return null;
  }

  return (
    <div className="grid min-w-0 w-full gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Zbiorcza wysyłka ustaleń</p>
        <p className="mt-1 text-xs text-muted">
          Wyślij w jednym mailu HTML oczekujące ustalenia — z kosztami, przyciskami akceptacji i
          dyskusji oraz dopiskiem o wiążącym charakterze.
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
        confirmDisabled={scope === "new_batch" && selectedIds.size === 0}
        selection={selectionSlot}
      />
    </div>
  );
}
