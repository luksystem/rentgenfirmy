import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName } from "@/lib/auth/types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { fetchAiReportByReviewId } from "@/lib/supabase/monthly-review-server";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";
import type {
  MonthlyReview,
  MonthlyReviewAdminDetail,
  MonthlyReviewAdminListRow,
  MonthlyReviewDecision,
  MonthlyReviewDecisionStatus,
} from "@/lib/monthly-reviews/types";

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

type DecisionRow = {
  id: string;
  review_id: string;
  status: MonthlyReviewDecisionStatus;
  amount: number | null;
  note: string;
  decided_by: string | null;
  decided_at: string | null;
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

function mapDecision(row: DecisionRow): MonthlyReviewDecision {
  return {
    id: row.id,
    reviewId: row.review_id,
    status: row.status,
    amount: row.amount,
    note: row.note,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
  };
}

export async function fetchMonthlyReviewListForAdminServer(
  admin: AdminClient,
  periodMonth: string,
): Promise<MonthlyReviewAdminListRow[]> {
  const { data: reviewRows, error } = await admin
    .from("monthly_reviews")
    .select("*")
    .eq("period_month", periodMonth)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  const reviews = (reviewRows ?? []) as MonthlyReviewRow[];
  if (!reviews.length) {
    return [];
  }

  const employeeIds = reviews.map((row) => row.employee_id);
  const [{ data: profileRows }, { data: decisionRows }] = await Promise.all([
    admin.from("profiles").select("*").in("id", employeeIds),
    admin
      .from("monthly_review_decisions")
      .select("*")
      .in(
        "review_id",
        reviews.map((row) => row.id),
      ),
  ]);

  const nameByEmployeeId = new Map(
    (profileRows ?? []).map((row) => [row.id as string, getUserDisplayName(mapProfileRow(row))]),
  );
  const decisionByReviewId = new Map(
    ((decisionRows ?? []) as DecisionRow[]).map((row) => [row.review_id, row.status]),
  );

  return reviews.map((row) => ({
    review: mapReview(row),
    employeeName: nameByEmployeeId.get(row.employee_id) ?? "—",
    decisionStatus: decisionByReviewId.get(row.id) ?? null,
  }));
}

export async function fetchMonthlyReviewDetailForAdminServer(
  admin: AdminClient,
  reviewId: string,
): Promise<MonthlyReviewAdminDetail | null> {
  const { data: reviewData, error: reviewError } = await admin
    .from("monthly_reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError) {
    throw new Error(reviewError.message);
  }
  if (!reviewData) {
    return null;
  }

  const review = mapReview(reviewData as MonthlyReviewRow);

  const [selfResult, managerResult, aiReport, decisionResult, employeeResult, managerProfileResult] =
    await Promise.all([
      admin.from("monthly_self_assessments").select("*").eq("review_id", reviewId).maybeSingle(),
      admin.from("monthly_manager_assessments").select("*").eq("review_id", reviewId).maybeSingle(),
      fetchAiReportByReviewId(admin, reviewId),
      admin.from("monthly_review_decisions").select("*").eq("review_id", reviewId).maybeSingle(),
      admin.from("profiles").select("*").eq("id", review.employeeId).maybeSingle(),
      review.managerId
        ? admin.from("profiles").select("*").eq("id", review.managerId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const managerRow = managerResult.data as ManagerAssessmentDbRow | null;

  return {
    review,
    employeeName: employeeResult.data ? getUserDisplayName(mapProfileRow(employeeResult.data)) : "—",
    managerName: managerProfileResult.data ? getUserDisplayName(mapProfileRow(managerProfileResult.data)) : null,
    selfAssessment: selfResult.data
      ? {
          id: selfResult.data.id,
          reviewId: selfResult.data.review_id,
          employeeId: selfResult.data.employee_id,
          periodMonth: selfResult.data.period_month,
          rating: selfResult.data.rating,
          comment: selfResult.data.comment,
          hoursContextSnapshot: selfResult.data.hours_context_snapshot ?? {},
          submittedAt: selfResult.data.submitted_at,
        }
      : null,
    managerAssessment: managerRow
      ? {
          id: managerRow.id,
          reviewId: managerRow.review_id,
          employeeId: managerRow.employee_id,
          managerId: managerRow.manager_id,
          periodMonth: managerRow.period_month,
          rating: managerRow.rating,
          comment: managerRow.comment,
          submittedAt: managerRow.submitted_at,
        }
      : null,
    aiReport,
    decision: decisionResult.data ? mapDecision(decisionResult.data as DecisionRow) : null,
  };
}

type ManagerAssessmentDbRow = {
  id: string;
  review_id: string;
  employee_id: string;
  manager_id: string;
  period_month: string;
  rating: number;
  comment: string;
  submitted_at: string;
};

export async function saveMonthlyReviewDecisionServer(
  admin: AdminClient,
  reviewId: string,
  input: { status: MonthlyReviewDecisionStatus; amount: number | null; note: string },
  decidedBy: string,
): Promise<MonthlyReviewDecision> {
  const decidedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("monthly_review_decisions")
    .upsert(
      {
        review_id: reviewId,
        status: input.status,
        amount: input.amount,
        note: input.note,
        decided_by: decidedBy,
        decided_at: decidedAt,
        updated_at: decidedAt,
      },
      { onConflict: "review_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapDecision(data as DecisionRow);
}

export async function shareAiReportWithEmployeeServer(admin: AdminClient, reviewId: string): Promise<void> {
  const { error } = await admin
    .from("monthly_review_ai_reports")
    .update({ shared_with_employee_at: new Date().toISOString() })
    .eq("review_id", reviewId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function resetManagerAssessmentServer(admin: AdminClient, reviewId: string): Promise<void> {
  const { error: deleteError } = await admin
    .from("monthly_manager_assessments")
    .delete()
    .eq("review_id", reviewId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: deleteReportError } = await admin
    .from("monthly_review_ai_reports")
    .delete()
    .eq("review_id", reviewId);
  if (deleteReportError) {
    throw new Error(deleteReportError.message);
  }

  const { error: updateError } = await admin
    .from("monthly_reviews")
    .update({ manager_submitted_at: null, manager_id: null, ai_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", reviewId);
  if (updateError) {
    throw new Error(updateError.message);
  }
}

export { formatPeriodMonthLabel };
