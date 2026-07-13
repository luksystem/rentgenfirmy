import type { FunctionalitySurvey } from "@/lib/client-functionality/types";

export function isFunctionalitySurveyPendingTeamReview(
  survey: Pick<FunctionalitySurvey, "status" | "teamReviewedAt"> | null | undefined,
) {
  return survey?.status === "completed" && !survey.teamReviewedAt;
}
