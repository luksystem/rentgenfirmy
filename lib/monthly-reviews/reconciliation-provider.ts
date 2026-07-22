import type { MonthlyReviewAiReportContent, MonthlyReviewDecisionStatus } from "@/lib/monthly-reviews/types";
import { MONTHLY_REVIEW_DECISION_STATUS_LABELS } from "@/lib/monthly-reviews/types";

export type ReconciliationInput = {
  employeeName: string;
  periodMonthLabel: string;
  selfRating: number;
  selfComment: string;
  managerRating: number;
  managerComment: string;
};

function pickTier(avgRating: number, discrepancy: boolean): MonthlyReviewDecisionStatus {
  if (discrepancy) {
    return "talk_needed";
  }
  if (avgRating >= 9) {
    return "raise_consider";
  }
  if (avgRating >= 7) {
    return "standard_bonus";
  }
  if (avgRating >= 5) {
    return "no_action";
  }
  return "talk_needed";
}

/** Fallback bez AI — wzorem lib/my-work/suggestion-provider.ts (buildRuleBasedDaySummary). */
export function buildRuleBasedReconciliation(input: ReconciliationInput): MonthlyReviewAiReportContent {
  const diff = input.managerRating - input.selfRating;
  const discrepancy = Math.abs(diff) >= 3;
  const avgRating = (input.selfRating + input.managerRating) / 2;
  const tier = pickTier(avgRating, discrepancy);

  const agreements: string[] = [];
  const discrepancies: string[] = [];
  const risks: string[] = [];

  if (!discrepancy) {
    agreements.push(
      `Samoocena (${input.selfRating}/10) i ocena przełożonego (${input.managerRating}/10) są zbliżone.`,
    );
  } else {
    discrepancies.push(
      diff > 0
        ? `Przełożony ocenił miesiąc wyżej (${input.managerRating}/10) niż pracownik sam siebie (${input.selfRating}/10).`
        : `Pracownik ocenił swój miesiąc wyżej (${input.selfRating}/10) niż przełożony (${input.managerRating}/10).`,
    );
    risks.push("Duża rozbieżność ocen — warto omówić bezpośrednio z pracownikiem przed decyzją.");
  }

  if (avgRating <= 4) {
    risks.push("Niska średnia ocena — sprawdź obciążenie i ewentualne przeszkody w pracy.");
  }

  const summary =
    `${input.employeeName} — ${input.periodMonthLabel}: samoocena ${input.selfRating}/10, ` +
    `ocena przełożonego ${input.managerRating}/10. ` +
    (discrepancy
      ? "Oceny się rozjeżdżają — rekomendowana rozmowa przed decyzją."
      : "Oceny są spójne.");

  return {
    summary,
    agreements,
    discrepancies,
    risks,
    recommendation: {
      tier,
      label: MONTHLY_REVIEW_DECISION_STATUS_LABELS[tier],
      rationale:
        discrepancy
          ? "Rozbieżność ocen wymaga rozmowy przed podjęciem decyzji o premii/podwyżce."
          : `Średnia ocena ${avgRating.toFixed(1)}/10 — rekomendacja na podstawie prostej reguły (bez AI).`,
    },
  };
}
