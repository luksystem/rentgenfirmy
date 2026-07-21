import type { ProjectContractQuota } from "@/lib/settlements/types";

export type ProjectHourBudgetLine = {
  quotaId: string;
  label: string;
  /** Opis deklaracji z kontraktu */
  notes?: string;
  /** Nazwa kategorii czasu pracy (jeśli powiązana) */
  categoryName?: string | null;
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
  /** Minuty w kategoriach niepowiązanych z żadną deklaracją godzinową */
  unmatchedUsedMinutes: number;
};

export type HourBudgetTimeEntry = {
  durationMinutes: number;
  status: string;
  categoryId?: string | null;
};

function quotaToMinutes(quota: Pick<ProjectContractQuota, "quantity" | "unit">): number {
  if (quota.unit !== "hours") {
    return 0;
  }
  return Math.round(quota.quantity * 60);
}

export function countBillableWorkMinutes(entries: HourBudgetTimeEntry[]): number {
  return entries
    .filter((entry) => entry.status !== "rejected")
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
}

function countMinutesByCategory(entries: HourBudgetTimeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === "rejected") continue;
    const key = entry.categoryId?.trim() || "";
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + entry.durationMinutes);
  }
  return map;
}

/**
 * Budżet godzin: zużycie liczone wg kategorii czasu przypisanej do deklaracji kontraktu.
 * Wcześniej dzielono proporcjonalnie cały czas projektu — to było mylące.
 *
 * Gdy przekazano samą liczbę minut (bez wpisów), linie kategorii mają 0 — nie zgadujemy proporcji.
 */
export function buildProjectHourBudget(
  quotas: ProjectContractQuota[],
  entriesOrUsedMinutes: HourBudgetTimeEntry[] | number,
  options?: {
    allowUsageOnly?: boolean;
    categoryNames?: Record<string, string>;
  },
): ProjectHourBudgetSummary | null {
  const hasEntryBreakdown = Array.isArray(entriesOrUsedMinutes);
  const entries: HourBudgetTimeEntry[] = hasEntryBreakdown ? entriesOrUsedMinutes : [];
  const totalProjectUsedMinutes = hasEntryBreakdown
    ? countBillableWorkMinutes(entries)
    : Math.max(0, Math.round(entriesOrUsedMinutes));

  const hourQuotas = quotas.filter((quota) => quota.unit === "hours" && quota.quantity > 0);
  if (hourQuotas.length === 0) {
    if (!options?.allowUsageOnly) {
      return null;
    }
    return {
      totalBudgetMinutes: 0,
      totalUsedMinutes: totalProjectUsedMinutes,
      totalRemainingMinutes: 0,
      utilizationPercent: 0,
      overBudget: false,
      usageOnly: true,
      unmatchedUsedMinutes: 0,
      lines: [
        {
          quotaId: "usage",
          label: "Czas pracy",
          budgetMinutes: 0,
          usedMinutes: totalProjectUsedMinutes,
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

  const byCategory = hasEntryBreakdown ? countMinutesByCategory(entries) : new Map<string, number>();
  const linkedCategoryIds = new Set(
    hourQuotas.map((quota) => quota.timeCategoryId).filter((id): id is string => Boolean(id)),
  );
  // Jedna kategoria → jedna pozycja (pierwsza wg kolejności), żeby nie dublować minut w sumie.
  const claimedCategories = new Set<string>();

  const lines: ProjectHourBudgetLine[] = hourQuotas.map((quota) => {
    const budgetMinutes = quotaToMinutes(quota);
    const categoryId = quota.timeCategoryId;
    let lineUsedMinutes = 0;
    if (hasEntryBreakdown && categoryId) {
      if (!claimedCategories.has(categoryId)) {
        lineUsedMinutes = Math.round(byCategory.get(categoryId) ?? 0);
        claimedCategories.add(categoryId);
      }
    }
    const remainingMinutes = Math.max(0, budgetMinutes - lineUsedMinutes);
    const utilizationPercent =
      budgetMinutes > 0 ? Math.round((lineUsedMinutes / budgetMinutes) * 100) : 0;
    return {
      quotaId: quota.id,
      label: quota.label,
      notes: quota.notes?.trim() || undefined,
      categoryName: categoryId ? (options?.categoryNames?.[categoryId] ?? null) : null,
      budgetMinutes,
      usedMinutes: lineUsedMinutes,
      remainingMinutes,
      utilizationPercent,
    };
  });

  let unmatchedUsedMinutes = 0;
  if (hasEntryBreakdown) {
    for (const [categoryId, minutes] of byCategory) {
      if (!linkedCategoryIds.has(categoryId)) {
        unmatchedUsedMinutes += minutes;
      }
    }
    unmatchedUsedMinutes += entries
      .filter((entry) => entry.status !== "rejected" && !entry.categoryId?.trim())
      .reduce((sum, entry) => sum + entry.durationMinutes, 0);
  } else {
    unmatchedUsedMinutes = totalProjectUsedMinutes;
  }

  const attributedUsed = lines.reduce((sum, line) => sum + line.usedMinutes, 0);
  const totalUsedMinutes = hasEntryBreakdown ? attributedUsed : totalProjectUsedMinutes;
  const totalRemainingMinutes = Math.max(0, totalBudgetMinutes - totalUsedMinutes);
  const utilizationPercent =
    totalBudgetMinutes > 0 ? Math.round((totalUsedMinutes / totalBudgetMinutes) * 100) : 0;

  return {
    totalBudgetMinutes,
    totalUsedMinutes,
    totalRemainingMinutes,
    utilizationPercent,
    overBudget: totalUsedMinutes > totalBudgetMinutes,
    usageOnly: false,
    unmatchedUsedMinutes,
    lines,
  };
}
