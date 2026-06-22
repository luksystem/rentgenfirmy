import { rowToClient } from "@/lib/supabase/client-mappers";
import { rowToProject } from "@/lib/supabase/mappers";
import { rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { fetchProcessTemplateByProjectTypeServer } from "@/lib/supabase/process-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DashboardSpaceUpdate } from "@/lib/supabase/database.types";
import { hashKanbanPassword, normalizeKanbanLogin, verifyKanbanPassword } from "@/lib/process/kanban-auth";
import type {
  ProjectAgreementCategory,
  ProjectAgreementStatus,
  ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import type {
  DashboardContentSection,
  DashboardContentType,
  ProjectDashboardContent,
} from "@/lib/dashboard/content-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { DashboardPublicAccessInfo, DashboardSpace } from "@/lib/dashboard/types";
import { fetchKanbanPublicLinksForProject } from "@/lib/supabase/kanban-public-links";
import { getProcessProgress } from "@/lib/process/types";
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
  public_author_name?: string | null;
  created_at: string;
  updated_at: string;
};

type ContentRow = {
  id: string;
  project_id: string;
  section: string;
  content_type: string;
  title: string;
  url: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type DashboardSpaceAccessRecord = {
  spaceId: string;
  publicToken: string;
  publicEnabled: boolean;
  passwordHash: string | null;
  accessUsername: string | null;
  authorName: string;
  clientId: string | null;
  projectId: string | null;
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
  proposed_cost_vat_rate: number | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  proposed_warranty_end_date: string | null;
  position: number;
  public_token?: string;
  public_enabled?: boolean;
  discussion_open?: boolean;
  active_version_id?: string | null;
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
  return ["integration", "specification", "change", "handover", "warranty", "other"].includes(value);
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
    proposedCostVatRate: parseNumber(row.proposed_cost_vat_rate),
    costNote: row.cost_note,
    createdByName: row.created_by_name,
    createdBySide: row.created_by_side === "client" ? "client" : "team",
    submittedAt: row.submitted_at,
    clientRespondedAt: row.client_responded_at,
    clientResponseName: row.client_response_name,
    clientResponseNote: row.client_response_note,
    proposedWarrantyEndDate: row.proposed_warranty_end_date,
    position: row.position,
    publicToken: row.public_token ?? "",
    publicEnabled: row.public_enabled ?? false,
    discussionOpen: row.discussion_open ?? false,
    activeVersionId: row.active_version_id ?? null,
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

function isContentSection(value: string): value is DashboardContentSection {
  return value === "links" || value === "files" || value === "instructions";
}

function isContentType(value: string): value is DashboardContentType {
  return ["link", "image", "video", "youtube", "file"].includes(value);
}

function rowToContent(row: ContentRow): ProjectDashboardContent {
  return {
    id: row.id,
    projectId: row.project_id,
    section: isContentSection(row.section) ? row.section : "links",
    contentType: isContentType(row.content_type) ? row.content_type : "link",
    title: row.title,
    url: row.url,
    description: row.description,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSpaceAccess(row: SpaceRow): DashboardSpaceAccessRecord {
  return {
    spaceId: row.id,
    publicToken: row.public_token,
    publicEnabled: row.public_enabled,
    passwordHash: row.public_access_password_hash ?? null,
    accessUsername: row.public_access_username?.trim() || null,
    authorName: row.public_author_name?.trim() || "Klient",
    clientId: row.client_id,
    projectId: row.project_id,
  };
}

export function getDashboardPublicAccessInfo(
  access: DashboardSpaceAccessRecord,
): DashboardPublicAccessInfo {
  const hasPassword = Boolean(access.passwordHash);
  return {
    authRequired: hasPassword,
    legacyNameRequired: !hasPassword,
    usernameRequired: hasPassword && Boolean(access.accessUsername),
    authorDisplayName: access.accessUsername ?? access.authorName,
  };
}

export async function fetchDashboardSpaceAccessByToken(token: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("dashboard_spaces")
    .select("*")
    .eq("public_token", token)
    .eq("public_enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || (data as SpaceRow).kind !== "client") {
    return null;
  }

  return rowToSpaceAccess(data as SpaceRow);
}

export async function verifyDashboardPublicCredentials(
  token: string,
  password: string,
  username?: string,
) {
  const access = await fetchDashboardSpaceAccessByToken(token);
  if (!access?.passwordHash) {
    throw new Error("Dashboard nie wymaga hasła.");
  }

  const login = normalizeKanbanLogin(username ?? "");
  if (access.accessUsername && login !== normalizeKanbanLogin(access.accessUsername)) {
    throw new Error("Nieprawidłowy login lub hasło.");
  }

  const valid = await verifyKanbanPassword(password, access.passwordHash);
  if (!valid) {
    throw new Error("Nieprawidłowy login lub hasło.");
  }

  return { authorName: access.authorName, access };
}

export async function updateDashboardPublicAccessSettings(input: {
  spaceId: string;
  password?: string | null;
  username?: string | null;
  authorName?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const payload: DashboardSpaceUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (input.username !== undefined) {
    payload.public_access_username = input.username?.trim() || null;
  }

  if (input.authorName !== undefined) {
    payload.public_author_name = input.authorName?.trim() || "Klient";
  }

  if (input.password !== undefined) {
    const trimmed = input.password?.trim();
    payload.public_access_password_hash = trimmed ? await hashKanbanPassword(trimmed) : null;
  }

  const { data, error } = await supabase
    .from("dashboard_spaces")
    .update(payload)
    .eq("id", input.spaceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSpace(data as SpaceRow);
}

export async function fetchDashboardPublicMeta(token: string) {
  const access = await fetchDashboardSpaceAccessByToken(token);
  if (!access) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  let clientName: string | null = null;

  if (access.clientId) {
    const { data } = await supabase
      .from("clients")
      .select("full_name")
      .eq("id", access.clientId)
      .maybeSingle();
    clientName = (data?.full_name as string | undefined) ?? null;
  }

  return {
    access: getDashboardPublicAccessInfo(access),
    context: {
      clientName,
      spaceTitle: access.authorName,
    },
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
    publicAuthorName: row.public_author_name?.trim() || "Klient",
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
  process: ProjectProcess | null;
  template: ProcessTemplate | null;
  agreements: ProjectClientAgreement[];
  specificationItems: ProjectSpecificationItem[];
  content: ProjectDashboardContent[];
  pendingAgreementsCount: number;
  kanbanPublicLinks: Record<string, string>;
  features: {
    agreements: boolean;
    specification: boolean;
    content: boolean;
  };
};

async function tableExists(
  table: "project_client_agreements" | "specification_catalog_items" | "project_dashboard_content",
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).select("id").limit(1);
  if (!error) {
    return true;
  }
  return !isMissingTableError(error.message);
}

async function fetchAgreementsForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
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
  const supabase = getSupabaseAdmin();
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

async function fetchContentForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_dashboard_content")
    .select("*")
    .eq("project_id", projectId)
    .order("section")
    .order("position", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToContent(row as ContentRow));
}

export async function fetchPublicDashboardPayload(
  token: string,
  requestedProjectId?: string,
): Promise<PublicDashboardPayload | null> {
  const supabase = getSupabaseAdmin();

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
    if (process && template) {
      processProgress = getProcessProgress(template, process);
    }
  }

  const [agreementsEnabled, specificationEnabled, contentEnabled] = await Promise.all([
    tableExists("project_client_agreements"),
    tableExists("specification_catalog_items"),
    tableExists("project_dashboard_content"),
  ]);

  const [agreements, specificationItems, content] = initialProjectId
    ? await Promise.all([
        agreementsEnabled ? fetchAgreementsForProject(initialProjectId) : Promise.resolve([]),
        specificationEnabled
          ? fetchSpecificationItemsForProject(initialProjectId)
          : Promise.resolve([]),
        contentEnabled ? fetchContentForProject(initialProjectId) : Promise.resolve([]),
      ])
    : [[], [], []];

  const pendingAgreementsCount = agreements.filter(
    (entry) => entry.status === "pending_client",
  ).length;

  const kanbanPublicLinks = initialProjectId
    ? await fetchKanbanPublicLinksForProject(getSupabaseAdmin(), initialProjectId)
    : {};

  return {
    space: { ...space, clientId },
    client,
    projects,
    initialProjectId,
    processProgress,
    process,
    template,
    agreements,
    specificationItems,
    content,
    pendingAgreementsCount,
    kanbanPublicLinks,
    features: {
      agreements: agreementsEnabled,
      specification: specificationEnabled,
      content: contentEnabled,
    },
  };
}
