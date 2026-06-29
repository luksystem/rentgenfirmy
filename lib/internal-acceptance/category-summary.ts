import type { InternalAcceptanceItemState } from "@/lib/internal-acceptance/types";

export function internalAcceptanceCategorySummary(items: InternalAcceptanceItemState[]) {
  const failed = items.filter((item) => item.status === "FAILED").length;
  const inProgress = items.filter((item) => item.status === "IN_PROGRESS").length;
  const complete = items.every(
    (item) => item.status === "PASSED" || item.status === "NOT_APPLICABLE",
  );

  let tone: "failed" | "progress" | "complete" | "idle" = "idle";
  if (failed > 0) {
    tone = "failed";
  } else if (complete && items.length > 0) {
    tone = "complete";
  } else if (inProgress > 0 || items.some((item) => item.status === "PASSED")) {
    tone = "progress";
  }

  return { failed, inProgress, complete, tone, total: items.length };
}
