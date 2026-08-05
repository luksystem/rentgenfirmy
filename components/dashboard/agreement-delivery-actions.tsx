"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import { buildTradeDeliveryLinks } from "@/lib/dashboard/agreement-delivery";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { AgreementApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import type { ProjectTrade } from "@/lib/dashboard/trade-types";
import { fetchAgreementApproverRoles } from "@/lib/supabase/project-agreement-collaboration-repository";

type EmailPreview = { subject: string; html: string; to: string; hasPhoto?: boolean };

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

export function AgreementDeliveryActions({
  projectId,
  agreement,
  trades,
  clientEmail,
}: {
  projectId: string;
  agreement: ProjectClientAgreement;
  trades: ProjectTrade[];
  clientEmail?: string | null;
}) {
  const [roles, setRoles] = useState<AgreementApproverRole[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [includePhoto, setIncludePhoto] = useState(true);
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (agreement.status !== "pending_client") {
      setRoles([]);
      return;
    }

    let cancelled = false;
    void fetchAgreementApproverRoles(agreement.id)
      .then((entries) => {
        if (!cancelled) {
          setRoles(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agreement.id, agreement.status, agreement.updatedAt]);

  const tradeLinks = useMemo(
    () => buildTradeDeliveryLinks(agreement, roles, trades),
    [agreement, roles, trades],
  );

  const runSend = useCallback(
    async (key: string, payload: { scope: "single_trade"; agreementId: string; tradeId: string }) => {
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
    },
    [projectId],
  );

  async function handleOpenPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    setError(null);
    setFeedback(null);
    setPreviewError(null);
    setPreview(null);
    setNote("");
    setIncludePhoto(true);
    setPreviewOpen(true);
    try {
      const data = await postJson<EmailPreview>(
        `/api/projects/${encodeURIComponent(projectId)}/agreements/preview-email`,
        { scope: "single", agreementId: agreement.id, includePhoto: true },
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
        { scope: "single", agreementId: agreement.id, note: nextNote, includePhoto },
      )
        .then((data) => setPreview(data))
        .catch(() => undefined);
    }, 600);
  }

  function handleIncludePhotoChange(next: boolean) {
    setIncludePhoto(next);
    void postJson<EmailPreview>(
      `/api/projects/${encodeURIComponent(projectId)}/agreements/preview-email`,
      { scope: "single", agreementId: agreement.id, note, includePhoto: next },
    )
      .then((data) => setPreview(data))
      .catch(() => undefined);
  }

  async function handleConfirmSend() {
    setSending(true);
    setPreviewError(null);
    try {
      const data = await postJson<{ subject?: string }>(
        `/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`,
        { scope: "single", agreementId: agreement.id, note, includePhoto },
      );
      setFeedback(data.subject ? `Wysłano: ${data.subject}` : "E-mail wysłany.");
      setPreviewOpen(false);
    } catch (sendError) {
      setPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSending(false);
    }
  }

  if (agreement.status !== "pending_client") {
    return null;
  }

  if (!tradeLinks.length && !clientEmail?.trim()) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
      <p className="text-xs font-medium text-foreground">Wyślij ustalenie e-mailem</p>
      <p className="text-xs text-muted">
        Mail zawiera koszty, notatkę do kosztów, przyciski akceptacji i dyskusji oraz informację o wiążącym
        charakterze ustaleń.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {clientEmail?.trim() ? (
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => void handleOpenPreview()}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            Wyślij do klienta
          </Button>
        ) : null}

        {tradeLinks.map((entry) => (
          <div key={entry.roleLabel} className="flex flex-col gap-1 sm:flex-row sm:items-center">
            {entry.trade.email.trim() ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busyKey !== null}
                onClick={() =>
                  void runSend(`trade-${entry.trade.id}`, {
                    scope: "single_trade",
                    tradeId: entry.trade.id,
                    agreementId: agreement.id,
                  })
                }
              >
                {busyKey === `trade-${entry.trade.id}` ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-3.5 w-3.5" />
                )}
                HTML: {entry.trade.name}
              </Button>
            ) : (
              <span className="text-xs text-muted">{entry.trade.name}: brak e-maila wykonawcy</span>
            )}
            {entry.mailtoUrl ? (
              <Button type="button" size="sm" variant="ghost" className="w-full sm:w-auto" asChild>
                <a href={entry.mailtoUrl}>
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  Poczta
                </a>
              </Button>
            ) : null}
          </div>
        ))}
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
        selection={
          preview?.hasPhoto ? (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={includePhoto}
                disabled={sending}
                onChange={(event) => handleIncludePhotoChange(event.target.checked)}
              />
              Dołącz zdjęcie z ustalenia do treści maila
            </label>
          ) : undefined
        }
      />
    </div>
  );
}
