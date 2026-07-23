import { isAdministratorRole, type UserProfile } from "@/lib/auth/types";

export const OFFER_APPROVAL_STATUSES = ["pending", "approved", "question"] as const;
export type OfferApprovalStatus = (typeof OFFER_APPROVAL_STATUSES)[number];

export type OfferKind = "estimate" | "settlement";

export const OFFER_APPROVAL_HISTORY_TYPES = [
  "requested",
  "approved",
  "question_asked",
  "sent",
] as const;
export type OfferApprovalHistoryEntryType = (typeof OFFER_APPROVAL_HISTORY_TYPES)[number];

export type OfferApprovalHistoryEntry = {
  id: string;
  at: string;
  type: OfferApprovalHistoryEntryType;
  actorId: string | null;
  note?: string | null;
};

export type OfferApprovalState = {
  status: OfferApprovalStatus | null;
  requestedBy: string | null;
  assignedAdminId: string | null;
  note: string;
  history: OfferApprovalHistoryEntry[];
};

export function emptyOfferApprovalState(): OfferApprovalState {
  return { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] };
}

export function normalizeOfferApprovalHistory(value: unknown): OfferApprovalHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): OfferApprovalHistoryEntry | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const type = row.type;

      if (
        typeof type !== "string" ||
        !OFFER_APPROVAL_HISTORY_TYPES.includes(type as OfferApprovalHistoryEntryType)
      ) {
        return null;
      }

      return {
        id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
        at: typeof row.at === "string" ? row.at : new Date().toISOString(),
        type: type as OfferApprovalHistoryEntryType,
        actorId: typeof row.actorId === "string" ? row.actorId : null,
        note: typeof row.note === "string" ? row.note : null,
      };
    })
    .filter((entry): entry is OfferApprovalHistoryEntry => entry !== null);
}

export function appendOfferApprovalHistory(
  history: OfferApprovalHistoryEntry[],
  entry: Omit<OfferApprovalHistoryEntry, "id" | "at"> & { at?: string; id?: string },
): OfferApprovalHistoryEntry[] {
  return [
    ...history,
    {
      id: entry.id ?? crypto.randomUUID(),
      at: entry.at ?? new Date().toISOString(),
      type: entry.type,
      actorId: entry.actorId ?? null,
      note: entry.note ?? null,
    },
  ];
}

/** Administrator zawsze pomija akceptację; inni — chyba że mają nadaną flagę bypass. */
export function requiresOfferApproval(
  profile: Pick<UserProfile, "role" | "offerApprovalBypass">,
): boolean {
  return !isAdministratorRole(profile.role) && !profile.offerApprovalBypass;
}

function canActOnOwnApproval(approval: OfferApprovalState, actingProfileId: string) {
  return approval.status === "approved" && approval.requestedBy === actingProfileId;
}

/** Czy dana osoba może wygenerować link / wysłać ofertę lub rozliczenie do klienta teraz. */
export function canGenerateOrSendOffer(
  approval: OfferApprovalState,
  actingProfile: Pick<UserProfile, "id" | "role" | "offerApprovalBypass">,
): boolean {
  if (!requiresOfferApproval(actingProfile)) {
    return true;
  }
  return canActOnOwnApproval(approval, actingProfile.id);
}

export function getOfferApprovalBlockReason(
  approval: OfferApprovalState,
  actingProfile: Pick<UserProfile, "id" | "role" | "offerApprovalBypass">,
): string | null {
  if (canGenerateOrSendOffer(approval, actingProfile)) {
    return null;
  }
  if (approval.status === "pending") {
    return "Oczekuje na akceptację administratora.";
  }
  if (approval.status === "question") {
    return "Administrator ma pytanie — popraw i wyślij ponownie do akceptacji.";
  }
  return "Wymagana akceptacja administratora przed wysyłką do klienta.";
}

/** Czy dana osoba (wskazany admin lub dowolny administrator) może zdecydować o oczekującym wniosku. */
export function canDecideOfferApproval(
  approval: OfferApprovalState,
  actingProfile: Pick<UserProfile, "id" | "role">,
): boolean {
  if (approval.status !== "pending") {
    return false;
  }
  if (isAdministratorRole(actingProfile.role)) {
    return true;
  }
  return approval.assignedAdminId === actingProfile.id;
}
