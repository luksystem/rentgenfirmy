export const FULFILLMENT_STATUSES = ["pending", "met", "not_met", "partial"] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export type ReviewSide = "client" | "team";

export type AgreementFulfillment = {
  id: string;
  projectId: string;
  agreementId: string;
  status: FulfillmentStatus;
  note: string;
  reviewedByName: string;
  reviewedBySide: ReviewSide;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SpecificationFulfillment = {
  id: string;
  projectId: string;
  specificationItemId: string;
  status: FulfillmentStatus;
  note: string;
  reviewedByName: string;
  reviewedBySide: ReviewSide;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StageSatisfaction = {
  id: string;
  projectId: string;
  stageId: string;
  stageTitle: string;
  score: number;
  bestAspect: string;
  worstAspect: string;
  comment: string;
  authorName: string;
  authorSide: ReviewSide;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSatisfactionOverview = {
  projectId: string;
  expectationScore: number | null;
  realityScore: number | null;
  overallNote: string;
  reviewedByName: string;
  reviewedBySide: ReviewSide;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSatisfactionBundle = {
  agreementFulfillments: AgreementFulfillment[];
  specificationFulfillments: SpecificationFulfillment[];
  stageSatisfactions: StageSatisfaction[];
  overview: ProjectSatisfactionOverview | null;
};

export type AgreementFulfillmentInput = {
  agreementId: string;
  status: FulfillmentStatus;
  note?: string;
  reviewedByName: string;
  reviewedBySide: ReviewSide;
};

export type SpecificationFulfillmentInput = {
  specificationItemId: string;
  status: FulfillmentStatus;
  note?: string;
  reviewedByName: string;
  reviewedBySide: ReviewSide;
};

export type StageSatisfactionInput = {
  stageId: string;
  stageTitle: string;
  score: number;
  bestAspect?: string;
  worstAspect?: string;
  comment?: string;
  authorName: string;
  authorSide: ReviewSide;
};

export type ProjectSatisfactionOverviewInput = {
  expectationScore: number | null;
  realityScore: number | null;
  overallNote?: string;
  reviewedByName: string;
  reviewedBySide: ReviewSide;
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  pending: "Do oceny",
  met: "Spełnione",
  not_met: "Niespełnione",
  partial: "Częściowo",
};

export function computeSatisfactionSummary(bundle: ProjectSatisfactionBundle) {
  const stageScores = bundle.stageSatisfactions
    .map((entry) => entry.score)
    .filter((score) => score > 0);

  const avgStageScore =
    stageScores.length > 0
      ? Math.round((stageScores.reduce((sum, score) => sum + score, 0) / stageScores.length) * 10) / 10
      : null;

  const agreementTotal = bundle.agreementFulfillments.length;
  const agreementMet = bundle.agreementFulfillments.filter(
    (entry) => entry.status === "met" || entry.status === "partial",
  ).length;

  const specTotal = bundle.specificationFulfillments.length;
  const specMet = bundle.specificationFulfillments.filter(
    (entry) => entry.status === "met" || entry.status === "partial",
  ).length;

  const fulfillmentTotal = agreementTotal + specTotal;
  const fulfillmentMet = agreementMet + specMet;
  const fulfillmentPercent =
    fulfillmentTotal > 0 ? Math.round((fulfillmentMet / fulfillmentTotal) * 100) : null;

  const overview = bundle.overview;
  const expectationGap =
    overview?.expectationScore != null && overview?.realityScore != null
      ? overview.realityScore - overview.expectationScore
      : null;

  return {
    avgStageScore,
    stageCount: stageScores.length,
    fulfillmentTotal,
    fulfillmentMet,
    fulfillmentPercent,
    expectationScore: overview?.expectationScore ?? null,
    realityScore: overview?.realityScore ?? null,
    expectationGap,
  };
}
