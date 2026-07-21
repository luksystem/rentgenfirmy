import {
  buildClientOfferSummary,
  type ClientOfferSummary,
} from "@/lib/dashboard/client-offer-summary";
import {
  isChangeRequestPendingAttention,
  PROJECT_CHANGE_REQUEST_STATUS_LABELS,
  type ProjectChangeRequest,
} from "@/lib/dashboard/change-request-types";
import { CLIENT_OFFER_STATUS_LABELS } from "@/lib/service/client-offer";
import type { ServiceRecord } from "@/lib/service/types";
import type { ProjectBillingSettings, ProjectSettlementEntry } from "@/lib/settlements/types";

export type SettlementOriginTone = "accepted" | "pending" | "info";

export type SettlementOriginLine = {
  id: string;
  title: string;
  statusLabel: string;
  tone: SettlementOriginTone;
  amountNet: number | null;
  amountGross: number | null;
  /** Już jako należność w ledgerze rozliczeń. */
  inLedger: boolean;
};

export type SettlementOriginGroup = {
  accepted: SettlementOriginLine[];
  pending: SettlementOriginLine[];
  acceptedGrossTotal: number;
  pendingGrossTotal: number;
  acceptedNetTotal: number;
  pendingNetTotal: number;
};

export type SettlementOriginBreakdown = {
  contract: SettlementOriginLine | null;
  changeRequests: SettlementOriginGroup;
  offers: SettlementOriginGroup;
  hasAnyExtra: boolean;
};

function sumGross(lines: SettlementOriginLine[]) {
  return lines.reduce((sum, line) => sum + (line.amountGross ?? 0), 0);
}

function sumNet(lines: SettlementOriginLine[]) {
  return lines.reduce((sum, line) => sum + (line.amountNet ?? 0), 0);
}

function emptyGroup(): SettlementOriginGroup {
  return {
    accepted: [],
    pending: [],
    acceptedGrossTotal: 0,
    pendingGrossTotal: 0,
    acceptedNetTotal: 0,
    pendingNetTotal: 0,
  };
}

function finalizeGroup(accepted: SettlementOriginLine[], pending: SettlementOriginLine[]): SettlementOriginGroup {
  return {
    accepted,
    pending,
    acceptedGrossTotal: sumGross(accepted),
    pendingGrossTotal: sumGross(pending),
    acceptedNetTotal: sumNet(accepted),
    pendingNetTotal: sumNet(pending),
  };
}

function ledgerHasSource(
  entries: ProjectSettlementEntry[],
  source: "contract" | "change_request" | "offer",
  sourceId: string | null,
) {
  return entries.some(
    (entry) =>
      entry.kind === "charge" &&
      entry.source === source &&
      (entry.sourceId ?? null) === (sourceId ?? null),
  );
}

function offerSummariesFromServices(
  services: ServiceRecord[],
  projectId: string,
): ClientOfferSummary[] {
  const names = new Map<string, string>();
  return services
    .filter((service) => service.projectId === projectId)
    .map((service) => buildClientOfferSummary(service, names));
}

