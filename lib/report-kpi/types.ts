import type { QuickWin, TrendComparison } from "@/lib/types";

export type ComparisonPeriodKind = "none" | "day" | "week" | "month" | "quarter" | "year";

export type KpiDomain = "team" | "growth" | "sales" | "service" | "budget";

/** Czy wzrost wartości jest dobrą czy złą wiadomością — steruje wyłącznie kolorem delty, nie progami. */
export type KpiPolarity = "increase-is-bad" | "increase-is-good";

export type KpiUnit = "count" | "hours" | "currency" | "percent";

export type Severity = "good" | "warning" | "critical";

export type DeltaTone = "good" | "bad" | "neutral";

export type TileTrend = "improving" | "worsening" | "stable";

/** Statyczna definicja znaczenia KPI — nie edytowalna przez admina. */
export type KpiDefinition = {
  key: string;
  domain: KpiDomain;
  label: string;
  polarity: KpiPolarity;
  unit: KpiUnit;
};

/** Wiersz z tabeli report_kpi_config — edytowalny przez admina. */
export type ReportKpiConfigRow = {
  kpiKey: string;
  domain: KpiDomain;
  label: string;
  enabled: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  comparisonPeriod: ComparisonPeriodKind;
  sortOrder: number;
};

export type KpiResult = {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  trend: TrendComparison | null;
  severity: Severity;
  deltaTone: DeltaTone;
};

export type DetailRow = {
  id: string;
  label: string;
  sublabel?: string;
  severity?: Severity;
  href?: string;
};

export type DomainReport = {
  domain: KpiDomain;
  label: string;
  kpis: KpiResult[];
  severity: Severity;
  trend: TileTrend;
  quickWins: QuickWin[];
  detailRows: DetailRow[];
};

export type RaportFirmyPayload = {
  generatedAt: string;
  team: DomainReport;
  growth: DomainReport;
  sales: DomainReport;
  service: DomainReport;
  budget?: DomainReport;
};

/**
 * Katalog definicji KPI — polaryzacja i jednostka są własnością znaczenia wskaźnika,
 * nie czymś co admin powinien móc rozregulować w ustawieniach (tam edytuje tylko
 * report_kpi_config: enabled/progi/okres odniesienia/kolejność).
 */
export const KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  "team.overdue_tasks": {
    key: "team.overdue_tasks",
    domain: "team",
    label: "Zadania przeterminowane",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "team.unassigned_tomorrow": {
    key: "team.unassigned_tomorrow",
    domain: "team",
    label: "Zadania bez przydziału (na jutro)",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "team.tasks_waiting_3d": {
    key: "team.tasks_waiting_3d",
    domain: "team",
    label: "Zadania oczekujące >3 dni",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "team.overtime_hours": {
    key: "team.overtime_hours",
    domain: "team",
    label: "Nadgodziny w tygodniu",
    polarity: "increase-is-bad",
    unit: "hours",
  },
  "team.pending_leave_requests": {
    key: "team.pending_leave_requests",
    domain: "team",
    label: "Wnioski urlopowe czekające na akceptację",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "team.resource_plan_gaps": {
    key: "team.resource_plan_gaps",
    domain: "team",
    label: "Luki w planie zasobów (jutro)",
    polarity: "increase-is-bad",
    unit: "count",
  },

  "growth.xp_points_awarded": {
    key: "growth.xp_points_awarded",
    domain: "growth",
    label: "Przyznane punkty XP w okresie",
    polarity: "increase-is-good",
    unit: "count",
  },
  "growth.monthly_reviews_pending": {
    key: "growth.monthly_reviews_pending",
    domain: "growth",
    label: "Oceny miesięczne do zatwierdzenia",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "growth.goals_deadline_soon": {
    key: "growth.goals_deadline_soon",
    domain: "growth",
    label: "Cele kończące się w ciągu 7 dni",
    polarity: "increase-is-bad",
    unit: "count",
  },

  "sales.offers_awaiting_client": {
    key: "sales.offers_awaiting_client",
    domain: "sales",
    label: "Oferty oczekujące na klienta",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "sales.settlements_awaiting_payment": {
    key: "sales.settlements_awaiting_payment",
    domain: "sales",
    label: "Rozliczenia oczekujące na płatność",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "sales.requisitions_open": {
    key: "sales.requisitions_open",
    domain: "sales",
    label: "Otwarte zapotrzebowania",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "sales.requisitions_overdue": {
    key: "sales.requisitions_overdue",
    domain: "sales",
    label: "Przeterminowane zapotrzebowania",
    polarity: "increase-is-bad",
    unit: "count",
  },

  "service.tickets_untouched_48h": {
    key: "service.tickets_untouched_48h",
    domain: "service",
    label: "Zgłoszenia nieruszone >48h",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "service.tickets_overdue": {
    key: "service.tickets_overdue",
    domain: "service",
    label: "Zgłoszenia przeterminowane",
    polarity: "increase-is-bad",
    unit: "count",
  },
  "service.inspections_upcoming_week": {
    key: "service.inspections_upcoming_week",
    domain: "service",
    label: "Przeglądy w najbliższym tygodniu",
    polarity: "increase-is-bad",
    unit: "count",
  },

  "budget.revenue_mtd": {
    key: "budget.revenue_mtd",
    domain: "budget",
    label: "Przychód: miesiąc do dziś",
    polarity: "increase-is-good",
    unit: "currency",
  },
  "budget.receivables_overdue": {
    key: "budget.receivables_overdue",
    domain: "budget",
    label: "Należności przeterminowane",
    polarity: "increase-is-bad",
    unit: "currency",
  },
  "budget.invoices_to_issue": {
    key: "budget.invoices_to_issue",
    domain: "budget",
    label: "Faktury do wystawienia",
    polarity: "increase-is-bad",
    unit: "count",
  },
};
