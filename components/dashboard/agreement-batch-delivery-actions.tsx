"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildAgreementClientBatchMailtoUrl,
} from "@/lib/dashboard/agreement-delivery";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { isAgreementPendingAttention } from "@/lib/dashboard/agreement-types";

type TradeBatch = {
  tradeId: string;
  tradeName: string;
  tradeLabel: string;
  email: string;
  count: number;
};

export function AgreementBatchDeliveryActions({
  projectId,
  agreements,
  clientEmail,
  clientName,
  projectName,
}: {
  projectId: string;
  agreements: ProjectClientAgreement[];
  clientEmail?: string | null;
  clientName?: string | null;
  projectName?: string | null;
}) {
  const [tradeBatches, setTradeBatches] = useState<TradeBatch[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const clientBatchMailto = useMemo(() => {
    if (!clientEmail?.trim() || !pendingAgreements.length) {
      return null;
    }
    return buildAgreementClientBatchMailtoUrl({
      agreements: pendingAgreements,
      clientEmail,
      clientName: clientName ?? undefined,
      projectName: projectName ?? undefined,
    });
  }, [clientEmail, clientName, pendingAgreements, projectName]);

  const runSend = useCallback(
    async (
      key: string,
      payload: { scope: "client_all_pending" | "trade_pending"; tradeId?: string },
    ) => {
      setBusyKey(key);
      setError(null);
      setFeedback(null);
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = (await response.json()) as { error?: string; subject?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Nie udało się wysłać e-maila.");
        }
        setFeedback(data.subject ? `Wysłano: ${data.subject}` : "E-mail wysłany.");
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "Błąd wysyłki.");
      } finally {
        setBusyKey(null);
      }
    },
    [projectId],
  );

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
            disabled={busyKey !== null}
            onClick={() => void runSend("client-all", { scope: "client_all_pending" })}
          >
            {busyKey === "client-all" ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Send className="mr-2 h-3.5 w-3.5 shrink-0" />
            )}
            Wszystkie oczekujące → klient ({pendingAgreements.length})
          </Button>
        ) : null}

        {clientBatchMailto ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-auto w-full min-w-0 whitespace-normal text-left sm:w-auto"
            asChild
          >
            <a href={clientBatchMailto}>Kopia zbiorcza w kliencie poczty</a>
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
    </div>
  );
}
