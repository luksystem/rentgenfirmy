import type { ProjectSatisfactionBundle } from "@/lib/dashboard/satisfaction-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  type AgreementFulfillment,
  type FulfillmentStatus,
  type ProjectSatisfactionOverview,
  type ReviewSide,
  type SpecificationFulfillment,
  type StageSatisfaction,
} from "@/lib/dashboard/satisfaction-types";

function isMissingTableError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache")
  );
}

function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return ["pending", "met", "not_met", "partial"].includes(value);
}

function isReviewSide(value: string): value is ReviewSide {
  return value === "client" || value === "team";
}

export async function fetchProjectSatisfactionBundleServer(
  projectId: string,
): Promise<ProjectSatisfactionBundle | null> {
  const supabase = getSupabaseAdmin();

  const [
    { data: agreementRows, error: agreementError },
    { data: specRows, error: specError },
    { data: stageRows, error: stageError },
    { data: overviewRow, error: overviewError },
  ] = await Promise.all([
    supabase.from("project_agreement_fulfillments").select("*").eq("project_id", projectId),
    supabase.from("project_specification_fulfillments").select("*").eq("project_id", projectId),
    supabase.from("project_stage_satisfactions").select("*").eq("project_id", projectId),
    supabase.from("project_satisfaction_overviews").select("*").eq("project_id", projectId).maybeSingle(),
  ]);

  const errors = [agreementError, specError, stageError, overviewError].filter(Boolean);
  if (errors.some((error) => error && !isMissingTableError(error.message))) {
    throw new Error(errors[0]?.message ?? "Błąd pobierania ocen projektu.");
  }

  if (errors.every((error) => error && isMissingTableError(error.message))) {
    return null;
  }

  const agreementFulfillments: AgreementFulfillment[] = (agreementRows ?? []).map((row) => {
    const r = row as {
      id: string;
      project_id: string;
      agreement_id: string;
      status: string;
      note: string;
      reviewed_by_name: string;
      reviewed_by_side: string;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      projectId: r.project_id,
      agreementId: r.agreement_id,
      status: isFulfillmentStatus(r.status) ? r.status : "pending",
      note: r.note,
      reviewedByName: r.reviewed_by_name,
      reviewedBySide: isReviewSide(r.reviewed_by_side) ? r.reviewed_by_side : "client",
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  const specificationFulfillments: SpecificationFulfillment[] = (specRows ?? []).map((row) => {
    const r = row as {
      id: string;
      project_id: string;
      specification_item_id: string;
      status: string;
      note: string;
      reviewed_by_name: string;
      reviewed_by_side: string;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      projectId: r.project_id,
      specificationItemId: r.specification_item_id,
      status: isFulfillmentStatus(r.status) ? r.status : "pending",
      note: r.note,
      reviewedByName: r.reviewed_by_name,
      reviewedBySide: isReviewSide(r.reviewed_by_side) ? r.reviewed_by_side : "client",
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  const stageSatisfactions: StageSatisfaction[] = (stageRows ?? []).map((row) => {
    const r = row as {
      id: string;
      project_id: string;
      stage_id: string;
      stage_title: string;
      score: number;
      best_aspect: string;
      worst_aspect: string;
      comment: string;
      author_name: string;
      author_side: string;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      projectId: r.project_id,
      stageId: r.stage_id,
      stageTitle: r.stage_title,
      score: r.score,
      bestAspect: r.best_aspect,
      worstAspect: r.worst_aspect,
      comment: r.comment,
      authorName: r.author_name,
      authorSide: isReviewSide(r.author_side) ? r.author_side : "client",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  let overview: ProjectSatisfactionOverview | null = null;
  if (overviewRow) {
    const r = overviewRow as {
      project_id: string;
      expectation_score: number | null;
      reality_score: number | null;
      overall_note: string;
      reviewed_by_name: string;
      reviewed_by_side: string;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    };
    overview = {
      projectId: r.project_id,
      expectationScore: r.expectation_score,
      realityScore: r.reality_score,
      overallNote: r.overall_note,
      reviewedByName: r.reviewed_by_name,
      reviewedBySide: isReviewSide(r.reviewed_by_side) ? r.reviewed_by_side : "client",
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  return {
    agreementFulfillments,
    specificationFulfillments,
    stageSatisfactions,
    overview,
  };
}

export async function satisfactionTablesExist() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("project_agreement_fulfillments").select("id").limit(1);
  if (!error) {
    return true;
  }
  return !isMissingTableError(error.message);
}
