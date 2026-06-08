import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import type {
  ServiceCostBreakdown,
  ServiceDiscounts,
  ServiceLineItems,
  ServiceRecord,
} from "@/lib/service/types";
import { formatMoney } from "@/lib/utils";

export function isServiceSettled(service: ServiceRecord): boolean {
  return service.status === "Rozliczony";
}

export function shouldShowEstimateComparison(service: ServiceRecord) {
  return isServiceSettled(service) && service.showEstimateComparison;
}

export type ServiceReportDocumentMeta = {
  title: string;
  subtitle: string;
  previewDescription: string;
  dateLabel: string;
  worksSectionTitle: string;
  costSectionTitle: string;
  materialsCostLabel: string;
  emptyCostRowsMessage: string;
  grossTotalLabel: string;
  showComparison: boolean;
  showDetailedCosts: boolean;
};

export function getServiceReportDocumentMeta(
  service: ServiceRecord,
): ServiceReportDocumentMeta {
  if (isServiceSettled(service)) {
    return {
      title: "Rozliczenie Prac",
      subtitle: "Smart Home / BMS · rozliczenie serwisu",
      previewDescription: "Podgląd dokumentu do rozliczenia / faktury",
      dateLabel: "Data raportu",
      worksSectionTitle: "Wykonane prace",
      costSectionTitle: "Rozliczenie kosztów serwisu",
      materialsCostLabel: "Koszt materiałów (rozliczane)",
      emptyCostRowsMessage: "Brak pozycji do rozliczenia",
      grossTotalLabel: "Cena brutto do faktury",
      showComparison: shouldShowEstimateComparison(service),
      showDetailedCosts: service.detailedSettlement,
    };
  }

  return {
    title: "Wycena prac",
    subtitle: "Smart Home / BMS · wycena prac serwisowych",
    previewDescription: "Podgląd wyceny do wysłania klientowi",
    dateLabel: "Data wyceny",
    worksSectionTitle: "Zakres prac",
    costSectionTitle: "Wycena kosztów serwisu",
    materialsCostLabel: "Koszt materiałów (wycena)",
    emptyCostRowsMessage: "Brak pozycji do wyceny",
    grossTotalLabel: "Cena brutto",
    showComparison: false,
    showDetailedCosts: service.detailedSettlement,
  };
}

export function buildServiceReportCosts(service: ServiceRecord) {
  return {
    estimate: calculateServiceCost(
      service.estimate,
      service.rates,
      service.zoneSettings,
      service.estimateDiscounts,
    ),
    actual: calculateServiceCost(
      service.actual,
      service.rates,
      service.zoneSettings,
      service.actualDiscounts,
    ),
  };
}

export function getServiceReportBillingBreakdown(
  service: ServiceRecord,
  costs: { estimate: ServiceCostBreakdown; actual: ServiceCostBreakdown },
): ServiceCostBreakdown {
  return isServiceSettled(service) ? costs.actual : costs.estimate;
}

export function getServiceReportWorkNote(service: ServiceRecord, settled: boolean) {
  if (settled) {
    return service.actual.workReportNote || service.estimate.workReportNote;
  }

  return service.estimate.workReportNote || service.actual.workReportNote;
}

export function getServiceReportBillingDiscounts(service: ServiceRecord) {
  return isServiceSettled(service) ? service.actualDiscounts : service.estimateDiscounts;
}

export function getServiceReportMaterialsNote(service: ServiceRecord, settled: boolean) {
  if (settled) {
    return service.actual.materialsNote || service.estimate.materialsNote;
  }

  return service.estimate.materialsNote || service.actual.materialsNote;
}

export function hasAppliedDiscount(discounts: ServiceDiscounts) {
  return discounts.percentDiscount > 0 || discounts.specialDiscountPln > 0;
}

export function getAppliedDiscountDescription(
  discounts: ServiceDiscounts,
  breakdown: ServiceCostBreakdown,
) {
  if (!hasAppliedDiscount(discounts)) {
    return "Brak rabatu";
  }

  const parts: string[] = [];

  if (discounts.percentDiscount > 0) {
    parts.push(
      `rabat ${discounts.percentDiscount}% (−${formatMoney(breakdown.percentDiscountAmount)} netto)`,
    );
  }

  if (discounts.specialDiscountPln > 0) {
    parts.push(`rabat specjalny −${formatMoney(discounts.specialDiscountPln)} netto`);
  }

  return parts.join(" · ");
}

export type ServiceWorkTimeBreakdown = {
  logisticsAndSupervisionTotal: number;
  workHoursTotal: number;
  lines: {
    logistics: {
      carHours: number;
      supervisionHours: number;
    };
    work: {
      installerHours: number;
      helperHours: number;
      programmerHours: number;
    };
  };
};

export function buildServiceWorkTimeBreakdown(
  items: ServiceLineItems,
): ServiceWorkTimeBreakdown {
  const carHours = items.carHours;
  const supervisionHours = items.supervisionHours;
  const installerHours = items.installerHours;
  const helperHours = items.helperHours;
  const programmerHours = items.programmerHours;

  return {
    logisticsAndSupervisionTotal: carHours + supervisionHours,
    workHoursTotal: installerHours + helperHours + programmerHours,
    lines: {
      logistics: { carHours, supervisionHours },
      work: { installerHours, helperHours, programmerHours },
    },
  };
}

export function getServiceReportWorkTimeSections(service: ServiceRecord) {
  const showComparison = shouldShowEstimateComparison(service);

  return {
    showComparison,
    predicted: buildServiceWorkTimeBreakdown(service.estimate),
    actual: buildServiceWorkTimeBreakdown(service.actual),
  };
}

export type ServiceQuantitySummary = {
  materialsCost: number;
  accommodations: number;
  tripCount: number;
};

export function buildServiceQuantitySummary(items: ServiceLineItems): ServiceQuantitySummary {
  return {
    materialsCost: items.materialsCost,
    accommodations: items.accommodations,
    tripCount: Math.max(1, items.tripCount || 1),
  };
}

export function getServiceReportQuantitySections(service: ServiceRecord) {
  const showComparison = shouldShowEstimateComparison(service);

  return {
    showComparison,
    predicted: buildServiceQuantitySummary(service.estimate),
    actual: buildServiceQuantitySummary(service.actual),
  };
}
