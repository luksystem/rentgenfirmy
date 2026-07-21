import type { ServiceIntakeRecord } from "@/lib/service-intake/types";

/** Link do nowej oferty wstępnie wypełnionej danymi klienta i tematem z numerem zgłoszenia. */
export function buildServiceIntakeOfferHref(
  intake: Pick<ServiceIntakeRecord, "clientId" | "projectId" | "referenceNumber">,
  options?: { extraCosts?: boolean },
) {
  const title = options?.extraCosts
    ? `Oferta — koszty dodatkowe do zgłoszenia ${intake.referenceNumber}`
    : `Oferta do zgłoszenia ${intake.referenceNumber}`;

  const params = new URLSearchParams();
  if (intake.clientId) {
    params.set("clientId", intake.clientId);
  }
  if (intake.projectId) {
    params.set("projectId", intake.projectId);
  }
  params.set("title", title);

  return `/oferty/nowy?${params.toString()}`;
}
