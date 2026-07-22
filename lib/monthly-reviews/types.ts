export type MonthlyReviewAiStatus = "pending" | "ready" | "error";
export type MonthlyReviewAiSource = "ai" | "rules";

export const MONTHLY_REVIEW_DECISION_STATUSES = [
  "pending",
  "standard_bonus",
  "raise_consider",
  "talk_needed",
  "no_action",
  "other",
] as const;

export type MonthlyReviewDecisionStatus = (typeof MONTHLY_REVIEW_DECISION_STATUSES)[number];

export const MONTHLY_REVIEW_DECISION_STATUS_LABELS: Record<MonthlyReviewDecisionStatus, string> = {
  pending: "Do decyzji",
  standard_bonus: "Premia standardowa",
  raise_consider: "Podwyżka do rozważenia",
  talk_needed: "Do rozmowy",
  no_action: "Brak działania",
  other: "Inne",
};

export type MonthlyReviewRecommendation = {
  tier: MonthlyReviewDecisionStatus;
  label: string;
  rationale: string;
};

export type MonthlyReviewAiReportContent = {
  summary: string;
  agreements: string[];
  discrepancies: string[];
  risks: string[];
  recommendation: MonthlyReviewRecommendation;
};

export type MonthlyReview = {
  id: string;
  employeeId: string;
  periodMonth: string;
  selfSubmittedAt: string | null;
  managerSubmittedAt: string | null;
  managerId: string | null;
  aiStatus: MonthlyReviewAiStatus;
  createdAt: string;
  updatedAt: string;
};

export type MonthlySelfAssessment = {
  id: string;
  reviewId: string;
  employeeId: string;
  periodMonth: string;
  rating: number;
  comment: string;
  hoursContextSnapshot: Record<string, unknown>;
  submittedAt: string;
};

export type MonthlyManagerAssessment = {
  id: string;
  reviewId: string;
  employeeId: string;
  managerId: string;
  periodMonth: string;
  rating: number;
  comment: string;
  submittedAt: string;
};

export type MonthlyReviewAiReport = {
  id: string;
  reviewId: string;
  status: MonthlyReviewAiStatus;
  source: MonthlyReviewAiSource | null;
  report: MonthlyReviewAiReportContent | null;
  errorMessage: string;
  generatedAt: string | null;
  sharedWithEmployeeAt: string | null;
};

export type MonthlyReviewDecision = {
  id: string;
  reviewId: string;
  status: MonthlyReviewDecisionStatus;
  amount: number | null;
  note: string;
  decidedBy: string | null;
  decidedAt: string | null;
};

/** Widok pracownika (samoocena + warunkowo ocena managera / raport AI). */
export type MonthlyReviewSelfView = {
  review: MonthlyReview | null;
  selfAssessment: MonthlySelfAssessment | null;
  managerAssessment: MonthlyManagerAssessment | null;
  aiReport: MonthlyReviewAiReportContent | null;
  periodMonth: string;
  participates: boolean;
};

/** Wiersz kolejki managera — bez treści samooceny (tryb ślepy). */
export type MonthlyReviewTeamQueueRow = {
  employeeId: string;
  employeeName: string;
  role: string;
  periodMonth: string;
  selfSubmittedAt: string | null;
  managerSubmittedAt: string | null;
};

/** Pełny widok dla panelu administratora. */
export type MonthlyReviewAdminDetail = {
  review: MonthlyReview;
  employeeName: string;
  managerName: string | null;
  selfAssessment: MonthlySelfAssessment | null;
  managerAssessment: MonthlyManagerAssessment | null;
  aiReport: MonthlyReviewAiReport | null;
  decision: MonthlyReviewDecision | null;
};

export type MonthlyReviewAdminListRow = {
  review: MonthlyReview;
  employeeName: string;
  decisionStatus: MonthlyReviewDecisionStatus | null;
};
