"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildAgreementClientMailtoUrl,
  buildTradeDeliveryLinks,
} from "@/lib/dashboard/agreement-delivery";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { AgreementApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import type { ProjectTrade } from "@/lib/dashboard/trade-types";
import { fetchAgreementApproverRoles } from "@/lib/supabase/project-agreement-collaboration-repository";

export function AgreementDeliveryActions({
  agreement,
  trades,
  clientEmail,
  clientName,
}: {
  agreement: ProjectClientAgreement;
  trades: ProjectTrade[];
  clientEmail?: string | null;
  clientName?: string | null;
}) {
  const [roles, setRoles] = useState<AgreementApproverRole[]>([]);

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

  if (agreement.status !== "pending_client") {
    return null;
  }

  if (!tradeLinks.length && !clientMailto) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
      <p className="text-xs font-medium text-foreground">Wyślij ustalenie e-mailem</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {clientMailto ? (
          <Button type="button" size="sm" variant="secondary" className="w-full sm:w-auto" asChild>
            <a href={clientMailto}>
              <Mail className="mr-2 h-3.5 w-3.5" />
              Do klienta
            </a>
          </Button>
        ) : null}
        {tradeLinks.map((entry) =>
          entry.mailtoUrl ? (
            <Button
              key={entry.roleLabel}
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              asChild
            >
              <a href={entry.mailtoUrl}>
                <Mail className="mr-2 h-3.5 w-3.5" />
                {entry.trade.name}
              </a>
            </Button>
          ) : (
            <span key={entry.roleLabel} className="text-xs text-muted">
              {entry.trade.name}: brak e-maila wykonawcy
            </span>
          ),
        )}
      </div>
    </div>
  );
}
