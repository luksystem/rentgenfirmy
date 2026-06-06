"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  CLIENT_OFFER_HISTORY_LABELS,
  type ClientOfferHistoryEntry,
} from "@/lib/service/client-offer-history";
import type { ServiceRecord } from "@/lib/service/types";
import { cn, formatDate } from "@/lib/utils";

function historyEntryClass(type: ClientOfferHistoryEntry["type"]) {
  switch (type) {
    case "client_accepted":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "client_rejected":
      return "border-rose-500/30 bg-rose-500/10";
    case "client_negotiation":
      return "border-orange-500/30 bg-orange-500/10";
    case "link_generated":
    case "link_regenerated":
      return "border-sky-500/25 bg-sky-500/8";
    default:
      return "border-border/80 bg-surface-muted/40";
  }
}

export function ClientOfferHistoryPanel({ service }: { service: ServiceRecord }) {
  const history = [...service.clientOfferHistory].sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
  );

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/80">
      <CardContent className="grid gap-3 py-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Historia oferty</h3>
          <p className="mt-1 text-sm text-muted">
            Linki wysłane do klienta oraz jego odpowiedzi (akceptacja, odrzucenie, negocjacja).
          </p>
        </div>

        <ol className="grid gap-2">
          {history.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm",
                historyEntryClass(entry.type),
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">
                  {CLIENT_OFFER_HISTORY_LABELS[entry.type]}
                </p>
                <time className="text-xs text-muted">{formatDate(entry.at)}</time>
              </div>
              {entry.message ? (
                <p className="mt-2 whitespace-pre-wrap text-muted">{entry.message}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
