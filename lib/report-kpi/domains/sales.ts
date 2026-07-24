import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { computeKpiResult, resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

const OPEN_OFFER_STATUSES = ["pending", "negotiation"];
const OPEN_REQUISITION_STATUSES = ["submitted", "approved", "ordered"];

async function countOffersAwaitingClient(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("services")
    .select("id", { count: "exact", head: true })
    .in("client_offer_status", OPEN_OFFER_STATUSES)
    .gte("created_at", `${fromIso}T00:00:00`)
    .lte("created_at", `${toIso}T23:59:59`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countSettlementsAwaitingPayment(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("settlement_offer_status", "pending")
    .gte("created_at", `${fromIso}T00:00:00`)
    .lte("created_at", `${toIso}T23:59:59`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countOpenRequisitions(admin: AdminClient) {
  const { count, error } = await admin
    .from("requisitions")
    .select("id", { count: "exact", head: true })
    .in("status", OPEN_REQUISITION_STATUSES);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countOverdueRequisitions(admin: AdminClient, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("requisitions")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .lt("order_due_at", toISODate(new Date()))
    .gte("order_due_at", fromIso)
    .lte("order_due_at", toIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function computeSalesDomainReport(
  admin: AdminClient,
  asOf: Date,
  configByKey: Map<string, ReportKpiConfigRow>,
): Promise<DomainReport> {
  const kpis = [];

  const offersConfig = configByKey.get("sales.offers_awaiting_client");
  if (offersConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      countOffersAwaitingClient(admin, window.current.startDate, window.current.endDate),
      countOffersAwaitingClient(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: offersConfig,
        definition: KPI_DEFINITIONS["sales.offers_awaiting_client"],
      }),
    );
  }

  const settlementsConfig = configByKey.get("sales.settlements_awaiting_payment");
  if (settlementsConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      countSettlementsAwaitingPayment(admin, window.current.startDate, window.current.endDate),
      countSettlementsAwaitingPayment(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: settlementsConfig,
        definition: KPI_DEFINITIONS["sales.settlements_awaiting_payment"],
      }),
    );
  }

  const requisitionsOpenConfig = configByKey.get("sales.requisitions_open");
  if (requisitionsOpenConfig?.enabled) {
    const value = await countOpenRequisitions(admin);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: requisitionsOpenConfig,
        definition: KPI_DEFINITIONS["sales.requisitions_open"],
      }),
    );
  }

  const requisitionsOverdueConfig = configByKey.get("sales.requisitions_overdue");
  if (requisitionsOverdueConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "day");
    const [value, previousValue] = await Promise.all([
      countOverdueRequisitions(admin, window.current.startDate, window.current.endDate),
      countOverdueRequisitions(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: requisitionsOverdueConfig,
        definition: KPI_DEFINITIONS["sales.requisitions_overdue"],
      }),
    );
  }

  const quickWins: QuickWin[] = [];
  const overdueReqKpi = kpis.find((kpi) => kpi.key === "sales.requisitions_overdue");
  if (overdueReqKpi && overdueReqKpi.value > 0) {
    quickWins.push({
      id: "sales-requisitions-overdue",
      severity: overdueReqKpi.severity === "critical" ? "critical" : "warning",
      title: "Przeterminowane zapotrzebowania",
      description: `${overdueReqKpi.value} zapotrzebowań ma minięty termin zamówienia.`,
      action: "Uzupełnij zamówienie lub przesuń termin w module Zapotrzebowania.",
    });
  }

  return {
    domain: "sales",
    label: "Sprzedaż i cashflow",
    kpis,
    severity: computeTileSeverity(kpis),
    trend: computeTileTrend(kpis),
    quickWins,
    detailRows: [],
  };
}
