"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CLIENT_OFFER_HISTORY_LABELS,
  SETTLEMENT_OFFER_HISTORY_LABELS,
  type ClientOfferHistoryEntry,
} from "@/lib/service/client-offer-history";
import {
  OFFER_APPROVAL_HISTORY_LABELS,
  type OfferApprovalHistoryEntry,
} from "@/lib/service/offer-approval";
import type { ServiceRecord } from "@/lib/service/types";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { cn, formatDate } from "@/lib/utils";

type HistoryItem = {
  id: string;
  at: string;
  label: string;
  kindLabel: "Wycena" | "Rozliczenie";
  detail?: string | null;
  tone: "accepted" | "rejected" | "negotiation" | "link" | "approval" | "default";
};

function toneClass(tone: HistoryItem["tone"]) {
  switch (tone) {
    case "accepted":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "rejected":
      return "border-rose-500/30 bg-rose-500/10";
    case "negotiation":
      return "border-orange-500/30 bg-orange-500/10";
    case "link":
      return "border-sky-500/25 bg-sky-500/8";
    case "approval":
      return "border-violet-500/25 bg-violet-500/8";
    default:
      return "border-border/80 bg-surface-muted/40";
  }
}

function clientHistoryTone(type: ClientOfferHistoryEntry["type"]): HistoryItem["tone"] {
  switch (type) {
    case "client_accepted":
    case "auto_accepted":
      return "accepted";
    case "client_rejected":
      return "rejected";
    case "client_negotiation":
      return "negotiation";
    case "link_generated":
    case "link_regenerated":
      return "link";
    default:
      return "default";
  }
}

function approvalHistoryTone(type: OfferApprovalHistoryEntry["type"]): HistoryItem["tone"] {
  return type === "sent" ? "link" : "approval";
}

function buildClientItems(
  entries: ClientOfferHistoryEntry[],
  kindLabel: "Wycena" | "Rozliczenie",
  labels: Record<ClientOfferHistoryEntry["type"], string>,
): HistoryItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    at: entry.at,
    label: labels[entry.type],
    kindLabel,
    detail: entry.message,
    tone: clientHistoryTone(entry.type),
  }));
}

function buildApprovalItems(
  entries: OfferApprovalHistoryEntry[],
  kindLabel: "Wycena" | "Rozliczenie",
  profileNameById: Map<string, string>,
): HistoryItem[] {
  return entries.map((entry) => {
    const actorName = entry.actorId ? profileNameById.get(entry.actorId) ?? null : null;
    const detailParts = [
      actorName ? (entry.type === "question_asked" ? `Pytanie od ${actorName}` : `Wykonał: ${actorName}`) : null,
      entry.note?.trim() || null,
    ].filter((part): part is string => Boolean(part));

    return {
      id: entry.id,
      at: entry.at,
      label: OFFER_APPROVAL_HISTORY_LABELS[entry.type],
      kindLabel,
      detail: detailParts.length > 0 ? detailParts.join(" — ") : null,
      tone: approvalHistoryTone(entry.type),
    };
  });
}

export function ClientOfferHistoryPanel({ service }: { service: ServiceRecord }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchTeamProfiles()
      .then((data) => {
        if (!cancelled) {
          setProfiles(data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const profileNameById = new Map(profiles.map((profile) => [profile.id, getUserDisplayName(profile)]));

  const history: HistoryItem[] = [
    ...buildClientItems(service.clientOfferHistory, "Wycena", CLIENT_OFFER_HISTORY_LABELS),
    ...buildClientItems(service.settlementOfferHistory, "Rozliczenie", SETTLEMENT_OFFER_HISTORY_LABELS),
    ...buildApprovalItems(service.estimateApproval.history, "Wycena", profileNameById),
    ...buildApprovalItems(service.settlementApproval.history, "Rozliczenie", profileNameById),
  ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/80">
      <CardContent className="grid gap-3 py-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Historia oferty</h3>
          <p className="mt-1 text-sm text-muted">
            Zgłoszenia do akceptacji, decyzje administratora, wysyłki oraz odpowiedzi klienta —
            dla wyceny i rozliczenia.
          </p>
        </div>

        <ol className="grid gap-2">
          {history.map((entry) => (
            <li
              key={entry.id}
              className={cn("rounded-xl border px-3 py-2.5 text-sm", toneClass(entry.tone))}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">
                  <span className="text-muted">{entry.kindLabel}:</span> {entry.label}
                </p>
                <time className="text-xs text-muted">{formatDate(entry.at)}</time>
              </div>
              {entry.detail ? (
                <p className="mt-2 whitespace-pre-wrap text-muted">{entry.detail}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
