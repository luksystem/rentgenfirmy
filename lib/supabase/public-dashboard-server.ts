import { rowToClient } from "@/lib/supabase/client-mappers";
import { rowToProject } from "@/lib/supabase/mappers";
import { rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { fetchProcessTemplateByProjectTypeServer } from "@/lib/supabase/process-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { DashboardSpace } from "@/lib/dashboard/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

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

function rowToSpace(row: SpaceRow): DashboardSpace {
  const kind = row.kind;
  const validKind = [
    "client",
    "team",
    "owner",
    "manager",
    "office",
    "installer",
    "employee",
  ].includes(kind)
    ? (kind as DashboardSpace["kind"])
    : "client";

  return {
    id: row.id,
    kind: validKind,
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

export type PublicDashboardPayload = {
  space: DashboardSpace;
  client: Client;
  projects: Project[];
  initialProjectId: string;
  process: ProjectProcess | null;
  template: ProcessTemplate | null;
  features: {
    agreements: boolean;
    specification: boolean;
  };
};

async function tableExists(table: "project_client_agreements" | "specification_catalog_items") {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from(table).select("id").limit(1);
  if (!error) {
    return true;
  }
  const message = error.message.toLowerCase();
  return !(
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

export async function fetchPublicDashboardPayload(
  token: string,
  requestedProjectId?: string,
): Promise<PublicDashboardPayload | null> {
  const supabase = getSupabaseServer();

  const { data: spaceRow, error: spaceError } = await supabase
    .from("dashboard_spaces")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (spaceError) {
    throw new Error(spaceError.message);
  }

  if (!spaceRow || !(spaceRow as SpaceRow).public_enabled) {
    return null;
  }

  const space = rowToSpace(spaceRow as SpaceRow);
  if (space.kind !== "client") {
    return null;
  }

  let clientId = space.clientId;

  if (!clientId && space.projectId) {
    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("client_id")
      .eq("id", space.projectId)
      .maybeSingle();

    if (projectError) {
      throw new Error(projectError.message);
    }

    clientId = (projectRow?.client_id as string | null) ?? null;
  }

  if (!clientId) {
    return null;
  }

  const [{ data: clientRow, error: clientError }, { data: projectRows, error: projectsError }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("projects").select("*").eq("client_id", clientId).order("name"),
    ]);

  if (clientError) {
    throw new Error(clientError.message);
  }
  if (projectsError) {
    throw new Error(projectsError.message);
  }
  if (!clientRow) {
    return null;
  }

  const client = rowToClient(clientRow);
  const projects = (projectRows ?? []).map((row) => rowToProject(row));

  const initialProjectId =
    requestedProjectId && projects.some((project) => project.id === requestedProjectId)
      ? requestedProjectId
      : space.projectId && projects.some((project) => project.id === space.projectId)
        ? space.projectId
        : (projects[0]?.id ?? "");

  let process: ProjectProcess | null = null;
  let template: ProcessTemplate | null = null;

  if (initialProjectId) {
    const selectedProject = projects.find((project) => project.id === initialProjectId);

    const [{ data: processRow, error: processError }, loadedTemplate] = await Promise.all([
      supabase
        .from("project_processes")
        .select("*")
        .eq("project_id", initialProjectId)
        .maybeSingle(),
      selectedProject
        ? fetchProcessTemplateByProjectTypeServer(selectedProject.type)
        : Promise.resolve(null),
    ]);

    if (processError) {
      throw new Error(processError.message);
    }

    process = processRow ? rowToProjectProcess(processRow) : null;
    template = loadedTemplate;
  }

  const [agreements, specification] = await Promise.all([
    tableExists("project_client_agreements"),
    tableExists("specification_catalog_items"),
  ]);

  return {
    space: { ...space, clientId },
    client,
    projects,
    initialProjectId,
    process,
    template,
    features: {
      agreements,
      specification,
    },
  };
}
