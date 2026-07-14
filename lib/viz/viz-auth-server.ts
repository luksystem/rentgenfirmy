import { isAdministratorRole, type UserRole } from "@/lib/auth/types";
import { HttpError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_VIZ_PERMISSIONS_BY_ROLE,
  type VizAccessRole,
  type VizDashboardPermissions,
} from "@/lib/viz/types";

export type VizAccessContext = {
  dashboardId: string;
  userId: string;
  profileRole: UserRole;
  accessRole: VizAccessRole;
  permissions: VizDashboardPermissions;
  canManage: boolean;
};

function mergePermissions(
  accessRole: VizAccessRole,
  permissionsJson: Record<string, unknown> | null | undefined,
): VizDashboardPermissions {
  const defaults = DEFAULT_VIZ_PERMISSIONS_BY_ROLE[accessRole] ?? {};
  const overrides = permissionsJson ?? {};
  return { ...defaults, ...(overrides as VizDashboardPermissions) };
}

export function resolveInternalVizAccessRole(profileRole: UserRole): VizAccessRole | null {
  if (isAdministratorRole(profileRole)) {
    return "admin";
  }
  if (profileRole === "manager") {
    return "admin";
  }
  if (profileRole === "pracownik") {
    return "operator";
  }
  if (profileRole === "podwykonawca") {
    return "service";
  }
  return null;
}

export async function resolveVizAccessContext(
  dashboardId: string,
  userId: string,
  profileRole: UserRole,
): Promise<VizAccessContext | null> {
  const internalRole = resolveInternalVizAccessRole(profileRole);
  if (internalRole) {
    return {
      dashboardId,
      userId,
      profileRole,
      accessRole: internalRole,
      permissions: DEFAULT_VIZ_PERMISSIONS_BY_ROLE[internalRole],
      canManage: internalRole === "admin" || internalRole === "operator",
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_access")
    .select("access_role, permissions_json")
    .eq("dashboard_id", dashboardId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const accessRole = data.access_role as VizAccessRole;
  const permissionsJson =
    data.permissions_json && typeof data.permissions_json === "object" && !Array.isArray(data.permissions_json)
      ? (data.permissions_json as Record<string, unknown>)
      : {};

  return {
    dashboardId,
    userId,
    profileRole,
    accessRole,
    permissions: mergePermissions(accessRole, permissionsJson),
    canManage: accessRole === "admin" || accessRole === "operator",
  };
}

export async function requireVizAccessContext(
  dashboardId: string,
  userId: string,
  profileRole: UserRole,
): Promise<VizAccessContext> {
  const context = await resolveVizAccessContext(dashboardId, userId, profileRole);
  if (!context?.permissions.viewDashboard) {
    throw new HttpError(403, "Brak dostępu do tego dashboardu.");
  }
  return context;
}

export async function requireVizPermission(
  dashboardId: string,
  userId: string,
  profileRole: UserRole,
  permission: keyof VizDashboardPermissions,
): Promise<VizAccessContext> {
  const context = await requireVizAccessContext(dashboardId, userId, profileRole);
  if (!context.permissions[permission]) {
    throw new HttpError(403, "Brak uprawnień do tej operacji.");
  }
  return context;
}

export async function listAccessibleVizDashboardIds(userId: string, profileRole: UserRole) {
  if (resolveInternalVizAccessRole(profileRole)) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_access")
    .select("dashboard_id")
    .eq("profile_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.dashboard_id);
}

export async function listVizAccessCandidateProfiles() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .eq("is_active", true)
    .order("last_name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email,
    email: row.email,
    role: row.role,
  }));
}
