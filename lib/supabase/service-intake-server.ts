import { namesMatch } from "@/lib/service-intake/name-match";
import {
  buildServiceIntakeStatusEmail,
  buildServiceIntakeSubmittedEmail,
  getServiceInboxRecipients,
  getServiceIntakeThreadUrl,
} from "@/lib/service-intake/email-templates";
import { isServiceIntakeOverdue } from "@/lib/service-intake/sla";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  createIntakeVerifiedToken,
  readIntakeSessionToken,
  readIntakeVerifiedToken,
} from "@/lib/service-intake/tokens";
import type {
  ServiceIntakeAttachment,
  ServiceIntakeComment,
  ServiceIntakePostWarrantyAction,
  ServiceIntakePriority,
  ServiceIntakeProjectOption,
  ServiceIntakeRecord,
  ServiceIntakeRequestType,
  ServiceIntakeStatus,
  ServiceIntakeThread,
  ServiceIntakeVerifyResult,
} from "@/lib/service-intake/types";
import { SERVICE_INTAKE_STATUS_LABELS } from "@/lib/service-intake/types";
import { getWarrantyStatus } from "@/lib/project/warranty";
import { rowToProject } from "@/lib/supabase/mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeServiceGlobalSettings } from "@/lib/supabase/service-mappers";
import type { Project } from "@/lib/types";

const SETTINGS_ID = "service_global_settings";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function projectToIntakeOption(project: Project): ServiceIntakeProjectOption {
  const warranty = getWarrantyStatus(project);
  const isWarrantyActive = warranty.status === "active" || warranty.status === "expiring_soon";

  return {
    id: project.id,
    name: project.name,
    location: project.type ?? null,
    warrantyStatus: warranty.status,
    warrantyLabel: warranty.label,
    warrantyTone: warranty.tone,
    warrantyEndsAt: project.warrantyEndsAt ?? null,
    isWarrantyActive,
  };
}

async function fetchServiceRates() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  const settings = normalizeServiceGlobalSettings(data?.data ?? {});
  return {
    supervisionHourly: settings.rates.supervisionHourly,
    installerHourly: settings.rates.installerHourly,
    programmerHourly: settings.rates.programmerHourly,
    carPerKm: settings.rates.carPerKm,
    carHourly: settings.rates.carHourly,
    vatRate: settings.defaultDiscounts.vatRate,
  };
}

async function findClientByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .ilike("email", normalized)
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).find((row) => normalizeEmail(row.email ?? "") === normalized) ?? null;
}

async function fetchClientProjects(clientId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProject);
}

