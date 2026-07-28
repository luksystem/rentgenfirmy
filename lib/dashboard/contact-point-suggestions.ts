import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { TradeContactPoint } from "@/lib/dashboard/trade-contact-point-types";
import type { ProjectTrade } from "@/lib/dashboard/trade-types";

export type ContactPointSuggestion = {
  contactPoint: TradeContactPoint;
  matchedTrades: ProjectTrade[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

/**
 * Podpowiedzi ustaleń dla projektu: punkty styku, których wszystkie branże są obecne wśród
 * wykonawców projektu (dopasowanie po nazwie, niezależnie od aktywności/danych kontaktowych),
 * dla typu projektu punktu styku, z wykluczeniem punktów już zastosowanych w tym projekcie.
 */
export function computeContactPointSuggestions(
  projectType: string,
  projectTrades: ProjectTrade[],
  contactPoints: TradeContactPoint[],
  existingAgreements: ProjectClientAgreement[],
): ContactPointSuggestion[] {
  const appliedContactPointIds = new Set(
    existingAgreements
      .map((agreement) => agreement.sourceContactPointId)
      .filter((id): id is string => Boolean(id)),
  );

  const tradesByNormalizedName = new Map<string, ProjectTrade>();
  for (const trade of projectTrades) {
    tradesByNormalizedName.set(normalizeName(trade.name), trade);
  }

  const suggestions: ContactPointSuggestion[] = [];

  for (const contactPoint of contactPoints) {
    if (!contactPoint.isActive) {
      continue;
    }
    if (contactPoint.projectType !== projectType) {
      continue;
    }
    if (appliedContactPointIds.has(contactPoint.id)) {
      continue;
    }
    if (contactPoint.tradeNames.length < 2) {
      continue;
    }

    const matchedTrades: ProjectTrade[] = [];
    let allMatched = true;
    for (const tradeName of contactPoint.tradeNames) {
      const match = tradesByNormalizedName.get(normalizeName(tradeName));
      if (!match) {
        allMatched = false;
        break;
      }
      matchedTrades.push(match);
    }

    if (allMatched) {
      suggestions.push({ contactPoint, matchedTrades });
    }
  }

  return suggestions;
}
