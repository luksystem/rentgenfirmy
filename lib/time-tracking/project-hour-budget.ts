import type { ProjectContractQuota } from "@/lib/settlements/types";

export type ProjectHourBudgetLine = {
  quotaId: string;
  label: string;
  budgetMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  utilizationPercent: number;
};

export type ProjectHourBudgetSummary = {
  totalBudgetMinutes: number;
  totalUsedMinutes: number;
  totalRemainingMinutes: number;
  utilizationPercent: number;
  overBudget: boolean;
  /** true gdy nie ma budżetu kontraktowego — pokazujemy tylko przepracowane godziny */
  usageOnly: boolean;
  lines: ProjectHourBudgetLine[];
};

function quotaToMinutes(quota: Pick<ProjectContractQuota, "quantity" | "unit">): number {
  if (quota.unit !== "hours") {
    return 0;
  }
  return Math.round(quota.quantity * 60);
}

export function buildProjectHourBudget(
  quotas: ProjectContractQuota[],
  usedMinutes: number,
  options?: { allowUsageOnly?: boolean },
): ProjectHourBudgetSummary | null {
  const hourQuotas = quotas.filter((quota) => quota.unit === "hours" && quota.quantity > 0);
  if (hourQuotas.length === 0) {
    if (!options?.allowUsageOnly) {
      return null;
    }
    const safeUsed = Math.max(0, Math.round(usedMinutes));
    return {
      totalBudgetMinutes: 0,
      totalUsedMinutes: safeUsed,
      totalRemainingMinutes: 0,
      utilizationPercent: 0,
      overBudget: false,
      usageOnly: true,
      lines: [
        {
          quotaId: "usage",
          label: "Czas pracy",
          budgetMinutes: 0,
          usedMinutes: safeUsed,
          remainingMinutes: 0,
          utilizationPercent: 0,
        },
      ],
    };
  }

  const totalBudgetMinutes = hourQuotas.reduce((sum, quota) => sum + quotaToMinutes(quota), 0);
  if (totalBudgetMinutes <= 0) {
    return null;
  }

  const lines: ProjectHourBudgetLine[] = hourQuotas.map((quota) => {
    const budgetMinutes = quotaToMinutes(quota);
    const share = budgetMinutes / totalBudgetMinutes;
    const lineUsedMinutes = Math.round(usedMinutes * share);
    const remainingMinutes = Math.max(0, budgetMinutes - lineUsedMinutes);
    const utilizationPercent = budgetMinutes > 0 ? Math.round((lineUsedMinutes / budgetMinutes) * 100) : 0;
    return {
      quotaId: quota.id,
      label: quota.label,
      budgetMinutes,
      usedMinutes: lineUsedMinutes,
      remainingMinutes,
      utilizationPercent,
    };
  });

  const totalRemainingMinutes = Math.max(0, totalBudgetMinutes - usedMinutes);
  const utilizationPercent = Math.round((usedMinutes / totalBudgetMinutes) * 100);

  return {
    totalBudgetMinutes,
    totalUsedMinutes: usedMinutes,
    totalRemainingMinutes,
    utilizationPercent,
    overBudget: usedMinutes > totalBudgetMinutes,
    usageOnly: false,
    lines,
  };
}

export function countBillableWorkMinutes(
  entries: Array<{ durationMinutes: number; status: string }>,
): number {
  return entries
    .filter((entry) => entry.status !== "rejected")
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
}
