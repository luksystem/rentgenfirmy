import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import type { ServiceRecord } from "@/lib/service/types";

export type ProjectCostSummary = {
  /** Suma netto zaakceptowanych ofert. */
  offersNetTotal: number;
  /** @deprecated alias — UI przechodzi na netto */
  offersGrossTotal: number;
  acceptedOffersCount: number;
  /** Suma netto zaakceptowanych zmian. */
  changeRequestsNetTotal: number;
  /** @deprecated alias — UI przechodzi na netto */
  changeRequestsGrossTotal: number;
  acceptedChangeRequestsCount: number;
  pendingChangeRequestsNetTotal: number;
  /** @deprecated alias — UI przechodzi na netto */
  pendingChangeRequestsGrossTotal: number;
  pendingChangeRequestsCount: number;
  /** Razem netto (oferty + zaakceptowane zmiany) lub saldo ledgera w summary. */
  totalNet: number;
  /** @deprecated alias */
  totalGross: number;
};

function offerAcceptedNet(service: ServiceRecord) {
  const doc = service.clientOfferAcceptedDocument;
  if (!doc) return 0;
  if (doc.netTotal != null && Number.isFinite(doc.netTotal)) {
    return doc.netTotal;
  }
  // Starsze dokumenty miały tylko brutto — odwróć VAT jeśli znany.
  if (doc.grossTotal != null && Number.isFinite(doc.grossTotal)) {
    const vat = doc.vatRate;
    if (vat === 0 || vat === 8 || vat === 23) {
      return Math.round((doc.grossTotal / (1 + vat / 100)) * 100) / 100;
    }
  }
  return 0;
}

/** Suma zaakceptowanych ofert klienta (netto z momentu akceptacji) dla projektu. */
export function sumAcceptedOffersNet(projectServices: ServiceRecord[]): {
  total: number;
  count: number;
} {
  const accepted = projectServices.filter(
    (service) => service.clientOffer.status === "accepted" && service.clientOfferAcceptedDocument,
  );
  return {
    total: accepted.reduce((sum, service) => sum + offerAcceptedNet(service), 0),
    count: accepted.length,
  };
}

/** @deprecated użyj sumAcceptedOffersNet */
export function sumAcceptedOffersGross(projectServices: ServiceRecord[]) {
  return sumAcceptedOffersNet(projectServices);
}

export function buildProjectCostSummary(
  offersNetTotal: number,
  acceptedOffersCount: number,
  changeRequests: ProjectChangeRequest[],
): ProjectCostSummary {
  const acceptedChanges = changeRequests.filter((entry) => entry.status === "accepted");
  const pendingChanges = changeRequests.filter((entry) => entry.status === "pending_client");
  const changeRequestsNetTotal = acceptedChanges.reduce(
    (sum, entry) => sum + (entry.proposedCostNet ?? 0),
    0,
  );
  const pendingChangeRequestsNetTotal = pendingChanges.reduce(
    (sum, entry) => sum + (entry.proposedCostNet ?? 0),
    0,
  );
  const totalNet = offersNetTotal + changeRequestsNetTotal;

  return {
    offersNetTotal,
    offersGrossTotal: offersNetTotal,
    acceptedOffersCount,
    changeRequestsNetTotal,
    changeRequestsGrossTotal: changeRequestsNetTotal,
    acceptedChangeRequestsCount: acceptedChanges.length,
    pendingChangeRequestsNetTotal,
    pendingChangeRequestsGrossTotal: pendingChangeRequestsNetTotal,
    pendingChangeRequestsCount: pendingChanges.length,
    totalNet,
    totalGross: totalNet,
  };
}