async function nextReferenceNumber() {
  const supabase = getSupabaseAdmin();
  const year = new Date().getFullYear();
  const prefix = `ZS-${year}-`;

  const { count, error } = await supabase
    .from("service_intake_requests")
    .select("id", { count: "exact", head: true })
    .like("reference_number", `${prefix}%`);

  if (error) {
    throw new Error(error.message);
  }

  const sequence = String((count ?? 0) + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

function rowToIntakeRecord(
  row: Record<string, unknown>,
  extras?: { clientName?: string | null; projectName?: string | null },
): ServiceIntakeRecord {
  return {
    id: String(row.id),
    referenceNumber: String(row.reference_number),
    status: row.status as ServiceIntakeRecord["status"],
    clientId: row.client_id ? String(row.client_id) : null,
    projectId: row.project_id ? String(row.project_id) : null,
    serviceId: row.service_id ? String(row.service_id) : null,
    contactEmail: String(row.contact_email),
    contactFullName: String(row.contact_full_name),
    contactPhone: row.contact_phone ? String(row.contact_phone) : null,
    warrantyStatus: row.warranty_status ? String(row.warranty_status) : null,
    serviceTypeHint: row.service_type_hint as ServiceIntakeRecord["serviceTypeHint"],
    requestType: (row.request_type as ServiceIntakeRequestType) ?? "service",
    priority: row.priority ? (row.priority as ServiceIntakePriority) : null,
    postWarrantyAction: row.post_warranty_action
      ? (row.post_warranty_action as ServiceIntakePostWarrantyAction)
      : null,
    description: String(row.description),
    acceptedPaidTerms: Boolean(row.accepted_paid_terms),
    acceptedPaidTermsAt: row.accepted_paid_terms_at ? String(row.accepted_paid_terms_at) : null,
    trackingToken: String(row.tracking_token),
    metadataJson: (row.metadata_json as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    clientName: extras?.clientName ?? null,
    projectName: extras?.projectName ?? null,
  };
}

function rowToAttachment(row: Record<string, unknown>): ServiceIntakeAttachment {
  return {
    id: String(row.id),
    intakeId: String(row.intake_id),
    kind: row.kind as ServiceIntakeAttachment["kind"],
    url: String(row.url),
    label: row.label ? String(row.label) : null,
    createdAt: String(row.created_at),
  };
}

function rowToComment(row: Record<string, unknown>): ServiceIntakeComment {
  return {
    id: String(row.id),
    intakeId: String(row.intake_id),
    authorName: String(row.author_name),
    authorSide: row.author_side as ServiceIntakeComment["authorSide"],
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

async function notifyServiceIntakeSubmitted(record: ServiceIntakeRecord) {
  const threadUrl = getServiceIntakeThreadUrl(record.trackingToken);
  const template = buildServiceIntakeSubmittedEmail({
    referenceNumber: record.referenceNumber,
    contactFullName: record.contactFullName,
    threadUrl,
  });

  await Promise.allSettled([
    sendTransactionalEmail({
      to: record.contactEmail,
      subject: template.subject,
      html: template.html,
    }),
    sendTransactionalEmail({
      to: getServiceInboxRecipients(),
      subject: `[Nowe] ${template.subject}`,
      html: `${template.html}<p>Klient: ${record.contactEmail}</p><p>Projekt: ${record.projectName ?? "—"}</p>`,
    }),
  ]);
}

async function notifyServiceIntakeStatusChange(record: ServiceIntakeRecord) {
  const threadUrl = getServiceIntakeThreadUrl(record.trackingToken);
  const template = buildServiceIntakeStatusEmail({
    referenceNumber: record.referenceNumber,
    contactFullName: record.contactFullName,
    statusLabel: SERVICE_INTAKE_STATUS_LABELS[record.status],
    threadUrl,
  });

  await Promise.allSettled([
    sendTransactionalEmail({
      to: record.contactEmail,
      subject: template.subject,
      html: template.html,
    }),
    sendTransactionalEmail({
      to: getServiceInboxRecipients(),
      subject: `[Status] ${template.subject}`,
      html: template.html,
    }),
  ]);
}

export async function verifyServiceIntakeIdentity(input: {
  sessionToken: string;
  email: string;
  fullName: string;
}): Promise<ServiceIntakeVerifyResult | null> {
  const session = readIntakeSessionToken(input.sessionToken);
  const email = normalizeEmail(input.email);

  if (!session || session.email !== email) {
    return null;
  }

  const client = await findClientByEmail(email);
  if (!client || !namesMatch(client.full_name ?? "", input.fullName)) {
    return null;
  }

  const projects = await fetchClientProjects(client.id);
  const rates = await fetchServiceRates();

  return {
    verificationToken: createIntakeVerifiedToken({
      email,
      clientId: client.id,
      fullName: input.fullName.trim(),
    }),
    clientDisplayName: client.full_name ?? input.fullName.trim(),
    projects: projects.map(projectToIntakeOption),
    rates,
  };
}

export async function submitServiceIntakeRequest(input: {
  verificationToken: string;
  projectId: string;
  requestType: ServiceIntakeRequestType;
  priority: ServiceIntakePriority | null;
  postWarrantyAction: ServiceIntakePostWarrantyAction | null;
  description: string;
  contactPhone?: string | null;
  acceptedPaidTerms: boolean;
  attachments?: Array<{ kind: "image" | "video" | "link"; url: string; label?: string | null }>;
}) {
  const verified = readIntakeVerifiedToken(input.verificationToken);
  if (!verified) {
    throw new Error("Sesja wygasła. Odśwież stronę i zacznij od początku.");
  }

  const projects = await fetchClientProjects(verified.clientId);
  const project = projects.find((entry) => entry.id === input.projectId);
  if (!project) {
    throw new Error("Wybrany obiekt nie należy do Twojego konta.");
  }

  const warranty = getWarrantyStatus(project);
  const isWarrantyActive = warranty.status === "active" || warranty.status === "expiring_soon";
  const serviceTypeHint = isWarrantyActive ? "Gwarancyjny" : "Pogwarancyjny";
  const isServiceRequest = input.requestType === "service";

  if (isServiceRequest && !input.priority) {
    throw new Error("Wybierz priorytet problemu w systemie CAFE.");
  }

  if (!isServiceRequest && input.priority) {
    throw new Error("Priorytet CAFE dotyczy tylko zgłoszeń serwisowych.");
  }

  if (!isWarrantyActive && isServiceRequest && !input.postWarrantyAction) {
    throw new Error("Wybierz, w jaki sposób mamy zadziałać.");
  }

  if (!isWarrantyActive && isServiceRequest) {
    const requiresPaidAcceptance =
      input.postWarrantyAction === "on_site" || input.postWarrantyAction === "remote";
    if (requiresPaidAcceptance && !input.acceptedPaidTerms) {
      throw new Error("Zaakceptuj stawki serwisowe, aby wysłać zgłoszenie.");
    }
  }

  const description = input.description.trim();
  if (description.length < 10) {
    throw new Error("Opisz problem (minimum 10 znaków).");
  }

  const supabase = getSupabaseAdmin();
  const referenceNumber = await nextReferenceNumber();
  const now = new Date().toISOString();
  const acceptedPaidTerms =
    !isWarrantyActive &&
    isServiceRequest &&
    (input.postWarrantyAction === "on_site" ||
      input.postWarrantyAction === "remote" ||
      input.acceptedPaidTerms);

  const { data, error } = await supabase
    .from("service_intake_requests")
    .insert({
      reference_number: referenceNumber,
      status: "new",
      client_id: verified.clientId,
      project_id: project.id,
      contact_email: verified.email,
      contact_full_name: verified.fullName,
      contact_phone: input.contactPhone?.trim() || null,
      warranty_status: warranty.status,
      service_type_hint: serviceTypeHint,
      request_type: input.requestType,
      priority: isServiceRequest ? input.priority : null,
      post_warranty_action:
        !isWarrantyActive && isServiceRequest ? input.postWarrantyAction : null,
      description,
      accepted_paid_terms: acceptedPaidTerms,
      accepted_paid_terms_at: acceptedPaidTerms ? now : null,
      metadata_json: {
        projectName: project.name,
        warrantyLabel: warranty.label,
        requestType: input.requestType,
        postWarrantyAction: input.postWarrantyAction,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = rowToIntakeRecord(data, {
    clientName: verified.fullName,
    projectName: project.name,
  });

  const attachments = (input.attachments ?? []).filter((entry) => entry.url.trim());
  if (attachments.length) {
    const { error: attachmentError } = await supabase.from("service_intake_attachments").insert(
      attachments.map((entry) => ({
        intake_id: record.id,
        kind: entry.kind,
        url: entry.url.trim(),
        label: entry.label?.trim() || null,
      })),
    );
    if (attachmentError) {
      throw new Error(attachmentError.message);
    }
  }

  await notifyServiceIntakeSubmitted(record);

  return record;
}

export async function listServiceIntakeRequests(status?: ServiceIntakeStatus) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("service_intake_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))] as string[];
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter(Boolean))] as string[];

  const [{ data: clients }, { data: projects }] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    projectIds.length
      ? supabase.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const clientMap = new Map((clients ?? []).map((row) => [row.id, row.full_name]));
  const projectMap = new Map((projects ?? []).map((row) => [row.id, row.name]));

  return rows.map((row) =>
    rowToIntakeRecord(row, {
      clientName: row.client_id ? clientMap.get(row.client_id) ?? null : null,
      projectName: row.project_id ? projectMap.get(row.project_id) ?? null : null,
    }),
  );
}

export async function updateServiceIntakeStatus(id: string, status: ServiceIntakeStatus) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_intake_requests")
    .update({
      status,
      updated_at: now,
      closed_at: status === "closed" || status === "rejected" ? now : null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = rowToIntakeRecord(data);
  await notifyServiceIntakeStatusChange(record);
  return record;
}

export async function getServiceIntakeThreadByToken(token: string): Promise<ServiceIntakeThread | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("service_intake_requests")
    .select("*")
    .eq("tracking_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const intake = rowToIntakeRecord(data);
  const [{ data: attachments }, { data: comments }] = await Promise.all([
    supabase
      .from("service_intake_attachments")
      .select("*")
      .eq("intake_id", intake.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("service_intake_comments")
      .select("*")
      .eq("intake_id", intake.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    intake,
    attachments: (attachments ?? []).map((row) => rowToAttachment(row)),
    comments: (comments ?? []).map((row) => rowToComment(row)),
  };
}

export async function addServiceIntakeComment(input: {
  trackingToken: string;
  authorName: string;
  authorSide: "client" | "team";
  body: string;
}) {
  const thread = await getServiceIntakeThreadByToken(input.trackingToken);
  if (!thread) {
    throw new Error("Nie znaleziono wątku zgłoszenia.");
  }
  if (thread.intake.status === "closed" || thread.intake.status === "rejected") {
    throw new Error("Wątek jest zamknięty — nie można dodać wiadomości.");
  }

  const body = input.body.trim();
  if (!body) {
    throw new Error("Wiadomość nie może być pusta.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("service_intake_comments")
    .insert({
      intake_id: thread.intake.id,
      author_name: input.authorName.trim(),
      author_side: input.authorSide,
      body,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToComment(data);
}

export async function getServiceIntakeThreadById(id: string): Promise<ServiceIntakeThread | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("service_intake_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const intake = rowToIntakeRecord(data);
  const [{ data: attachments }, { data: comments }, clientResult, projectResult] = await Promise.all([
    supabase
      .from("service_intake_attachments")
      .select("*")
      .eq("intake_id", intake.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("service_intake_comments")
      .select("*")
      .eq("intake_id", intake.id)
      .order("created_at", { ascending: true }),
    intake.clientId
      ? supabase.from("clients").select("full_name").eq("id", intake.clientId).maybeSingle()
      : Promise.resolve({ data: null }),
    intake.projectId
      ? supabase.from("projects").select("name").eq("id", intake.projectId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    intake: {
      ...intake,
      clientName: clientResult.data?.full_name ?? intake.clientName ?? null,
      projectName: projectResult.data?.name ?? intake.projectName ?? null,
    },
    attachments: (attachments ?? []).map((row) => rowToAttachment(row)),
    comments: (comments ?? []).map((row) => rowToComment(row)),
  };
}

export async function listServiceIntakeByProject(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("service_intake_requests")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToIntakeRecord(row));
}

export async function addServiceIntakeTeamComment(input: {
  intakeId: string;
  authorName: string;
  body: string;
}) {
  const thread = await getServiceIntakeThreadById(input.intakeId);
  if (!thread) {
    throw new Error("Nie znaleziono zgłoszenia.");
  }
  if (thread.intake.status === "closed" || thread.intake.status === "rejected") {
    throw new Error("Zgłoszenie jest zamknięte.");
  }

  return addServiceIntakeComment({
    trackingToken: thread.intake.trackingToken,
    authorName: input.authorName,
    authorSide: "team",
    body: input.body,
  });
}

export async function countServiceIntakeAlerts() {
  const items = await listServiceIntakeRequests();
  const newCount = items.filter((item) => item.status === "new").length;
  const overdueCount = items.filter((item) => isServiceIntakeOverdue(item)).length;
  return { newCount, overdueCount };
}

export async function getPublicServiceRates() {
  return fetchServiceRates();
}
