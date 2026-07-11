import { formatPartyName } from "@/lib/party/display-name";
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
import {
  buildClientOfferSummaries,
  countPendingClientOffers,
  type ClientOfferSummary,
} from "@/lib/dashboard/client-offer-summary";
import { isAgreementPendingAttention } from "@/lib/dashboard/agreement-types";
import type {
  ProjectChangeRequest,
  ProjectChangeRequestStatus,
} from "@/lib/dashboard/change-request-types";
import { sumAcceptedOffersGross } from "@/lib/dashboard/project-cost-summary";
import type {
  DashboardContentSection,
  DashboardContentType,
  ProjectDashboardContent,
} from "@/lib/dashboard/content-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { ProjectTrade } from "@/lib/dashboard/trade-types";
import type { ProjectMeetingNote } from "@/lib/dashboard/meeting-note-types";
import type { ProjectSatisfactionBundle } from "@/lib/dashboard/satisfaction-types";
import type { ProjectDocument } from "@/lib/documents/types";
import type { ServiceIntakeRecord } from "@/lib/service-intake/types";
import { rowToMeetingNote } from "@/lib/supabase/project-meeting-note-repository";
import { rowToProjectDocument } from "@/lib/supabase/project-document-repository";
import type { SystemCredentialMeta } from "@/lib/dashboard/system-credentials-types";
import type { DashboardPublicAccessInfo, DashboardSpace } from "@/lib/dashboard/types";
import {
  fetchProcessPublicLinksForProject,
  mapProcessPublicLinksToPaths,
} from "@/lib/supabase/process-public-access-repository";
import {
  fetchProjectSatisfactionBundleServer,
  satisfactionTablesExist,
} from "@/lib/supabase/project-satisfaction-server";
import {
  listProjectSystemCredentials,
  systemCredentialsTableExists,
} from "@/lib/supabase/project-system-credentials-server";
import {
  fetchServicesByClientIdServer,
  servicesTableExists,
} from "@/lib/supabase/service-repository-server";
import { listServiceIntakeByProject } from "@/lib/supabase/service-intake-server";
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

type ChangeRequestRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  status: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  proposed_cost_vat_rate: number | string | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  position: number;
  acceptance_deadline_stage_id: string | null;
  blocks_next_stage: boolean;
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
  communication_protocols?: string[] | null;
  acceptance_deadline_stage_id?: string | null;
  blocks_next_stage?: boolean | null;
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