export function buildSettlementOriginBreakdown(input: {
  projectId: string;
  settings: ProjectBillingSettings | null | undefined;
  entries: ProjectSettlementEntry[];
  changeRequests: ProjectChangeRequest[];
  /** Pełne rekordy (tryb zespołu) albo gotowe summary (publiczny link). */
  services?: ServiceRecord[];
  offerSummaries?: ClientOfferSummary[];
}): SettlementOriginBreakdown {
  const { projectId, settings, entries } = input;
  const offers =
    input.offerSummaries?.filter((offer) => offer.projectId === projectId) ??
    (input.services ? offerSummariesFromServices(input.services, projectId) : []);

  const contractCharge = entries.find(
    (entry) => entry.kind === "charge" && entry.source === "contract",
  );
  const contractAmountNet = contractCharge?.amountNet ?? settings?.contractAmountNet ?? null;
  const contractAmountGross = contractCharge?.amountGross ?? settings?.contractAmountGross ?? null;
  const contract: SettlementOriginLine | null =
    contractAmountNet != null && contractAmountNet > 0
      ? {
          id: "contract",
          title: "Umowa główna",
          statusLabel: contractCharge ? "W należnościach" : "W budżecie projektu",
          tone: "info",
          amountNet: contractAmountNet,
          amountGross: contractAmountGross,
          inLedger: Boolean(contractCharge),
        }
      : null;

  const projectChanges = input.changeRequests.filter((entry) => entry.projectId === projectId);
  const acceptedChanges: SettlementOriginLine[] = [];
  const pendingChanges: SettlementOriginLine[] = [];

  for (const change of projectChanges) {
    const hasCost =
      (change.proposedCostGross != null && change.proposedCostGross !== 0) ||
      (change.proposedCostNet != null && change.proposedCostNet !== 0) ||
      Boolean(change.costNote?.trim());
    if (!hasCost && change.status !== "accepted" && !isChangeRequestPendingAttention(change)) {
      continue;
    }

    const line: SettlementOriginLine = {
      id: change.id,
      title: change.title.trim() || "Zmiana projektu",
      statusLabel: PROJECT_CHANGE_REQUEST_STATUS_LABELS[change.status],
      tone: change.status === "accepted" ? "accepted" : "pending",
      amountNet: change.proposedCostNet,
      amountGross: change.proposedCostGross,
      inLedger: ledgerHasSource(entries, "change_request", change.id),
    };

    if (change.status === "accepted") {
      acceptedChanges.push(line);
    } else if (isChangeRequestPendingAttention(change) || change.status === "pending_client") {
      pendingChanges.push(line);
    }
  }

  const acceptedOffers: SettlementOriginLine[] = [];
  const pendingOffers: SettlementOriginLine[] = [];

  for (const offer of offers) {
    if (offer.offerStatus === "rejected" || offer.serviceStatus === "Anulowany") {
      continue;
    }
    const isAccepted = offer.offerStatus === "accepted";
    const isPending =
      offer.offerStatus === "pending" ||
      offer.offerStatus === "negotiation" ||
      offer.serviceStatus === "Oczekuje na klienta";

    if (!isAccepted && !isPending) {
      continue;
    }

    const line: SettlementOriginLine = {
      id: offer.id,
      title: offer.title,
      statusLabel:
        offer.offerStatusLabel ??
        (offer.offerStatus ? CLIENT_OFFER_STATUS_LABELS[offer.offerStatus] : "Oferta"),
      tone: isAccepted ? "accepted" : "pending",
      amountNet: offer.amountNet,
      amountGross: offer.amountGross,
      inLedger: ledgerHasSource(entries, "offer", offer.id),
    };

    if (isAccepted) {
      acceptedOffers.push(line);
    } else if (isPending) {
      pendingOffers.push(line);
    }
  }

  // Uzupełnij zaakceptowane pozycje z ledgeru, gdy brak rekordu źródłowego (np. publiczny seed).
  const knownChangeIds = new Set(acceptedChanges.map((line) => line.id));
  for (const entry of entries) {
    if (entry.kind !== "charge" || entry.source !== "change_request" || !entry.sourceId) {
      continue;
    }
    if (knownChangeIds.has(entry.sourceId)) {
      continue;
    }
    acceptedChanges.push({
      id: entry.sourceId,
      title: entry.title.replace(/^Zmiana:\s*/i, "") || entry.title,
      statusLabel: PROJECT_CHANGE_REQUEST_STATUS_LABELS.accepted,
      tone: "accepted",
      amountNet: entry.amountNet,
      amountGross: entry.amountGross,
      inLedger: true,
    });
  }

  const knownOfferIds = new Set(acceptedOffers.map((line) => line.id));
  for (const entry of entries) {
    if (entry.kind !== "charge" || entry.source !== "offer" || !entry.sourceId) {
      continue;
    }
    if (knownOfferIds.has(entry.sourceId)) {
      continue;
    }
    acceptedOffers.push({
      id: entry.sourceId,
      title: entry.title.replace(/^Oferta:\s*/i, "") || entry.title,
      statusLabel: CLIENT_OFFER_STATUS_LABELS.accepted,
      tone: "accepted",
      amountNet: entry.amountNet,
      amountGross: entry.amountGross,
      inLedger: true,
    });
  }

  const changeRequests = finalizeGroup(acceptedChanges, pendingChanges);
  const offerGroup = finalizeGroup(acceptedOffers, pendingOffers);
  const hasAnyExtra =
    changeRequests.accepted.length > 0 ||
    changeRequests.pending.length > 0 ||
    offerGroup.accepted.length > 0 ||
    offerGroup.pending.length > 0 ||
    contract != null;

  return {
    contract,
    changeRequests,
    offers: offerGroup,
    hasAnyExtra,
  };
}
