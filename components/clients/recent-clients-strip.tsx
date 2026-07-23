"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { formatPartyName } from "@/lib/party/display-name";
import type { Client } from "@/lib/service/types";

export function RecentClientsStrip({
  clients,
  recentClientIds,
}: {
  clients: Client[];
  recentClientIds: string[];
}) {
  const byId = new Map(clients.map((client) => [client.id, client]));
  const recentClients = recentClientIds
    .map((id) => byId.get(id))
    .filter((client): client is Client => Boolean(client));

  if (recentClients.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <History className="h-3.5 w-3.5" />
        Ostatnio otwierani
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recentClients.map((client) => (
          <Link
            key={client.id}
            href={`/przestrzenie/klient/${client.id}`}
            className="inline-flex shrink-0 flex-col rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm transition hover:border-accent/40"
          >
            <span className="font-medium text-foreground">{formatPartyName(client)}</span>
            {client.location ? (
              <span className="text-xs text-muted">{client.location}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
