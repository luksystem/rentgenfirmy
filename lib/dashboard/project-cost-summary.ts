import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import type { ServiceRecord } from "@/lib/service/types";

export type ProjectCostSummary = {
  offersGrossTotal: number;
  acceptedOffersCount: number;
  changeRequestsGrossTotal: number;
  acceptedChangeRequestsCount: number;
  totalGross: number;
};

/** Suma zaakceptowanych ofert klienta (zamrożona kwota z momentu akceptacji) dla projektu. */
export function sumAcceptedOffersGross(projectServices: ServiceRecord[]): {
  total: number;
  count: number;
} {
  const accepted = projectServices.filter(
    (service) => service.clientOffer.status === "accepted" && service.clientOfferAcceptedDocument,
  );
  return {
    total: accepted.reduce(
      (sum, service) => sum + (service.clientOfferAcceptedDocument?.grossTotal ?? 0),
      0,
    ),
    count: accepted.length,
  };
}

export function buildProjectCostSummary(
  offersGrossTotal: number,
  acceptedOffersCount: number,
  changeRequests: ProjectChangeRequest[],
): ProjectCostSummary {
  const acceptedChanges = changeRequests.filter((entry) => entry.status === "accepted");
  const changeRequestsGrossTotal = acceptedChanges.reduce(
    (sum, entry) => sum + (entry.proposedCostGross ?? 0),
    0,
  );

  return {
    offersGrossTotal,
    acceptedOffersCount,
    changeRequestsGrossTotal,
    acceptedChangeRequestsCount: acceptedChanges.length,
    totalGross: offersGrossTotal + changeRequestsGrossTotal,
  };
}
