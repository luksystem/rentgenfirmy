import type { UserProfile, UserProfileInput, UserRole } from "@/lib/auth/types";
import type { ProfileInsert, ProfileRow, ProfileUpdate } from "@/lib/supabase/database.types";

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    role: row.role as UserRole,
    isActive: row.is_active,
    dailyHoursLimit: row.daily_hours_limit,
    weeklyHoursLimit: row.weekly_hours_limit,
    baseLocation: row.base_location,
    costRate: row.cost_rate,
    isAvailableForPlanning: row.is_available_for_planning,
    supervisorId: row.supervisor_id,
    allProjectsAccess: row.all_projects_access !== false,
    avatarUrl: row.avatar_url ?? null,
    aboutMe: row.about_me ?? "",
    monthlyReviewEnabled: row.monthly_review_enabled !== false,
    offerApprovalBypass: row.offer_approval_bypass === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileInputToInsert(
  id: string,
  input: UserProfileInput,
): ProfileInsert {
  return {
    id,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    is_active: input.isActive,
    daily_hours_limit: input.dailyHoursLimit ?? null,
    weekly_hours_limit: input.weeklyHoursLimit ?? null,
    base_location: input.baseLocation?.trim() ?? "",
    cost_rate: input.costRate ?? null,
    is_available_for_planning: input.isAvailableForPlanning ?? true,
    supervisor_id: input.supervisorId ?? null,
    all_projects_access: input.role === "podwykonawca" ? false : undefined,
    monthly_review_enabled: input.monthlyReviewEnabled ?? input.role !== "administrator",
    offer_approval_bypass: input.offerApprovalBypass ?? false,
  };
}

export function mapProfileInputToUpdate(input: UserProfileInput): ProfileUpdate {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    is_active: input.isActive,
    daily_hours_limit: input.dailyHoursLimit ?? null,
    weekly_hours_limit: input.weeklyHoursLimit ?? null,
    base_location: input.baseLocation?.trim() ?? "",
    cost_rate: input.costRate ?? null,
    is_available_for_planning: input.isAvailableForPlanning ?? true,
    supervisor_id: input.supervisorId ?? null,
    monthly_review_enabled: input.monthlyReviewEnabled ?? input.role !== "administrator",
    offer_approval_bypass: input.offerApprovalBypass ?? false,
    updated_at: new Date().toISOString(),
  };
}
