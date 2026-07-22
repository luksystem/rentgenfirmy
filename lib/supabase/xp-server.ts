import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName } from "@/lib/auth/types";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import { resolveLevel } from "@/lib/xp/levels";
import type {
  XpCategory,
  XpCategoryBreakdown,
  XpCriterion,
  XpEmployeeSummary,
  XpLeaderboardRow,
  XpLedgerEntry,
  XpLedgerSourceType,
} from "@/lib/xp/types";

type AdminClient = SupabaseClient;

type XpCategoryRow = {
  id: string;
  key: string;
  label: string;
  color: string;
  icon: string;
  sort_order: number;
};

type XpCriterionRow = {
  id: string;
  category_id: string;
  key: string;
  label: string;
  description: string;
  points: number;
  is_active: boolean;
};

type XpLedgerEntryRow = {
  id: string;
  employee_id: string;
  criterion_id: string | null;
  category_id: string | null;
  points: number;
  reason: string;
  source_type: XpLedgerSourceType;
  source_id: string | null;
  created_at: string;
};

function mapCategory(row: XpCategoryRow): XpCategory {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

function mapCriterion(row: XpCriterionRow): XpCriterion {
  return {
    id: row.id,
    categoryId: row.category_id,
    key: row.key,
    label: row.label,
    description: row.description,
    points: row.points,
    isActive: row.is_active,
  };
}

function mapLedgerEntry(row: XpLedgerEntryRow): XpLedgerEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    criterionId: row.criterion_id,
    categoryId: row.category_id,
    points: row.points,
    reason: row.reason,
    sourceType: row.source_type,
    sourceId: row.source_id,
    createdAt: row.created_at,
  };
}

export async function fetchXpCategoriesServer(admin: AdminClient): Promise<XpCategory[]> {
  const { data, error } = await admin.from("xp_categories").select("*").order("sort_order");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapCategory(row as XpCategoryRow));
}

export async function fetchXpCriteriaServer(admin: AdminClient): Promise<XpCriterion[]> {
  const { data, error } = await admin.from("xp_criteria").select("*").order("key");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapCriterion(row as XpCriterionRow));
}

/**
 * Nagradza pracownika punktami za dane kryterium. Nigdy nie rzuca — nagradzanie XP
 * nie może wywrócić głównej operacji, którą "dosiada" (submit samooceny, akceptacja
 * timesheetu itd.). Woła się z `.catch(() => undefined)` albo w try/catch po stronie
 * wołającego, ale i tak jest bezpieczne samo w sobie.
 */
export async function awardXpServer(
  admin: AdminClient,
  input: {
    employeeId: string;
    criterionKey: string;
    ratingForScaling?: number;
    reason?: string;
    sourceId?: string;
  },
): Promise<void> {
  try {
    const { data: criterionRow, error } = await admin
      .from("xp_criteria")
      .select("*")
      .eq("key", input.criterionKey)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !criterionRow) {
      return;
    }
    const criterion = mapCriterion(criterionRow as XpCriterionRow);
    const points = input.ratingForScaling
      ? Math.round(criterion.points * input.ratingForScaling)
      : criterion.points;
    if (!points) {
      return;
    }

    await admin.from("xp_ledger_entries").insert({
      employee_id: input.employeeId,
      criterion_id: criterion.id,
      category_id: criterion.categoryId,
      points,
      reason: input.reason ?? criterion.label,
      source_type: "criterion",
      source_id: input.sourceId ?? null,
    });
  } catch {
    // Nagradzanie XP nigdy nie blokuje głównej operacji.
  }
}

export async function fetchEmployeeXpSummaryServer(
  admin: AdminClient,
  employeeId: string,
): Promise<XpEmployeeSummary> {
  const [categories, { data: entriesData, error }] = await Promise.all([
    fetchXpCategoriesServer(admin),
    admin
      .from("xp_ledger_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);
  if (error) {
    throw new Error(error.message);
  }

  const history = (entriesData ?? []).map((row) => mapLedgerEntry(row as XpLedgerEntryRow));
  const totalPoints = history.reduce((sum, entry) => sum + entry.points, 0);

  const pointsByCategory = new Map<string, number>();
  for (const entry of history) {
    if (!entry.categoryId) continue;
    pointsByCategory.set(entry.categoryId, (pointsByCategory.get(entry.categoryId) ?? 0) + entry.points);
  }
  const breakdown: XpCategoryBreakdown[] = categories
    .map((category) => ({ category, points: pointsByCategory.get(category.id) ?? 0 }))
    .filter((entry) => entry.points !== 0)
    .sort((a, b) => b.points - a.points);

  return {
    employeeId,
    totalPoints,
    level: resolveLevel(totalPoints),
    breakdown,
    history,
  };
}

export async function fetchXpLeaderboardServer(admin: AdminClient): Promise<XpLeaderboardRow[]> {
  const [profiles, { data: entriesData, error }] = await Promise.all([
    fetchTeamProfilesServer(),
    admin.from("xp_ledger_entries").select("employee_id, points"),
  ]);
  if (error) {
    throw new Error(error.message);
  }

  const totalsByEmployeeId = new Map<string, number>();
  for (const row of (entriesData ?? []) as Array<{ employee_id: string; points: number }>) {
    totalsByEmployeeId.set(row.employee_id, (totalsByEmployeeId.get(row.employee_id) ?? 0) + row.points);
  }

  return profiles
    .map((profile) => {
      const totalPoints = totalsByEmployeeId.get(profile.id) ?? 0;
      return {
        employeeId: profile.id,
        employeeName: getUserDisplayName(profile),
        avatarUrl: profile.avatarUrl,
        totalPoints,
        level: resolveLevel(totalPoints),
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
