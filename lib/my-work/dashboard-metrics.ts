import { getUserDisplayName } from "@/lib/auth/types";
import type { UserProfile } from "@/lib/auth/types";
import type { WorkPlanView } from "@/lib/my-work/plan-types";
import { itemIsOverdue, itemNeedsReaction } from "@/lib/my-work/section-filters";
import type { WorkItemView } from "@/lib/my-work/types";

export type WorkObstacleRow = {
  id: string;
  workItemId: string | null;
  workItemTitle: string | null;
  obstacleType: string;
  description: string;
  severity: string;
  reportedByName: string;
  createdAt: string;
};

export type WorkAssigneeLoadRow = {
  userId: string;
  name: string;
  openCount: number;
  overdueCount: number;
  blockedCount: number;
  pendingVerificationCount: number;
};

export type WorkDashboardMetrics = {
  totalOpen: number;
  overdueCount: number;
  blockedCount: number;
  pendingAckCount: number;
  pendingVerificationCount: number;
  openObstaclesCount: number;
  weekPlansAwaitingAck: number;
  completedThisWeek: number;
  aiGeneratedCount: number;
  bySourceType: { code: string; label: string; count: number }[];
  reactionQueue: WorkItemView[];
  overdueQueue: WorkItemView[];
  verificationQueue: WorkItemView[];
  obstacleRows: WorkObstacleRow[];
  assigneeLoad: WorkAssigneeLoadRow[];
  weekPlansPending: WorkPlanView[];
};

function isCompletedThisWeek(item: WorkItemView, now = new Date()) {
  if (item.status !== "verified" && item.status !== "done") {
    return false;
  }
  const completedAt = item.completedAt ?? item.verifiedAt ?? item.updatedAt;
  if (!completedAt) return false;
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return new Date(completedAt) >= weekAgo;
}

export function computeMyWorkDashboardMetrics(params: {
  items: WorkItemView[];
  obstacles: WorkObstacleRow[];
  weekPlans: WorkPlanView[];
  profilesById: Record<string, UserProfile>;
  now?: Date;
}): WorkDashboardMetrics {
  const { items, obstacles, weekPlans, profilesById } = params;
  const now = params.now ?? new Date();

  const openItems = items.filter(
    (item) => !["verified", "cancelled", "not_done"].includes(item.status),
  );

  const overdueQueue = openItems.filter((item) => itemIsOverdue(item, now));
  const blockedCount = openItems.filter((item) => item.status === "blocked").length;
  const pendingAckCount = openItems.filter(
    (item) => item.status === "sent" || item.status === "pending_ack",
  ).length;
  const verificationQueue = openItems.filter((item) => item.status === "pending_verification");
  const reactionQueue = openItems.filter((item) => itemNeedsReaction(item)).slice(0, 8);

  const sourceMap = new Map<string, { code: string; label: string; count: number }>();
  for (const item of openItems) {
    const code = item.sourceType;
    const label = item.sourceTypeMeta?.label ?? code;
    const entry = sourceMap.get(code) ?? { code, label, count: 0 };
    entry.count += 1;
    sourceMap.set(code, entry);
  }

  const assigneeIds = [...new Set(openItems.map((item) => item.assignedUserId))];
  const assigneeLoad: WorkAssigneeLoadRow[] = assigneeIds.map((userId) => {
    const userItems = openItems.filter((item) => item.assignedUserId === userId);
    return {
      userId,
      name: profilesById[userId]
        ? getUserDisplayName(profilesById[userId])
        : "Nieznany",
      openCount: userItems.length,
      overdueCount: userItems.filter((item) => itemIsOverdue(item, now)).length,
      blockedCount: userItems.filter((item) => item.status === "blocked").length,
      pendingVerificationCount: userItems.filter((item) => item.status === "pending_verification")
        .length,
    };
  }).sort((a, b) => b.overdueCount - a.overdueCount || b.openCount - a.openCount);

  const weekPlansPending = weekPlans.filter((plan) => plan.status === "sent");

  return {
    totalOpen: openItems.length,
    overdueCount: overdueQueue.length,
    blockedCount,
    pendingAckCount,
    pendingVerificationCount: verificationQueue.length,
    openObstaclesCount: obstacles.length,
    weekPlansAwaitingAck: weekPlansPending.length,
    completedThisWeek: items.filter((item) => isCompletedThisWeek(item, now)).length,
    aiGeneratedCount: openItems.filter((item) => item.aiGenerated).length,
    bySourceType: [...sourceMap.values()].sort((a, b) => b.count - a.count),
    reactionQueue,
    overdueQueue: overdueQueue.slice(0, 8),
    verificationQueue: verificationQueue.slice(0, 8),
    obstacleRows: obstacles.slice(0, 8),
    assigneeLoad,
    weekPlansPending,
  };
}
