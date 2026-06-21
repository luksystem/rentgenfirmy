import { rowToClient } from "@/lib/supabase/client-mappers";
import { rowToProject } from "@/lib/supabase/mappers";
import { rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { fetchProcessTemplateByProjectTypeServer } from "@/lib/supabase/process-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type {
  ProjectAgreementCategory,
  ProjectAgreementStatus,
  ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import { getProcessProgress } from "@/lib/process/types";
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

type AgreementRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type SpecRow = {
  id: string;
  project_id: string;
  catalog_item_id: string | null;
  title: string;
  category: string;
  description: string;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
};

function isMissingTableError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache")
  );
}

function parseNumber(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isCategory(value: string): value is ProjectAgreementCategory {
  return ["integration", "specification", "change", "handover", "other"].includes(value);
}

function isStatus(value: string): value is ProjectAgreementStatus {
  return ["draft", "pending_client", "accepted", "rejected", "cancelled"].includes(value);
}

function rowToAgreement(row: AgreementRow): ProjectClientAgreement {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    category: isCategory(row.category) ? row.category : "other",
    status: isStatus(row.status) ? row.status : "draft",
    proposedCostNet: parseNumber(row.proposed_cost_net),
    proposedCostGross: parseNumber(row.proposed_cost_gross),
    costNote: row.cost_note,
    createdByName: row.created_by_name,
    createdBySide: row.created_by_side === "client" ? "client" : "team",
    submittedAt: row.submitted_at,
    clientRespondedAt: row.client_responded_at,
    clientResponseName: row.client_response_name,
    clientResponseNote: row.client_response_note,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSpec(row: SpecRow): ProjectSpecificationItem {
  return {
    id: row.id,
    projectId: row.project_id,
    catalogItemId: row.catalog_item_id,
    title: row.title,
    category: row.category,
    description: row.description,
    notes: row.notes,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
  processProgress: { percent: number; completed: number; total: number } | null;
  agreements: ProjectClientAgreement[];
  specificationItems: ProjectSpecificationItem[];
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
  return !isMissingTableError(error.message);
}

async function fetchAgreementsForProject(projectId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToAgreement(row as AgreementRow));
}

async function fetchSpecificationItemsForProject(projectId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("project_specification_items")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToSpec(row as SpecRow));
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
    if (isMissingTableError(spaceError.message)) {
      return null;
    }
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

  let processProgress: PublicDashboardPayload["processProgress"] = null;

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

    const process = processRow ? rowToProjectProcess(processRow) : null;
    if (process && loadedTemplate) {
      processProgress = getProcessProgress(loadedTemplate, process);
    }
  }

  const [agreementsEnabled, specificationEnabled] = await Promise.all([
    tableExists("project_client_agreements"),
    tableExists("specification_catalog_items"),
  ]);

  const [agreements, specificationItems] = initialProjectId
    ? await Promise.all([
        agreementsEnabled ? fetchAgreementsForProject(initialProjectId) : Promise.resolve([]),
        specificationEnabled
          ? fetchSpecificationItemsForProject(initialProjectId)
          : Promise.resolve([]),
      ])
    : [[], []];

  return {
    space: { ...space, clientId },
    client,
    projects,
    initialProjectId,
    processProgress,
    agreements,
    specificationItems,
    features: {
      agreements: agreementsEnabled,
      specification: specificationEnabled,
    },
  };
}
