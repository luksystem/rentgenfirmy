import type { ServiceIntakeRecord } from "@/lib/service-intake/types";

/**
 * Link do nowej oferty wstępnie wypełnionej danymi klienta i tematem z numerem zgłoszenia.
 * Gdy zgłoszono koszty dodatkowe z notatką, notatka trafia do pola opisu w szacowaniu AI —
 * i AI od razu próbuje przygotować wstępną wycenę (patrz app/oferty/nowy/page.tsx).
 */
export function buildServiceIntakeOfferHref(
  intake: Pick<ServiceIntakeRecord, "clientId" | "projectId" | "referenceNumber">,
  options?: { extraCosts?: boolean; extraCostsNote?: string | null },
) {
  const note = options?.extraCosts ? options.extraCostsNote?.trim() : "";
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
  if (note) {
    params.set("note", note);
  }

  return `/oferty/nowy?${params.toString()}`;
}
