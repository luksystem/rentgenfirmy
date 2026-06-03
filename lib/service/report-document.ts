import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import type { ServiceCostBreakdown, ServiceRecord } from "@/lib/service/types";

export function isServiceSettled(service: ServiceRecord): boolean {
  return service.status === "Rozliczony";
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
};

export function getServiceReportDocumentMeta(
  service: ServiceRecord,
): ServiceReportDocumentMeta {
  if (isServiceSettled(service)) {
    return {
      title: "Raport serwisowy",
      subtitle: "Smart Home / BMS · rozliczenie serwisu",
      previewDescription: "Podgląd dokumentu do rozliczenia / faktury",
      dateLabel: "Data raportu",
      worksSectionTitle: "Wykonane prace",
      costSectionTitle: "Rozliczenie kosztów serwisu",
      materialsCostLabel: "Koszt materiałów (rozliczane)",
      emptyCostRowsMessage: "Brak pozycji do rozliczenia",
      grossTotalLabel: "Cena brutto do faktury",
      showComparison: true,
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
  };
}

export function buildServiceReportCosts(service: ServiceRecord) {
  return {
    estimate: calculateServiceCost(
      service.estimate,
      service.rates,
      service.zoneSettings,
      service.discounts,
    ),
    actual: calculateServiceCost(
      service.actual,
      service.rates,
      service.zoneSettings,
      service.discounts,
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

export function getServiceReportMaterialsNote(service: ServiceRecord, settled: boolean) {
  if (settled) {
    return service.actual.materialsNote || service.estimate.materialsNote;
  }

  return service.estimate.materialsNote || service.actual.materialsNote;
}
