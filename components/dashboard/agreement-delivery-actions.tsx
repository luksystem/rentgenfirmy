"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildAgreementClientMailtoUrl,
  buildTradeDeliveryLinks,
} from "@/lib/dashboard/agreement-delivery";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { AgreementApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import type { ProjectTrade } from "@/lib/dashboard/trade-types";
import { fetchAgreementApproverRoles } from "@/lib/supabase/project-agreement-collaboration-repository";

async function sendAgreementEmail(
  projectId: string,
  payload: {
    scope: "single" | "single_trade" | "trade_pending" | "client_all_pending";
    agreementId?: string;
    tradeId?: string;
  },
) {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/agreements/send-email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { error?: string; subject?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Nie udało się wysłać e-maila.");
  }
  return data;
}

export function AgreementDeliveryActions({
  projectId,
  agreement,
  trades,
  clientEmail,
  clientName,
}: {
  projectId: string;
  agreement: ProjectClientAgreement;
  trades: ProjectTrade[];
  clientEmail?: string | null;
  clientName?: string | null;
}) {
  const [roles, setRoles] = useState<AgreementApproverRole[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const clientMailto = useMemo(() => {
    if (!clientEmail?.trim()) {
      return null;
    }
    return buildAgreementClientMailtoUrl({
      agreement,
      clientEmail,
      clientName: clientName ?? undefined,
    });
  }, [agreement, clientEmail, clientName]);

  const runSend = useCallback(
    async (key: string, payload: {
      scope: "single" | "single_trade" | "trade_pending" | "client_all_pending";
      agreementId?: string;
      tradeId?: string;
    }) => {
      setBusyKey(key);
      setError(null);
      setFeedback(null);
      try {
        const result = await sendAgreementEmail(projectId, payload);
        setFeedback(result.subject ? `Wysłano: ${result.subject}` : "E-mail wysłany.");
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "Błąd wysyłki.");
      } finally {
        setBusyKey(null);
      }
    },
    [projectId],
  );

  if (agreement.status !== "pending_client") {
    return null;
  }

  if (!tradeLinks.length && !clientMailto) {
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
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={busyKey !== null}
            onClick={() =>
              void runSend("client", { scope: "single", agreementId: agreement.id })
            }
          >
            {busyKey === "client" ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-2 h-3.5 w-3.5" />
            )}
            Wyślij HTML do klienta
          </Button>
        ) : null}

        {clientMailto ? (
          <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" asChild>
            <a href={clientMailto}>
              <Mail className="mr-2 h-3.5 w-3.5" />
              Kopia w kliencie poczty
            </a>
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
    </div>
  );
}
