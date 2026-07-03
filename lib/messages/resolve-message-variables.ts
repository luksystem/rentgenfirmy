import { getUserDisplayName } from "@/lib/auth/types";
import { absoluteAppUrl, getAppBaseUrl } from "@/lib/messages/app-url";
import type { SmsRuleTrigger } from "@/lib/sms/sms-rules";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageVariableContext = {
  trigger: SmsRuleTrigger;
  clientId?: string;
  userId?: string;
  projectId?: string;
  phone?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string;
};

async function fetchClientFields(
  supabase: SupabaseClient,
  clientId: string,
) {
  const { data } = await supabase
    .from("clients")
    .select("phone, full_name, email, location")
    .eq("id", clientId)
    .maybeSingle();

  return {
    phone: data?.phone?.trim() ?? "",
    fullName: data?.full_name?.trim() ?? "",
    email: data?.email?.trim() ?? "",
    location: data?.location?.trim() ?? "",
  };
}

async function fetchProfileFields(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("phone, first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  const firstName = data?.first_name?.trim() ?? "";
  const lastName = data?.last_name?.trim() ?? "";
  const email = data?.email?.trim() ?? "";

  return {
    phone: data?.phone?.trim() ?? "",
    firstName,
    lastName,
    email,
    fullName: `${firstName} ${lastName}`.trim() || email,
  };
}

async function fetchPublicSpaceUrl(
  supabase: SupabaseClient,
  filters: {
    clientId?: string | null;
    projectId?: string | null;
    profileId?: string | null;
    kind: "client" | "team" | "employee";
  },
) {
  let query = supabase
    .from("dashboard_spaces")
    .select("public_token, public_enabled")
    .eq("kind", filters.kind)
    .order("public_enabled", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (filters.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters.profileId) {
    query = query.eq("profile_id", filters.profileId);
  }

  const { data } = await query.limit(1);
  const row = data?.[0];
  const token = row?.public_token?.trim();
  return token ? absoluteAppUrl(`/przestrzen/${token}`) : "";
}

async function fetchKanbanUrlForProject(supabase: SupabaseClient, projectId: string) {
  const { data: items } = await supabase
    .from("project_process_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("kind", "kanban")
    .limit(1);

  const itemId = items?.[0]?.id;
  if (!itemId) {
    return "";
  }

  const { data: board } = await supabase
    .from("process_kanban_boards")
    .select("public_token, public_enabled")
    .eq("project_process_item_id", itemId)
    .maybeSingle();

  const token = board?.public_token?.trim();
  return token ? absoluteAppUrl(`/kanban/${token}`) : "";
}

export async function ensureEmployeeDashboardSpaceServer(
  supabase: SupabaseClient,
  input: { profileId: string; displayName: string },
) {
  const { data: existing } = await supabase
    .from("dashboard_spaces")
    .select("id")
    .eq("kind", "employee")
    .eq("profile_id", input.profileId)
    .maybeSingle();

  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("dashboard_spaces").insert({
    id: crypto.randomUUID(),
    kind: "employee",
    profile_id: input.profileId,
    title: `Przestrzeń — ${input.displayName}`,
    public_enabled: false,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveMessageTemplateVariables(
  supabase: SupabaseClient,
  context: MessageVariableContext,
): Promise<Record<string, string>> {
  let phone = context.phone?.trim() ?? "";
  let fullName = context.fullName?.trim() ?? "";
  let firstName = context.firstName?.trim() ?? "";
  let lastName = context.lastName?.trim() ?? "";
  let email = context.email?.trim() ?? "";
  let location = context.location?.trim() ?? "";

  if (context.clientId) {
    const client = await fetchClientFields(supabase, context.clientId);
    phone ||= client.phone;
    fullName ||= client.fullName;
    email ||= client.email;
    location ||= client.location;
  }

  if (context.userId) {
    const profile = await fetchProfileFields(supabase, context.userId);
    phone ||= profile.phone;
    firstName ||= profile.firstName;
    lastName ||= profile.lastName;
    email ||= profile.email;
    fullName ||= profile.fullName;
  }

  if (!fullName) {
    fullName = `${firstName} ${lastName}`.trim();
  }

  const appUrl = getAppBaseUrl();
  const projectId = context.projectId?.trim() ?? "";

  const [clientSpaceUrl, employeeSpaceUrl, kanbanUrl, teamSpaceUrl] = await Promise.all([
    context.clientId
      ? fetchPublicSpaceUrl(supabase, { clientId: context.clientId, kind: "client" })
      : Promise.resolve(""),
    context.userId
      ? fetchPublicSpaceUrl(supabase, { profileId: context.userId, kind: "employee" })
      : Promise.resolve(""),
    projectId ? fetchKanbanUrlForProject(supabase, projectId) : Promise.resolve(""),
    projectId
      ? fetchPublicSpaceUrl(supabase, { projectId, kind: "team" })
      : Promise.resolve(""),
  ]);

  return {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    location,
    appUrl,
    loginUrl: absoluteAppUrl("/logowanie"),
    passwordSetupUrl: absoluteAppUrl("/konto/haslo"),
    clientSpaceUrl,
    employeeSpaceUrl,
    kanbanUrl,
    teamSpaceUrl,
  };
}

export { getUserDisplayName };
