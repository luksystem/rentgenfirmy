import type {
  DashboardSpace,
  DashboardSpaceKind,
  GlobalDashboardKind,
} from "@/lib/dashboard/types";
import { GLOBAL_DASHBOARD_KINDS } from "@/lib/dashboard/types";
import { getSupabase } from "@/lib/supabase/client";

type SpaceRow = {
  id: string;
  kind: string;
  project_id: string | null;
  client_id: string | null;
  profile_id: string | null;
  title: string;
  public_token: string;
  public_enabled: boolean;
  public_access_password_hash?: string | null;
  public_access_username?: string | null;
  created_at: string;
  updated_at: string;
};

function isDashboardSpaceKind(value: string): value is DashboardSpaceKind {
  return [
    "client",
    "team",
    "owner",
    "manager",
    "office",
    "installer",
    "employee",
  ].includes(value);
}

function rowToSpace(row: SpaceRow): DashboardSpace {
  return {
    id: row.id,
    kind: isDashboardSpaceKind(row.kind) ? row.kind : "client",
    projectId: row.project_id,
    clientId: row.client_id,
    profileId: row.profile_id,
    title: row.title?.trim() || "",
    publicToken: row.public_token,
    publicEnabled: row.public_enabled,
    publicAccessConfigured: Boolean(row.public_access_password_hash),
    publicAccessUsernameRequired: Boolean(row.public_access_username?.trim()),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function insertSpace(input: {
  kind: DashboardSpaceKind;
  projectId?: string | null;
  clientId?: string | null;
  profileId?: string | null;
  title?: string;
}) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .insert({
      id: crypto.randomUUID(),
      kind: input.kind,
      project_id: input.projectId ?? null,
      client_id: input.clientId ?? null,
      profile_id: input.profileId ?? null,
      title: input.title?.trim() || "",
      public_enabled: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSpace(data as SpaceRow);
}

export async function fetchDashboardSpaces(): Promise<DashboardSpace[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToSpace(row as SpaceRow));
}

export async function fetchDashboardSpaceByToken(token: string): Promise<DashboardSpace | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToSpace(data as SpaceRow) : null;
}

export async function fetchProjectDashboardSpace(
  projectId: string,
  kind: "client" | "team",
): Promise<DashboardSpace | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .select("*")
    .eq("project_id", projectId)
    .eq("kind", kind)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToSpace(data as SpaceRow) : null;
}

export async function ensureProjectDashboardSpaces(input: {
  projectId: string;
  projectName: string;
  clientId?: string | null;
}): Promise<{ client: DashboardSpace; team: DashboardSpace }> {
  const existingClient = await fetchProjectDashboardSpace(input.projectId, "client");
  const existingTeam = await fetchProjectDashboardSpace(input.projectId, "team");

  const client =
    existingClient ??
    (await insertSpace({
      kind: "client",
      projectId: input.projectId,
      clientId: input.clientId ?? null,
      title: `Dashboard klienta — ${input.projectName}`,
    }));

  const team =
    existingTeam ??
    (await insertSpace({
      kind: "team",
      projectId: input.projectId,
      title: `Dashboard zespołu — ${input.projectName}`,
    }));

  return { client, team };
}

export async function ensureGlobalDashboardSpaces(): Promise<DashboardSpace[]> {
  const existing = await fetchDashboardSpaces();
  const byKind = new Map(existing.map((space) => [space.kind, space]));
  const created: DashboardSpace[] = [];

  const titles: Record<GlobalDashboardKind, string> = {
    owner: "Dashboard właściciela",
    manager: "Dashboard managerów",
    office: "Dashboard obsługi biura",
    installer: "Dashboard instalatorów",
  };

  for (const kind of GLOBAL_DASHBOARD_KINDS) {
    if (!byKind.has(kind)) {
      created.push(await insertSpace({ kind, title: titles[kind] }));
    }
  }

  return [...existing, ...created];
}

export async function ensureEmployeeDashboardSpace(input: {
  profileId: string;
  displayName: string;
}): Promise<DashboardSpace> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .select("*")
    .eq("kind", "employee")
    .eq("profile_id", input.profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return rowToSpace(data as SpaceRow);
  }

  return insertSpace({
    kind: "employee",
    profileId: input.profileId,
    title: `Przestrzeń — ${input.displayName}`,
  });
}

export async function ensureAllDashboardSpaces(input: {
  projects: Array<{ id: string; name: string; clientId?: string | null }>;
  profileId?: string | null;
  displayName?: string;
}): Promise<DashboardSpace[]> {
  const globalSpaces = await ensureGlobalDashboardSpaces();
  const projectSpaces = await Promise.all(
    input.projects.map((project) =>
      ensureProjectDashboardSpaces({
        projectId: project.id,
        projectName: project.name,
        clientId: project.clientId,
      }),
    ),
  );

  const employeeSpace =
    input.profileId && input.displayName
      ? [await ensureEmployeeDashboardSpace({ profileId: input.profileId, displayName: input.displayName })]
      : [];

  return [
    ...globalSpaces,
    ...projectSpaces.flatMap((entry) => [entry.client, entry.team]),
    ...employeeSpace,
  ];
}

export async function setDashboardPublicEnabled(spaceId: string, enabled: boolean) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .update({ public_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", spaceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSpace(data as SpaceRow);
}
