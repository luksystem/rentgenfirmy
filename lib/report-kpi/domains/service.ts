import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { listInspections } from "@/lib/supabase/inspection-server";
import { countServiceIntakeAlerts } from "@/lib/supabase/service-intake-server";
import { computeKpiResult } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

async function countUpcomingInspections(asOf: Date) {
  const todayIso = toISODate(asOf);
  const soonIso = toISODate(new Date(asOf.getTime() + 7 * 86_400_000));
  const items = await listInspections();

  return items.filter((item) => {
    const date = item.confirmedDate ?? item.preliminaryDate;
    return date != null && date >= todayIso && date <= soonIso;
  }).length;
}

export async function computeServiceDomainReport(
  _admin: AdminClient,
  asOf: Date,
  configByKey: Map<string, ReportKpiConfigRow>,
): Promise<DomainReport> {
  const kpis = [];

  const alerts = await countServiceIntakeAlerts();

  const untouchedConfig = configByKey.get("service.tickets_untouched_48h");
  if (untouchedConfig?.enabled) {
    kpis.push(
      computeKpiResult({
        value: alerts.newCount,
        previousValue: null,
        config: untouchedConfig,
        definition: KPI_DEFINITIONS["service.tickets_untouched_48h"],
      }),
    );
  }

  const overdueConfig = configByKey.get("service.tickets_overdue");
  if (overdueConfig?.enabled) {
    kpis.push(
      computeKpiResult({
        value: alerts.overdueCount,
        previousValue: null,
        config: overdueConfig,
        definition: KPI_DEFINITIONS["service.tickets_overdue"],
      }),
    );
  }

  const inspectionsConfig = configByKey.get("service.inspections_upcoming_week");
  if (inspectionsConfig?.enabled) {
    const value = await countUpcomingInspections(asOf);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: inspectionsConfig,
        definition: KPI_DEFINITIONS["service.inspections_upcoming_week"],
      }),
    );
  }

  const quickWins: QuickWin[] = [];
  const overdueKpi = kpis.find((kpi) => kpi.key === "service.tickets_overdue");
  if (overdueKpi && overdueKpi.value > 0) {
    quickWins.push({
      id: "service-tickets-overdue",
      severity: overdueKpi.severity === "critical" ? "critical" : "warning",
      title: "Zgłoszenia serwisowe po terminie",
      description: `${overdueKpi.value} zgłoszeń przekroczyło oczekiwany czas reakcji.`,
      action: "Przejrzyj kolejkę zgłoszeń i przypisz właściciela najstarszym sprawom.",
    });
  }

  return {
    domain: "service",
    label: "Serwis",
    kpis,
    severity: computeTileSeverity(kpis),
    trend: computeTileTrend(kpis),
    quickWins,
    detailRows: [],
  };
}
