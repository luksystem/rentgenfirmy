import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { computeKpiResult, resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

const GOAL_TERMINAL_STATUSES = ["settled", "cancelled"];

async function sumXpPointsAwarded(admin: AdminClient, fromIso: string, toIso: string) {
  const { data, error } = await admin
    .from("xp_ledger_entries")
    .select("points")
    .gte("created_at", `${fromIso}T00:00:00`)
    .lte("created_at", `${toIso}T23:59:59`);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ points: number }>).reduce((sum, row) => sum + row.points, 0);
}

async function countPendingMonthlyReviews(admin: AdminClient) {
  const { count, error } = await admin
    .from("monthly_reviews")
    .select("id", { count: "exact", head: true })
    .not("self_submitted_at", "is", null)
    .is("manager_submitted_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countGoalsDeadlineSoon(admin: AdminClient, asOf: Date) {
  const todayIso = toISODate(asOf);
  const soonIso = toISODate(new Date(asOf.getTime() + 7 * 86_400_000));

  const { count, error } = await admin
    .from("goals")
    .select("id", { count: "exact", head: true })
    .not("status", "in", `(${GOAL_TERMINAL_STATUSES.join(",")})`)
    .gte("period_end", todayIso)
    .lte("period_end", soonIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function computeGrowthDomainReport(
  admin: AdminClient,
  asOf: Date,
  configByKey: Map<string, ReportKpiConfigRow>,
): Promise<DomainReport> {
  const kpis = [];

  const xpConfig = configByKey.get("growth.xp_points_awarded");
  if (xpConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      sumXpPointsAwarded(admin, window.current.startDate, window.current.endDate),
      sumXpPointsAwarded(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: xpConfig,
        definition: KPI_DEFINITIONS["growth.xp_points_awarded"],
      }),
    );
  }

  const reviewsConfig = configByKey.get("growth.monthly_reviews_pending");
  if (reviewsConfig?.enabled) {
    const value = await countPendingMonthlyReviews(admin);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: reviewsConfig,
        definition: KPI_DEFINITIONS["growth.monthly_reviews_pending"],
      }),
    );
  }

  const goalsConfig = configByKey.get("growth.goals_deadline_soon");
  if (goalsConfig?.enabled) {
    const value = await countGoalsDeadlineSoon(admin, asOf);
    kpis.push(
      computeKpiResult({
        value,
        previousValue: null,
        config: goalsConfig,
        definition: KPI_DEFINITIONS["growth.goals_deadline_soon"],
      }),
    );
  }

  const quickWins: QuickWin[] = [];
  const reviewsKpi = kpis.find((kpi) => kpi.key === "growth.monthly_reviews_pending");
  if (reviewsKpi && reviewsKpi.severity !== "good") {
    quickWins.push({
      id: "growth-reviews-pending",
      severity: reviewsKpi.severity === "critical" ? "critical" : "warning",
      title: "Oceny miesięczne czekają na managera",
      description: `${reviewsKpi.value} samoocen czeka na ocenę managerską.`,
      action: "Przejrzyj kolejkę ocen i uzupełnij brakujące decyzje.",
    });
  }

  return {
    domain: "growth",
    label: "Ocena i rozwój",
    kpis,
    severity: computeTileSeverity(kpis),
    trend: computeTileTrend(kpis),
    quickWins,
    detailRows: [],
  };
}
