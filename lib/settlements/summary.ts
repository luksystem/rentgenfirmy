import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import {
  buildProjectCostSummary,
  sumAcceptedOffersNet,
  type ProjectCostSummary,
} from "@/lib/dashboard/project-cost-summary";
import type { ServiceRecord } from "@/lib/service/types";
import {
  buildSettlementSummary,
  type ProjectSettlementEntry,
  type ProjectSettlementSummary,
} from "@/lib/settlements/types";

export type ProjectFinancialSummary = ProjectCostSummary &
  ProjectSettlementSummary & {
    hasSettlementLedger: boolean;
  };

/** Łączy klasyczne sumy ofert/CR z ledgerem rozliczeń (gdy jest). */
export function buildProjectFinancialSummary(
  projectServices: ServiceRecord[],
  changeRequests: ProjectChangeRequest[],
  settlementEntries: ProjectSettlementEntry[] | null | undefined,
): ProjectFinancialSummary {
  const offers = sumAcceptedOffersNet(projectServices);
  const cost = buildProjectCostSummary(offers.total, offers.count, changeRequests);
  const settlement = buildSettlementSummary(settlementEntries ?? []);
  const hasSettlementLedger = (settlementEntries?.length ?? 0) > 0;

  return {
    ...cost,
    ...settlement,
    hasSettlementLedger,
    // Gdy ledger ma należności — one są źródłem prawdy dla „do zapłaty” (netto)
    totalNet: hasSettlementLedger ? settlement.chargesNet : cost.totalNet,
    totalGross: hasSettlementLedger ? settlement.chargesNet : cost.totalNet,
  };
}
