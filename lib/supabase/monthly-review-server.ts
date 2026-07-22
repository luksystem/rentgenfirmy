import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { HttpError } from "@/lib/auth/http-error";
import { startOfMonth } from "@/lib/time-tracking/timesheet-period";
import { toDateInputValue } from "@/lib/time-tracking/format";
import type { TimesheetSummary } from "@/lib/time-tracking/timesheet-summary";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { generateMonthlyReviewReconciliation } from "@/lib/ai/monthly-review-ai";
import { awardXpServer } from "@/lib/supabase/xp-server";
import type {
  MonthlyManagerAssessment,
  MonthlyReview,
  MonthlyReviewAiReport,
  MonthlyReviewAiReportContent,
  MonthlyReviewSelfView,
  MonthlyReviewTeamQueueRow,
  MonthlySelfAssessment,
} from "@/lib/monthly-reviews/types";
import {
  MONTHLY_REVIEW_SETTINGS_ID,
  normalizeMonthlyReviewSettings,
} from "@/lib/monthly-reviews/settings";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";

type AdminClient = SupabaseClient;

type MonthlyReviewRow = {
  id: string;
  employee_id: string;
  period_month: string;
  self_submitted_at: string | null;
  manager_submitted_at: string | null;
  manager_id: string | null;
  ai_status: "pending" | "ready" | "error";
  created_at: string;
  updated_at: string;
};

type SelfAssessmentRow = {
  id: string;
  review_id: string;
  employee_id: string;
  period_month: string;
  rating: number;
  comment: string;
  hours_context_snapshot: Record<string, unknown> | null;
  submitted_at: string;
};

type ManagerAssessmentRow = {
  id: string;
  review_id: string;
  employee_id: string;
  manager_id: string;
  period_month: string;
  rating: number;
  comment: string;
  submitted_at: string;
};

type AiReportRow = {
  id: string;
  review_id: string;
  status: "pending" | "ready" | "error";
  source: "ai" | "rules" | null;
  report: MonthlyReviewAiReportContent | Record<string, never>;
  error_message: string;
  generated_at: string | null;
  shared_with_employee_at: string | null;
};

