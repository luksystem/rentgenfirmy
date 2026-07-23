import type { ClientOfferStatus } from "@/lib/service/client-offer";
import type { ServiceRecord } from "@/lib/service/types";

export const CLIENT_OFFER_HISTORY_TYPES = [
  "link_generated",
  "link_regenerated",
  "client_accepted",
  "client_rejected",
  "client_negotiation",
  "auto_accepted",
] as const;

export type ClientOfferHistoryEntryType = (typeof CLIENT_OFFER_HISTORY_TYPES)[number];

export type ClientOfferHistoryEntry = {
  id: string;
  at: string;
  type: ClientOfferHistoryEntryType;
  message?: string | null;
  offerStatus?: ClientOfferStatus | null;
};

export const CLIENT_OFFER_HISTORY_LABELS: Record<ClientOfferHistoryEntryType, string> = {
  link_generated: "Wygenerowano link oferty",
  link_regenerated: "Wygenerowano nowy link oferty",
  client_accepted: "Klient zaakceptował ofertę",
  client_rejected: "Klient odrzucił ofertę",
  client_negotiation: "Klient prosi o negocjację",
  auto_accepted: "Automatycznie zaakceptowano po terminie",
};

export type ServiceOfferListTone =
  | "quote"
  | "pending"
  | "negotiation"
  | "accepted"
  | "rejected";

export function normalizeClientOfferHistory(value: unknown): ClientOfferHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ClientOfferHistoryEntry | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const type = row.type;

      if (
        typeof type !== "string" ||
        !CLIENT_OFFER_HISTORY_TYPES.includes(type as ClientOfferHistoryEntryType)
      ) {
        return null;
      }

      return {
        id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
        at: typeof row.at === "string" ? row.at : new Date().toISOString(),
        type: type as ClientOfferHistoryEntryType,
        message: typeof row.message === "string" ? row.message : null,
        offerStatus:
          typeof row.offerStatus === "string"
            ? (row.offerStatus as ClientOfferStatus)
            : null,
      };
    })
    .filter((entry): entry is ClientOfferHistoryEntry => entry !== null);
}

export function appendClientOfferHistory(
  history: ClientOfferHistoryEntry[],
  entry: Omit<ClientOfferHistoryEntry, "id" | "at"> & { at?: string; id?: string },
): ClientOfferHistoryEntry[] {
  return [
    ...history,
    {
      id: entry.id ?? crypto.randomUUID(),
      at: entry.at ?? new Date().toISOString(),
      type: entry.type,
      message: entry.message ?? null,
      offerStatus: entry.offerStatus ?? null,
    },
  ];
}

export type SettlementOfferHistoryEntry = ClientOfferHistoryEntry;

export const SETTLEMENT_OFFER_HISTORY_TYPES = CLIENT_OFFER_HISTORY_TYPES;

export const SETTLEMENT_OFFER_HISTORY_LABELS: Record<ClientOfferHistoryEntryType, string> = {
  link_generated: "Wygenerowano link rozliczenia",
  link_regenerated: "Wygenerowano nowy link rozliczenia",
  client_accepted: "Klient zaakceptował rozliczenie",
  client_rejected: "Klient odrzucił rozliczenie",
  client_negotiation: "Klient prosi o konsultację rozliczenia",
  auto_accepted: "Automatycznie zaakceptowano po terminie — brak reakcji klienta",
};

export const normalizeSettlementOfferHistory = normalizeClientOfferHistory;

export function appendSettlementOfferHistory(
  history: SettlementOfferHistoryEntry[],
  entry: Omit<SettlementOfferHistoryEntry, "id" | "at"> & { at?: string; id?: string },
): SettlementOfferHistoryEntry[] {
  return appendClientOfferHistory(history, entry);
}

export function getServiceOfferListTone(service: ServiceRecord): ServiceOfferListTone | null {
  // Workflow ma pierwszeństwo przy wycofaniu oferty — nie pokazuj „Oczekuje na klienta”.
  if (service.status === "Wycena") {
    return "quote";
  }
  if (service.status === "Anulowany") {
    return "rejected";
  }

  const offerStatus = service.clientOffer.status;

  if (offerStatus === "accepted") {
    return "accepted";
  }

  if (offerStatus === "rejected") {
    return "rejected";
  }

  if (service.status === "Oczekuje na klienta" && offerStatus === "negotiation") {
    return "negotiation";
  }

  if (service.status === "Oczekuje na klienta" && offerStatus === "pending") {
    return "pending";
  }

  return null;
}

export function serviceOfferListRowClassName(tone: ServiceOfferListTone | null) {
  switch (tone) {
    case "quote":
      return "bg-sky-500/8 hover:bg-sky-500/12";
    case "pending":
      return "bg-amber-500/10 hover:bg-amber-500/15";
    case "negotiation":
      return "bg-orange-500/10 hover:bg-orange-500/15";
    case "accepted":
      return "bg-emerald-500/10 hover:bg-emerald-500/15";
    case "rejected":
      return "bg-rose-500/10 hover:bg-rose-500/15";
    default:
      return "hover:bg-surface-muted/50";
  }
}

export function serviceOfferListCardClassName(tone: ServiceOfferListTone | null) {
  switch (tone) {
    case "quote":
      return "border-sky-500/25 bg-sky-500/8";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10";
    case "negotiation":
      return "border-orange-500/30 bg-orange-500/10";
    case "accepted":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "rejected":
      return "border-rose-500/30 bg-rose-500/10";
    default:
      return "border-border/80 bg-surface";
  }
}

export function serviceOfferListBadge(tone: ServiceOfferListTone | null) {
  switch (tone) {
    case "quote":
      return { label: "Wycena", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
    case "pending":
      return {
        label: "Oczekuje na klienta",
        className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      };
    case "negotiation":
      return {
        label: "Negocjacja",
        className: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
      };
    case "accepted":
      return {
        label: "Zaakceptowana",
        className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
      };
    case "rejected":
      return { label: "Odrzucona", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" };
    default:
      return null;
  }
}
