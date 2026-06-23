import type {
  AgreementFulfillment,
  AgreementFulfillmentInput,
  ProjectSatisfactionBundle,
  ProjectSatisfactionOverview,
  ProjectSatisfactionOverviewInput,
  ReviewSide,
  SpecificationFulfillment,
  SpecificationFulfillmentInput,
  StageSatisfaction,
  StageSatisfactionInput,
} from "@/lib/dashboard/satisfaction-types";
import type { FulfillmentStatus } from "@/lib/dashboard/satisfaction-types";
import { getSupabase } from "@/lib/supabase/client";

type AgreementFulfillmentRow = {
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

type SpecificationFulfillmentRow = {
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

type StageSatisfactionRow = {
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

type OverviewRow = {
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

function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return ["pending", "met", "not_met", "partial"].includes(value);
}

function isReviewSide(value: string): value is ReviewSide {
  return value === "client" || value === "team";
}

function rowToAgreementFulfillment(row: AgreementFulfillmentRow): AgreementFulfillment {
  return {
    id: row.id,
    projectId: row.project_id,
    agreementId: row.agreement_id,
    status: isFulfillmentStatus(row.status) ? row.status : "pending",
    note: row.note,
    reviewedByName: row.reviewed_by_name,
    reviewedBySide: isReviewSide(row.reviewed_by_side) ? row.reviewed_by_side : "client",
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSpecificationFulfillment(row: SpecificationFulfillmentRow): SpecificationFulfillment {
  return {
    id: row.id,
    projectId: row.project_id,
    specificationItemId: row.specification_item_id,
    status: isFulfillmentStatus(row.status) ? row.status : "pending",
    note: row.note,
    reviewedByName: row.reviewed_by_name,
    reviewedBySide: isReviewSide(row.reviewed_by_side) ? row.reviewed_by_side : "client",
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToStageSatisfaction(row: StageSatisfactionRow): StageSatisfaction {
  return {
    id: row.id,
    projectId: row.project_id,
    stageId: row.stage_id,
    stageTitle: row.stage_title,
    score: row.score,
    bestAspect: row.best_aspect,
    worstAspect: row.worst_aspect,
    comment: row.comment,
    authorName: row.author_name,
    authorSide: isReviewSide(row.author_side) ? row.author_side : "client",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOverview(row: OverviewRow): ProjectSatisfactionOverview {
  return {
    projectId: row.project_id,
    expectationScore: row.expectation_score,
    realityScore: row.reality_score,
    overallNote: row.overall_note,
    reviewedByName: row.reviewed_by_name,
    reviewedBySide: isReviewSide(row.reviewed_by_side) ? row.reviewed_by_side : "client",
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectSatisfactionBundle(
  projectId: string,
): Promise<ProjectSatisfactionBundle> {
  const supabase = getSupabase();

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

  if (agreementError) throw new Error(agreementError.message);
  if (specError) throw new Error(specError.message);
  if (stageError) throw new Error(stageError.message);
  if (overviewError) throw new Error(overviewError.message);

  return {
    agreementFulfillments: (agreementRows ?? []).map((row) =>
      rowToAgreementFulfillment(row as AgreementFulfillmentRow),
    ),
    specificationFulfillments: (specRows ?? []).map((row) =>
      rowToSpecificationFulfillment(row as SpecificationFulfillmentRow),
    ),
    stageSatisfactions: (stageRows ?? []).map((row) =>
      rowToStageSatisfaction(row as StageSatisfactionRow),
    ),
    overview: overviewRow ? rowToOverview(overviewRow as OverviewRow) : null,
  };
}

export async function upsertAgreementFulfillment(
  projectId: string,
  input: AgreementFulfillmentInput,
): Promise<AgreementFulfillment> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("project_agreement_fulfillments")
    .select("id")
    .eq("project_id", projectId)
    .eq("agreement_id", input.agreementId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("project_agreement_fulfillments")
    .upsert(
      {
        id: (existing as { id?: string } | null)?.id ?? crypto.randomUUID(),
        project_id: projectId,
        agreement_id: input.agreementId,
        status: input.status,
        note: input.note?.trim() ?? "",
        reviewed_by_name: input.reviewedByName.trim(),
        reviewed_by_side: input.reviewedBySide,
        reviewed_at: input.status !== "pending" ? now : null,
        updated_at: now,
      },
      { onConflict: "project_id,agreement_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAgreementFulfillment(data as AgreementFulfillmentRow);
}

export async function upsertSpecificationFulfillment(
  projectId: string,
  input: SpecificationFulfillmentInput,
): Promise<SpecificationFulfillment> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("project_specification_fulfillments")
    .select("id")
    .eq("project_id", projectId)
    .eq("specification_item_id", input.specificationItemId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("project_specification_fulfillments")
    .upsert(
      {
        id: (existing as { id?: string } | null)?.id ?? crypto.randomUUID(),
        project_id: projectId,
        specification_item_id: input.specificationItemId,
        status: input.status,
        note: input.note?.trim() ?? "",
        reviewed_by_name: input.reviewedByName.trim(),
        reviewed_by_side: input.reviewedBySide,
        reviewed_at: input.status !== "pending" ? now : null,
        updated_at: now,
      },
      { onConflict: "project_id,specification_item_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSpecificationFulfillment(data as SpecificationFulfillmentRow);
}

export async function upsertStageSatisfaction(
  projectId: string,
  input: StageSatisfactionInput,
): Promise<StageSatisfaction> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const score = Math.max(0, Math.min(10, Math.round(input.score)));

  const { data: existing } = await supabase
    .from("project_stage_satisfactions")
    .select("id")
    .eq("project_id", projectId)
    .eq("stage_id", input.stageId)
    .eq("author_side", input.authorSide)
    .maybeSingle();

  const { data, error } = await supabase
    .from("project_stage_satisfactions")
    .upsert(
      {
        id: (existing as { id?: string } | null)?.id ?? crypto.randomUUID(),
        project_id: projectId,
        stage_id: input.stageId,
        stage_title: input.stageTitle.trim(),
        score,
        best_aspect: input.bestAspect?.trim() ?? "",
        worst_aspect: input.worstAspect?.trim() ?? "",
        comment: input.comment?.trim() ?? "",
        author_name: input.authorName.trim(),
        author_side: input.authorSide,
        updated_at: now,
      },
      { onConflict: "project_id,stage_id,author_side" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToStageSatisfaction(data as StageSatisfactionRow);
}

export async function upsertProjectSatisfactionOverview(
  projectId: string,
  input: ProjectSatisfactionOverviewInput,
): Promise<ProjectSatisfactionOverview> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_satisfaction_overviews")
    .upsert(
      {
        project_id: projectId,
        expectation_score: input.expectationScore,
        reality_score: input.realityScore,
        overall_note: input.overallNote?.trim() ?? "",
        reviewed_by_name: input.reviewedByName.trim(),
        reviewed_by_side: input.reviewedBySide,
        reviewed_at: now,
        updated_at: now,
      },
      { onConflict: "project_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToOverview(data as OverviewRow);
}