type TradeRow = {
  id: string;
  project_id: string;
  name: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  description: string;
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

function isChangeRequestStatus(value: string): value is ProjectChangeRequestStatus {
  return ["draft", "pending_client", "accepted", "rejected", "cancelled"].includes(value);
}

function rowToChangeRequest(row: ChangeRequestRow): ProjectChangeRequest {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    status: isChangeRequestStatus(row.status) ? row.status : "draft",
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
    position: row.position,
    acceptanceDeadlineStageId: row.acceptance_deadline_stage_id ?? null,
    blocksNextStage: Boolean(row.blocks_next_stage),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    communicationProtocols: Array.isArray(row.communication_protocols)
      ? row.communication_protocols.filter(Boolean)
      : [],
    acceptanceDeadlineStageId: row.acceptance_deadline_stage_id ?? null,
    blocksNextStage: Boolean(row.blocks_next_stage),
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

function rowToTrade(row: TradeRow): ProjectTrade {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    company: row.company,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    description: row.description,
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
      .select("first_name, last_name")
      .eq("id", access.clientId)
      .maybeSingle();
    clientName = data
      ? formatPartyName({
          firstName: (data.first_name as string | undefined) ?? "",
          lastName: (data.last_name as string | undefined) ?? "",
        })
      : null;
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
  changeRequests: ProjectChangeRequest[];
  offersGrossTotal: number;
  acceptedOffersCount: number;
  specificationItems: ProjectSpecificationItem[];
  trades: ProjectTrade[];
  satisfaction: ProjectSatisfactionBundle | null;
  content: ProjectDashboardContent[];
  credentials: SystemCredentialMeta[];
  pendingAgreementsCount: number;
  pendingOffersCount: number;
  offers: ClientOfferSummary[];
  serviceIntakes: ServiceIntakeRecord[];
  kanbanPublicLinks: Record<string, string>;
  meetingNotes: ProjectMeetingNote[];
  documents: ProjectDocument[];
  features: {
    agreements: boolean;
    changeRequests: boolean;
    specification: boolean;
    trades: boolean;
    satisfaction: boolean;
    content: boolean;
    credentials: boolean;
    offers: boolean;
    meetingNotes: boolean;
    documents: boolean;
  };
};

async function tableExists(
  table:
    | "project_client_agreements"
    | "project_change_requests"
    | "specification_catalog_items"
    | "project_dashboard_content"
    | "project_trades"
    | "project_meeting_notes"
    | "project_documents",
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

async function fetchChangeRequestsForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_change_requests")
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

  return (data ?? []).map((row) => rowToChangeRequest(row as ChangeRequestRow));
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

async function fetchTradesForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_trades")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToTrade(row as TradeRow));
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

async function fetchMeetingNotesForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_meeting_notes")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToMeetingNote(row as Parameters<typeof rowToMeetingNote>[0]));
}

async function fetchDocumentsForProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToProjectDocument(row as Parameters<typeof rowToProjectDocument>[0]));
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
    template = process?.templateSnapshot ?? loadedTemplate;
    if (process && template) {
      processProgress = getProcessProgress(template, process);
    }
  }

  const [
    agreementsEnabled,
    changeRequestsEnabled,
    specificationEnabled,
    tradesEnabled,
    satisfactionEnabled,
    contentEnabled,
    credentialsEnabled,
    offersEnabled,
    meetingNotesEnabled,
    documentsEnabled,
  ] = await Promise.all([
    tableExists("project_client_agreements"),
    tableExists("project_change_requests"),
    tableExists("specification_catalog_items"),
    tableExists("project_trades"),
    satisfactionTablesExist(),
    tableExists("project_dashboard_content"),
    systemCredentialsTableExists(),
    servicesTableExists(),
    tableExists("project_meeting_notes"),
    tableExists("project_documents"),
  ]);

  const [
    agreements,
    changeRequests,
    specificationItems,
    trades,
    satisfaction,
    content,
    credentials,
    meetingNotes,
    documents,
  ] = initialProjectId
    ? await Promise.all([
        agreementsEnabled ? fetchAgreementsForProject(initialProjectId) : Promise.resolve([]),
        changeRequestsEnabled ? fetchChangeRequestsForProject(initialProjectId) : Promise.resolve([]),
        specificationEnabled
          ? fetchSpecificationItemsForProject(initialProjectId)
          : Promise.resolve([]),
        tradesEnabled ? fetchTradesForProject(initialProjectId) : Promise.resolve([]),
        satisfactionEnabled
          ? fetchProjectSatisfactionBundleServer(initialProjectId)
          : Promise.resolve(null),
        contentEnabled ? fetchContentForProject(initialProjectId) : Promise.resolve([]),
        credentialsEnabled
          ? listProjectSystemCredentials(initialProjectId, { clientVisibleOnly: true })
          : Promise.resolve([]),
        meetingNotesEnabled ? fetchMeetingNotesForProject(initialProjectId) : Promise.resolve([]),
        documentsEnabled ? fetchDocumentsForProject(initialProjectId) : Promise.resolve([]),
      ])
    : [[], [], [], [], null, [], [], [], []];

  const pendingAgreementsCount = agreements.filter((entry) => isAgreementPendingAttention(entry)).length;

  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const clientServices = offersEnabled ? await fetchServicesByClientIdServer(clientId) : [];
  const offers = buildClientOfferSummaries(clientServices, projectNames, {
    projectId: initialProjectId || undefined,
    publicOnly: true,
  });
  const pendingOffersCount = countPendingClientOffers(offers);
  const acceptedOffersSummary = sumAcceptedOffersGross(
    initialProjectId
      ? clientServices.filter((service) => service.projectId === initialProjectId)
      : [],
  );

  let serviceIntakes: ServiceIntakeRecord[] = [];
  if (initialProjectId && offersEnabled) {
    try {
      serviceIntakes = await listServiceIntakeByProject(initialProjectId);
    } catch {
      serviceIntakes = [];
    }
  }

  const kanbanPublicLinks = initialProjectId
    ? mapProcessPublicLinksToPaths(
        await fetchProcessPublicLinksForProject(getSupabaseAdmin(), initialProjectId),
      )
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
    changeRequests,
    offersGrossTotal: acceptedOffersSummary.total,
    acceptedOffersCount: acceptedOffersSummary.count,
    specificationItems,
    trades,
    satisfaction,
    content,
    credentials,
    pendingAgreementsCount,
    pendingOffersCount,
    offers,
    serviceIntakes,
    kanbanPublicLinks,
    meetingNotes,
    documents,
    features: {
      agreements: agreementsEnabled,
      changeRequests: changeRequestsEnabled,
      specification: specificationEnabled,
      trades: tradesEnabled,
      satisfaction: satisfactionEnabled,
      content: contentEnabled,
      credentials: credentialsEnabled,
      offers: offersEnabled,
      meetingNotes: meetingNotesEnabled,
      documents: documentsEnabled,
    },
  };
}