function mapReview(row: MonthlyReviewRow): MonthlyReview {
  return {
    id: row.id,
    employeeId: row.employee_id,
    periodMonth: row.period_month,
    selfSubmittedAt: row.self_submitted_at,
    managerSubmittedAt: row.manager_submitted_at,
    managerId: row.manager_id,
    aiStatus: row.ai_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSelfAssessment(row: SelfAssessmentRow): MonthlySelfAssessment {
  return {
    id: row.id,
    reviewId: row.review_id,
    employeeId: row.employee_id,
    periodMonth: row.period_month,
    rating: row.rating,
    comment: row.comment,
    hoursContextSnapshot: row.hours_context_snapshot ?? {},
    submittedAt: row.submitted_at,
  };
}

function mapManagerAssessment(row: ManagerAssessmentRow): MonthlyManagerAssessment {
  return {
    id: row.id,
    reviewId: row.review_id,
    employeeId: row.employee_id,
    managerId: row.manager_id,
    periodMonth: row.period_month,
    rating: row.rating,
    comment: row.comment,
    submittedAt: row.submitted_at,
  };
}

function mapAiReport(row: AiReportRow): MonthlyReviewAiReport {
  const hasContent = row.report && typeof row.report === "object" && "summary" in row.report;
  return {
    id: row.id,
    reviewId: row.review_id,
    status: row.status,
    source: row.source,
    report: hasContent ? (row.report as MonthlyReviewAiReportContent) : null,
    errorMessage: row.error_message,
    generatedAt: row.generated_at,
    sharedWithEmployeeAt: row.shared_with_employee_at,
  };
}

/** Zawsze pierwszy dzień bieżącego miesiąca — w wersji 1 nie ma wyboru zaległych miesięcy. */
export function resolveCurrentPeriodMonth(): string {
  return toDateInputValue(startOfMonth(new Date()));
}

/** Kompaktowy zrzut godzin do snapshotu i promptu AI — nie zapisujemy całego TimesheetSummary. */
export function buildHoursContextSnapshot(summary: TimesheetSummary) {
  const { balance } = summary;
  return {
    expectedHours: Math.round((balance.expectedWorkMinutes / 60) * 10) / 10,
    actualHours: Math.round((balance.actualWorkMinutes / 60) * 10) / 10,
    absenceHours: Math.round((balance.absenceMinutes / 60) * 10) / 10,
    balanceHours: Math.round((balance.balanceMinutes / 60) * 10) / 10,
    workingDays: balance.workingDays,
  };
}

export function hoursContextSnapshotToText(snapshot: Record<string, unknown>): string {
  const expected = typeof snapshot.expectedHours === "number" ? snapshot.expectedHours : null;
  const actual = typeof snapshot.actualHours === "number" ? snapshot.actualHours : null;
  const balance = typeof snapshot.balanceHours === "number" ? snapshot.balanceHours : null;

  if (expected === null || actual === null) {
    return "Brak danych o godzinach.";
  }

  const balanceText =
    balance === null ? "" : balance >= 0 ? `, bilans +${balance} h` : `, bilans ${balance} h`;

  return `${actual} h przepracowane z ${expected} h wymaganych${balanceText}.`;
}

async function fetchReviewRow(
  admin: AdminClient,
  employeeId: string,
  periodMonth: string,
): Promise<MonthlyReviewRow | null> {
  const { data, error } = await admin
    .from("monthly_reviews")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as MonthlyReviewRow | null) ?? null;
}

export async function ensureMonthlyReviewServer(
  admin: AdminClient,
  employeeId: string,
  periodMonth: string,
): Promise<MonthlyReview> {
  const existing = await fetchReviewRow(admin, employeeId, periodMonth);
  if (existing) {
    return mapReview(existing);
  }

  const { data, error } = await admin
    .from("monthly_reviews")
    .insert({ employee_id: employeeId, period_month: periodMonth })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapReview(data as MonthlyReviewRow);
}

async function fetchSelfAssessmentByReviewId(
  admin: AdminClient,
  reviewId: string,
): Promise<MonthlySelfAssessment | null> {
  const { data, error } = await admin
    .from("monthly_self_assessments")
    .select("*")
    .eq("review_id", reviewId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapSelfAssessment(data as SelfAssessmentRow) : null;
}

async function fetchManagerAssessmentByReviewId(
  admin: AdminClient,
  reviewId: string,
): Promise<MonthlyManagerAssessment | null> {
  const { data, error } = await admin
    .from("monthly_manager_assessments")
    .select("*")
    .eq("review_id", reviewId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapManagerAssessment(data as ManagerAssessmentRow) : null;
}

export async function fetchAiReportByReviewId(
  admin: AdminClient,
  reviewId: string,
): Promise<MonthlyReviewAiReport | null> {
  const { data, error } = await admin
    .from("monthly_review_ai_reports")
    .select("*")
    .eq("review_id", reviewId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapAiReport(data as AiReportRow) : null;
}

export async function submitSelfAssessmentServer(
  admin: AdminClient,
  input: {
    employeeId: string;
    periodMonth: string;
    rating: number;
    comment: string;
    hoursContextSnapshot: Record<string, unknown>;
  },
): Promise<MonthlyReview> {
  const review = await ensureMonthlyReviewServer(admin, input.employeeId, input.periodMonth);
  if (review.selfSubmittedAt) {
    throw new HttpError(409, "Samoocena za ten miesiąc została już złożona.");
  }

  const submittedAt = new Date().toISOString();

  const { error: insertError } = await admin.from("monthly_self_assessments").insert({
    review_id: review.id,
    employee_id: input.employeeId,
    period_month: input.periodMonth,
    rating: input.rating,
    comment: input.comment,
    hours_context_snapshot: input.hoursContextSnapshot,
    submitted_at: submittedAt,
  });
  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await admin
    .from("monthly_reviews")
    .update({ self_submitted_at: submittedAt, updated_at: submittedAt })
    .eq("id", review.id);
  if (updateError) {
    throw new Error(updateError.message);
  }

  await ensureMonthlyReviewAiReportServer(admin, review.id);

  await awardXpServer(admin, {
    employeeId: input.employeeId,
    criterionKey: "self_assessment_submitted",
    sourceId: review.id,
  });
  await awardXpServer(admin, {
    employeeId: input.employeeId,
    criterionKey: "self_assessment_rating",
    ratingForScaling: input.rating,
    sourceId: review.id,
  });

  return { ...review, selfSubmittedAt: submittedAt };
}

export async function submitManagerAssessmentServer(
  admin: AdminClient,
  input: { employeeId: string; periodMonth: string; managerId: string; rating: number; comment: string },
): Promise<MonthlyReview> {
  const review = await ensureMonthlyReviewServer(admin, input.employeeId, input.periodMonth);
  if (review.managerSubmittedAt) {
    throw new HttpError(409, "Ocena przełożonego za ten miesiąc została już złożona.");
  }

  const submittedAt = new Date().toISOString();

  const { error: insertError } = await admin.from("monthly_manager_assessments").insert({
    review_id: review.id,
    employee_id: input.employeeId,
    manager_id: input.managerId,
    period_month: input.periodMonth,
    rating: input.rating,
    comment: input.comment,
    submitted_at: submittedAt,
  });
  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await admin
    .from("monthly_reviews")
    .update({ manager_submitted_at: submittedAt, manager_id: input.managerId, updated_at: submittedAt })
    .eq("id", review.id);
  if (updateError) {
    throw new Error(updateError.message);
  }

  await ensureMonthlyReviewAiReportServer(admin, review.id);

  await awardXpServer(admin, {
    employeeId: input.employeeId,
    criterionKey: "manager_assessment_rating",
    ratingForScaling: input.rating,
    sourceId: review.id,
  });

  return { ...review, managerSubmittedAt: submittedAt, managerId: input.managerId };
}

/** Uruchamia AI dopiero gdy obie oceny są złożone; bezpieczne do wywołania wielokrotnie. */
export async function ensureMonthlyReviewAiReportServer(
  admin: AdminClient,
  reviewId: string,
): Promise<void> {
  const { data: reviewData, error: reviewError } = await admin
    .from("monthly_reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError) {
    throw new Error(reviewError.message);
  }
  const review = reviewData ? mapReview(reviewData as MonthlyReviewRow) : null;
  if (!review || !review.selfSubmittedAt || !review.managerSubmittedAt) {
    return;
  }

  const existingReport = await fetchAiReportByReviewId(admin, reviewId);
  if (existingReport && existingReport.status === "ready") {
    return;
  }

  const [self, manager, profileResult] = await Promise.all([
    fetchSelfAssessmentByReviewId(admin, reviewId),
    fetchManagerAssessmentByReviewId(admin, reviewId),
    admin.from("profiles").select("*").eq("id", review.employeeId).maybeSingle(),
  ]);

  if (!self || !manager || !profileResult.data) {
    return;
  }

  const employee = mapProfileRow(profileResult.data);
  const employeeName = getUserDisplayName(employee);
  const periodMonthLabel = formatPeriodMonthLabel(review.periodMonth);
  const hoursContextText = hoursContextSnapshotToText(self.hoursContextSnapshot);

  try {
    const result = await generateMonthlyReviewReconciliation({
      employeeName,
      periodMonthLabel,
      hoursContextText,
      selfRating: self.rating,
      selfComment: self.comment,
      managerRating: manager.rating,
      managerComment: manager.comment,
    });

    await admin
      .from("monthly_review_ai_reports")
      .upsert(
        {
          review_id: reviewId,
          status: "ready",
          source: result.source,
          report: result.content,
          error_message: "",
          generated_at: new Date().toISOString(),
        },
        { onConflict: "review_id" },
      );

    await admin
      .from("monthly_reviews")
      .update({ ai_status: "ready", updated_at: new Date().toISOString() })
      .eq("id", reviewId);
  } catch (error) {
    await admin
      .from("monthly_review_ai_reports")
      .upsert(
        {
          review_id: reviewId,
          status: "error",
          error_message: error instanceof Error ? error.message : "Nieznany błąd generowania raportu.",
        },
        { onConflict: "review_id" },
      );

    await admin
      .from("monthly_reviews")
      .update({ ai_status: "error", updated_at: new Date().toISOString() })
      .eq("id", reviewId);
  }
}

/** Widok pracownika — samoocena zawsze, ocena managera/raport AI zamaskowane wg reguł widoczności. */
export async function fetchCombinedReviewServer(
  admin: AdminClient,
  employee: UserProfile,
  periodMonth: string,
): Promise<MonthlyReviewSelfView> {
  if (!employee.monthlyReviewEnabled) {
    return {
      review: null,
      selfAssessment: null,
      managerAssessment: null,
      aiReport: null,
      periodMonth,
      participates: false,
    };
  }

  const reviewRow = await fetchReviewRow(admin, employee.id, periodMonth);
  if (!reviewRow) {
    return {
      review: null,
      selfAssessment: null,
      managerAssessment: null,
      aiReport: null,
      periodMonth,
      participates: true,
    };
  }

  const review = mapReview(reviewRow);
  const [selfAssessment, managerAssessment, aiReport, settingsRow] = await Promise.all([
    fetchSelfAssessmentByReviewId(admin, review.id),
    fetchManagerAssessmentByReviewId(admin, review.id),
    fetchAiReportByReviewId(admin, review.id),
    admin.from("app_settings").select("data").eq("id", MONTHLY_REVIEW_SETTINGS_ID).maybeSingle(),
  ]);

  const settings = normalizeMonthlyReviewSettings(settingsRow.data?.data);
  const canSeeManagerAssessment =
    settings.employeeCanSeeManagerAssessment && Boolean(review.selfSubmittedAt) && Boolean(review.managerSubmittedAt);
  const canSeeAiReport = Boolean(aiReport?.sharedWithEmployeeAt);

  return {
    review,
    selfAssessment,
    managerAssessment: canSeeManagerAssessment ? managerAssessment : null,
    aiReport: canSeeAiReport ? aiReport?.report ?? null : null,
    periodMonth,
    participates: true,
  };
}

/** Kolejka managera — bez treści samooceny (tryb ślepy, chroni przed zakotwiczeniem). */
export async function fetchTeamReviewQueueServer(
  admin: AdminClient,
  periodMonth: string,
): Promise<MonthlyReviewTeamQueueRow[]> {
  const profiles = (await fetchTeamProfilesServer()).filter((profile) => profile.monthlyReviewEnabled);
  if (!profiles.length) {
    return [];
  }

  const { data, error } = await admin
    .from("monthly_reviews")
    .select("*")
    .eq("period_month", periodMonth)
    .in(
      "employee_id",
      profiles.map((profile) => profile.id),
    );
  if (error) {
    throw new Error(error.message);
  }

  const reviewByEmployeeId = new Map((data ?? []).map((row) => [row.employee_id as string, row as MonthlyReviewRow]));

  return profiles.map((profile) => {
    const row = reviewByEmployeeId.get(profile.id);
    return {
      employeeId: profile.id,
      employeeName: getUserDisplayName(profile),
      role: profile.role,
      periodMonth,
      selfSubmittedAt: row?.self_submitted_at ?? null,
      managerSubmittedAt: row?.manager_submitted_at ?? null,
    };
  });
}
