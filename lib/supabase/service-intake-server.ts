import { formatPartyName } from "@/lib/party/display-name";
import { getUserDisplayName } from "@/lib/auth/types";
import { buildClientAddressLine } from "@/lib/dashboard/google-maps";
import { intakePartyMatchesClient, type IntakePartyRecord } from "@/lib/service-intake/name-match";
import { rowToContact } from "@/lib/supabase/contact-mappers";
import {
  buildServiceIntakeStatusEmail,
  buildServiceIntakeSubmittedEmail,
  getServiceInboxRecipients,
  getServiceIntakeThreadUrl,
} from "@/lib/service-intake/email-templates";
import { serviceIntakeDueAt, isServiceIntakeOverdue, isServiceIntakeInactive, isServiceIntakeActive, isServiceIntakeAwaitingPickup } from "@/lib/service-intake/sla";
import { isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { sendTransactionalEmail } from "@/lib/email/send";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import {
  createIntakeGuestToken,
  createIntakeVerifiedToken,
  intakeTokenFullName,
  readIntakeGuestToken,
  readIntakeSessionToken,
  readIntakeVerifiedToken,
} from "@/lib/service-intake/tokens";
import { createServiceIntakePreliminaryOfferNotifications } from "@/lib/notifications/service-intake-offer";
import { createServiceFromGuestIntake } from "@/lib/service-intake/create-service-from-guest-intake";
import { appendContactHistoryAdmin, resolveContactFromIntakeAdmin } from "@/lib/supabase/contact-admin";
import {
  buildGuestServiceClient,
  formatGuestContactAddress,
  normalizeGuestContactAddress,
  validateGuestContactAddress,
  type GuestContactAddress,
} from "@/lib/service-intake/guest-address";
import {
  intakeAllowsPreliminaryAcceptance,
  intakeRequestTypeRequiresAiEstimate,
  intakeRequiresPreliminaryAcceptance,
  isCommercialIntakeRequestType,
  resolveIntakeAiServiceType,
  resolveIntakeEstimateScope,
  shouldApplyIntakePrioritySurcharge,
} from "@/lib/service-intake/ai-estimate-flow";
import { computeIntakeAiEstimate, applyEstimateScopeToLineItems } from "@/lib/service-intake/intake-ai-estimate";
import { createServiceFromIntakePreliminaryAcceptance } from "@/lib/service-intake/create-service-from-intake";
import { aggregateAiTaskHours, buildLineItemsFromAiEstimate } from "@/lib/service/apply-ai-estimate";
import type {
  ServiceIntakeAiEstimateSnapshot,
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
  ServiceIntakeWorkPreference,
} from "@/lib/service-intake/types";
import {
  isGuestIntakeRequestType,
  SERVICE_INTAKE_WORK_PREFERENCES,
} from "@/lib/service-intake/types";
import { SERVICE_INTAKE_STATUS_LABELS } from "@/lib/service-intake/types";
import { getWarrantyStatus, resolveServiceAiWarrantyContext } from "@/lib/project/warranty";
import { rowToProject } from "@/lib/supabase/mappers";
import { rowToClient } from "@/lib/supabase/client-mappers";
import { fetchCompanyProfileServer } from "@/lib/supabase/company-profile-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ServiceIntakeRequestRow } from "@/lib/supabase/database.types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
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
    prioritySurchargePercent: settings.intakeSettings.prioritySurchargePercent,
  };
}

function clientRowToParty(row: {
  first_name: string | null;
  last_name: string;
  location: string;
}): IntakePartyRecord {
  return {
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    location: row.location ?? "",
  };
}

async function findClientsByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .ilike("email", normalized)
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((row) => normalizeEmail(row.email ?? "") === normalized);
}

async function findContactsByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .ilike("email", normalized)
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map(rowToContact)
    .filter((contact) => normalizeEmail(contact.email) === normalized);
}

async function fetchClientById(clientId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function resolveVerifiedIntakeClient(
  email: string,
  party: { firstName: string; lastName: string },
) {
  const clients = await findClientsByEmail(email);
  const contacts = await findContactsByEmail(email);

  for (const client of clients) {
    if (intakePartyMatchesClient(clientRowToParty(client), party)) {
      return client;
    }
  }

  for (const contact of contacts) {
    if (
      !intakePartyMatchesClient(
        {
          firstName: contact.firstName,
          lastName: contact.lastName,
          location: contact.location,
        },
        party,
      )
    ) {
      continue;
    }

    if (contact.convertedClientId) {
      const convertedClient = await fetchClientById(contact.convertedClientId);
      if (convertedClient && normalizeEmail(convertedClient.email ?? "") === normalizeEmail(email)) {
        return convertedClient;
      }
      if (convertedClient) {
        return convertedClient;
      }
    }

    if (clients.length > 0) {
      return clients[0];
    }
  }

  return null;
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

function normalizeWorkPreference(value: unknown): ServiceIntakeWorkPreference | null {
  return typeof value === "string" &&
    (SERVICE_INTAKE_WORK_PREFERENCES as readonly string[]).includes(value)
    ? (value as ServiceIntakeWorkPreference)
    : null;
}

function normalizeIntakeAiEstimate(value: unknown): ServiceIntakeAiEstimateSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (!row.public || !row.record) {
    return null;
  }

  return {
    public: row.public as ServiceIntakeAiEstimateSnapshot["public"],
    record: row.record as ServiceIntakeAiEstimateSnapshot["record"],
    serviceType:
      (row.serviceType as ServiceIntakeAiEstimateSnapshot["serviceType"]) ?? "Pogwarancyjny",
  };
}

function rowToIntakeRecord(
  row: Record<string, unknown>,
  extras?: { clientName?: string | null; projectName?: string | null; clientAddress?: string | null },
): ServiceIntakeRecord {
  const metadataJson = (row.metadata_json as Record<string, unknown>) ?? {};
  const contactLocation =
    typeof metadataJson.contactLocation === "string" ? metadataJson.contactLocation : null;

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
    dueAt: row.due_at ? String(row.due_at) : null,
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    assigneeName: row.assignee_name ? String(row.assignee_name) : null,
    aiEstimate: normalizeIntakeAiEstimate(row.ai_estimate),
    workPreference: normalizeWorkPreference(row.work_preference),
    preliminaryAcceptedAt: row.preliminary_accepted_at
      ? String(row.preliminary_accepted_at)
      : null,
    clientName: extras?.clientName ?? null,
    projectName: extras?.projectName ?? null,
    clientAddress: extras?.clientAddress ?? contactLocation,
  };
}

type ClientAddressRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
  location: string | null;
};

function clientRowAddressLine(row: Pick<
  ClientAddressRow,
  "address_street" | "address_city" | "address_postal_code" | "location"
>) {
  return buildClientAddressLine({
    addressStreet: row.address_street ?? "",
    addressCity: row.address_city ?? "",
    addressPostalCode: row.address_postal_code ?? "",
    location: row.location ?? "",
  });
}

function clientRowDisplayName(row: Pick<ClientAddressRow, "first_name" | "last_name">) {
  return formatPartyName({
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
  });
}

/** Uzupełnia nazwę/adres klienta — także przez project.client_id, gdy intake.client_id jest puste. */
async function hydrateServiceIntakeRows(
  rows: Array<Record<string, unknown>>,
): Promise<ServiceIntakeRecord[]> {
  if (rows.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const directClientIds = [
    ...new Set(rows.map((row) => row.client_id).filter(Boolean).map(String)),
  ];
  const projectIds = [
    ...new Set(rows.map((row) => row.project_id).filter(Boolean).map(String)),
  ];

  const { data: projects } = projectIds.length
    ? await supabase.from("projects").select("id, name, client_id").in("id", projectIds)
    : { data: [] as Array<{ id: string; name: string; client_id: string | null }> };

  const projectMap = new Map(
    (projects ?? []).map((row) => [
      row.id,
      { name: row.name, clientId: row.client_id ? String(row.client_id) : null },
    ]),
  );

  const projectClientIds = [...projectMap.values()]
    .map((project) => project.clientId)
    .filter((id): id is string => Boolean(id));
  const allClientIds = [...new Set([...directClientIds, ...projectClientIds])];

  const { data: clients } = allClientIds.length
    ? await supabase
        .from("clients")
        .select("id, first_name, last_name, address_street, address_city, address_postal_code, location")
        .in("id", allClientIds)
    : { data: [] as ClientAddressRow[] };

  const clientMap = new Map((clients ?? []).map((row) => [row.id, row as ClientAddressRow]));

  return rows.map((row) => {
    const directClient = row.client_id ? clientMap.get(String(row.client_id)) : undefined;
    const project = row.project_id ? projectMap.get(String(row.project_id)) : undefined;
    const projectClient = project?.clientId ? clientMap.get(project.clientId) : undefined;
    const resolvedClient = directClient ?? projectClient;

    return rowToIntakeRecord(row, {
      clientName: resolvedClient ? clientRowDisplayName(resolvedClient) : null,
      projectName: project?.name ?? null,
      clientAddress: resolvedClient ? clientRowAddressLine(resolvedClient) || null : undefined,
    });
  });
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
  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);
  const template = buildServiceIntakeSubmittedEmail(
    {
      referenceNumber: record.referenceNumber,
      contactFullName: record.contactFullName,
      threadUrl,
    },
    { settings, company },
  );

  const sends: Array<Promise<unknown>> = [];
  if (isEmailAudienceEnabled(settings.routing, "service_intake_submitted", "client")) {
    sends.push(
      sendTransactionalEmail({
        to: record.contactEmail,
        subject: template.subject,
        html: template.html,
      }),
    );
  }
  if (isEmailAudienceEnabled(settings.routing, "service_intake_submitted", "inbox")) {
    sends.push(
      sendTransactionalEmail({
        to: getServiceInboxRecipients(settings),
        subject: `[Nowe] ${template.subject}`,
        html: `${template.html}<p>Klient: ${record.contactEmail}</p><p>Projekt: ${record.projectName ?? "—"}</p>`,
      }),
    );
  }
  if (sends.length) {
    await Promise.allSettled(sends);
  }
}

async function notifyServiceIntakeStatusChange(record: ServiceIntakeRecord) {
  const threadUrl = getServiceIntakeThreadUrl(record.trackingToken);
  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);
  const template = buildServiceIntakeStatusEmail(
    {
      referenceNumber: record.referenceNumber,
      contactFullName: record.contactFullName,
      statusLabel: SERVICE_INTAKE_STATUS_LABELS[record.status],
      threadUrl,
    },
    { settings, company },
  );

  const sends: Array<Promise<unknown>> = [];
  if (isEmailAudienceEnabled(settings.routing, "service_intake_status", "client")) {
    sends.push(
      sendTransactionalEmail({
        to: record.contactEmail,
        subject: template.subject,
        html: template.html,
      }),
    );
  }
  if (isEmailAudienceEnabled(settings.routing, "service_intake_status", "inbox")) {
    sends.push(
      sendTransactionalEmail({
        to: getServiceInboxRecipients(settings),
        subject: `[Status] ${template.subject}`,
        html: template.html,
      }),
    );
  }
  if (sends.length) {
    await Promise.allSettled(sends);
  }
}

function resolveIntakePartyName(input: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
}) {
  if (input.firstName?.trim() || input.lastName?.trim()) {
    return {
      firstName: input.firstName?.trim() ?? "",
      lastName: input.lastName?.trim() ?? "",
      fullName: intakeTokenFullName(input),
    };
  }

  const fullName = input.fullName?.trim() ?? "";
  const spaceIdx = fullName.indexOf(" ");
  if (spaceIdx === -1) {
    return { firstName: "", lastName: fullName, fullName };
  }

  return {
    firstName: fullName.slice(0, spaceIdx).trim(),
    lastName: fullName.slice(spaceIdx + 1).trim() || fullName,
    fullName,
  };
}

export async function verifyServiceIntakeIdentity(input: {
  sessionToken: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}): Promise<ServiceIntakeVerifyResult | null> {
  const session = readIntakeSessionToken(input.sessionToken);
  const email = normalizeEmail(input.email);
  const party = resolveIntakePartyName(input);

  if (!session || session.email !== email) {
    return null;
  }

  const client = await resolveVerifiedIntakeClient(email, party);
  if (!client) {
    return null;
  }

  const clientParty = clientRowToParty(client);
  const clientDisplayName = formatPartyName(clientParty);

  const projects = await fetchClientProjects(client.id);
  const rates = await fetchServiceRates();

  return {
    verificationToken: createIntakeVerifiedToken({
      email,
      clientId: client.id,
      firstName: party.firstName,
      lastName: party.lastName,
    }),
    clientDisplayName: clientDisplayName || party.fullName,
    projects: projects.map(projectToIntakeOption),
    rates,
  };
}

export async function createGuestIntakeSession(input: {
  sessionToken: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}): Promise<ServiceIntakeVerifyResult> {
  const session = readIntakeSessionToken(input.sessionToken);
  const email = normalizeEmail(input.email);
  const party = resolveIntakePartyName(input);

  if (!session || session.email !== email) {
    throw new Error("Sesja wygasła. Odśwież stronę i zacznij od początku.");
  }

  if (!party.firstName.trim() && !party.lastName.trim()) {
    throw new Error("Podaj imię lub nazwisko.");
  }

  const rates = await fetchServiceRates();

  return {
    verificationToken: createIntakeGuestToken({
      email,
      firstName: party.firstName,
      lastName: party.lastName,
    }),
    clientDisplayName: party.fullName,
    isGuest: true,
    projects: [],
    rates,
  };
}

export async function submitGuestServiceIntakeRequest(input: {
  verificationToken: string;
  requestType: ServiceIntakeRequestType;
  description: string;
  contactPhone: string;
  contactAddress: GuestContactAddress;
  attachments?: Array<{ kind: "image" | "video" | "link"; url: string; label?: string | null }>;
  workPreference?: ServiceIntakeWorkPreference | null;
  preliminaryAccepted?: boolean;
  aiEstimateSnapshot?: ServiceIntakeAiEstimateSnapshot | null;
  estimateClarifications?: string | null;
}) {
  const guest = readIntakeGuestToken(input.verificationToken);
  if (!guest) {
    throw new Error("Sesja wygasła. Odśwież stronę i zacznij od początku.");
  }

  if (!isGuestIntakeRequestType(input.requestType)) {
    throw new Error("Gość może zgłosić tylko prośbę o ofertę lub nową funkcjonalność.");
  }

  if (!input.preliminaryAccepted) {
    throw new Error("Zaakceptuj orientacyjną wycenę, aby wysłać zgłoszenie.");
  }

  const phone = input.contactPhone.trim();
  if (phone.length < 7) {
    throw new Error("Podaj numer telefonu — jest wymagany dla nowych kontaktów.");
  }

  const locationError = validateGuestContactAddress(input.contactAddress);
  if (locationError) {
    throw new Error(locationError);
  }

  const contactAddress = normalizeGuestContactAddress(input.contactAddress);
  const location = formatGuestContactAddress(contactAddress);

  const description = input.description.trim();
  if (description.length < 10) {
    throw new Error("Opisz zgłoszenie (minimum 10 znaków).");
  }

  const supabase = getSupabaseAdmin();
  const referenceNumber = await nextReferenceNumber();
  const now = new Date().toISOString();
  const serviceTypeHint = resolveIntakeAiServiceType({
    requestType: input.requestType,
    isWarrantyActive: false,
  });
  const workPreference = normalizeWorkPreference(input.workPreference);
  let aiEstimateSnapshot = input.aiEstimateSnapshot ?? null;

  if (!aiEstimateSnapshot) {
    const companyProfile = await fetchCompanyProfileServer();
    const settings = normalizeServiceGlobalSettings(
      (
        await supabase.from("app_settings").select("data").eq("id", SETTINGS_ID).maybeSingle()
      ).data?.data ?? {},
    );
    const guestClient = buildGuestServiceClient({
      fullName: guest.fullName,
      email: guest.email,
      phone,
      address: contactAddress,
    });

    const computed = await computeIntakeAiEstimate({
      description,
      serviceType: serviceTypeHint,
      client: guestClient,
      projectId: "",
      projectName: location,
      warrantyContext: null,
      companyAddress: companyProfile.address,
      rates: settings.rates,
      zoneSettings: settings.zoneSettings,
      discounts: settings.defaultDiscounts,
      postWarrantyAction: null,
      isNewContact: true,
      estimateClarifications: input.estimateClarifications?.trim() || null,
      aiEstimateSettings: settings.aiEstimateSettings,
    });

    aiEstimateSnapshot = {
      public: computed.public,
      record: computed.record,
      serviceType: serviceTypeHint,
      requestType: input.requestType,
    };
  }

  const { contact, reusedExisting } = await resolveContactFromIntakeAdmin({
    firstName: guest.firstName,
    lastName: guest.lastName,
    location,
    addressStreet: contactAddress.addressStreet,
    addressCity: contactAddress.addressCity,
    addressPostalCode: contactAddress.addressPostalCode,
    email: guest.email,
    phone,
    notes: `Zgłoszenie ${referenceNumber} — kontakt spoza bazy klientów.`,
    intakeReference: referenceNumber,
  });

  const { data, error } = await supabase
    .from("service_intake_requests")
    .insert({
      reference_number: referenceNumber,
      status: "converted",
      client_id: null,
      project_id: null,
      contact_email: guest.email,
      contact_full_name: guest.fullName,
      contact_phone: phone,
      warranty_status: null,
      service_type_hint: serviceTypeHint,
      request_type: input.requestType,
      priority: null,
      post_warranty_action: null,
      description,
      accepted_paid_terms: false,
      accepted_paid_terms_at: null,
      due_at: serviceIntakeDueAt(now, null),
      ai_estimate: aiEstimateSnapshot,
      work_preference: workPreference,
      preliminary_accepted_at: now,
      metadata_json: {
        isGuest: true,
        contactId: contact.id,
        contactReused: reusedExisting,
        contactLocation: location,
        requestType: input.requestType,
        workPreference,
        preliminaryAccepted: true,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = rowToIntakeRecord(data, {
    clientName: guest.fullName,
    projectName: location,
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

  const computedLineItems = buildLineItemsFromAiEstimate({
    proposal: aiEstimateSnapshot.record.proposal,
    travelContext: aiEstimateSnapshot.record.travelContext,
  });

  const service = await createServiceFromGuestIntake({
    intakeReference: record.referenceNumber,
    contact,
    serviceTypeHint,
    description,
    workPreference,
    aiEstimateRecord: aiEstimateSnapshot.record,
    lineItems: computedLineItems,
  });

  await supabase
    .from("service_intake_requests")
    .update({
      service_id: service.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  record.serviceId = service.id;

  await appendContactHistoryAdmin(
    contact.id,
    "offer_linked",
    `Powiązano z rozliczeniem serwisowym ${service.title}.`,
    { serviceId: service.id },
  );

  await notifyServiceIntakeSubmitted(record);

  await createServiceIntakePreliminaryOfferNotifications({
    intakeId: record.id,
    serviceId: service.id,
    referenceNumber: record.referenceNumber,
    clientName: guest.fullName,
    projectName: location,
    estimatedNetTotal: aiEstimateSnapshot.public.estimatedNetTotal,
  }).catch(() => undefined);

  return record;
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
  workPreference?: ServiceIntakeWorkPreference | null;
  preliminaryAccepted?: boolean;
  aiEstimateSnapshot?: ServiceIntakeAiEstimateSnapshot | null;
  estimateClarifications?: string | null;
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
  const serviceTypeHint = resolveIntakeAiServiceType({
    requestType: input.requestType,
    isWarrantyActive,
  });
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

  const allowsPreliminaryAcceptance = intakeAllowsPreliminaryAcceptance({
    requestType: input.requestType,
    postWarrantyAction: input.postWarrantyAction,
  });

  const requiresPreliminaryAcceptance = intakeRequiresPreliminaryAcceptance({
    requestType: input.requestType,
    postWarrantyAction: input.postWarrantyAction,
  });

  if (requiresPreliminaryAcceptance && !input.preliminaryAccepted) {
    throw new Error("Zaakceptuj orientacyjną wycenę, aby wysłać zgłoszenie.");
  }

  const description = input.description.trim();
  if (description.length < 10) {
    throw new Error("Opisz problem (minimum 10 znaków).");
  }

  const supabase = getSupabaseAdmin();
  const referenceNumber = await nextReferenceNumber();
  const now = new Date().toISOString();
  const dueAt = serviceIntakeDueAt(now, isServiceRequest ? input.priority : null);

  const wantsAiEstimate = intakeRequestTypeRequiresAiEstimate({
    requestType: input.requestType,
    isWarrantyActive,
    isServiceRequest,
  });

  const allowsPreliminaryAcceptanceForSnapshot = allowsPreliminaryAcceptance;

  const workPreference = normalizeWorkPreference(input.workPreference);
  let aiEstimateSnapshot = input.aiEstimateSnapshot ?? null;

  if (wantsAiEstimate && !aiEstimateSnapshot) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("*")
      .eq("id", verified.clientId)
      .maybeSingle();

    if (clientRow) {
      const client = rowToClient(clientRow);
      const companyProfile = await fetchCompanyProfileServer();
      const settings = normalizeServiceGlobalSettings(
        (
          await supabase.from("app_settings").select("data").eq("id", SETTINGS_ID).maybeSingle()
        ).data?.data ?? {},
      );

      const warrantyContext = await resolveServiceAiWarrantyContext({
        project,
        projectId: project.id,
        serviceType: serviceTypeHint,
      });

      const applyPrioritySurcharge = shouldApplyIntakePrioritySurcharge({
        requestType: input.requestType,
        isWarrantyActive,
        priority: input.priority,
      });

      const computed = await computeIntakeAiEstimate({
        description,
        serviceType: serviceTypeHint,
        client,
        projectId: project.id,
        projectName: project.name,
        warrantyContext,
        companyAddress: companyProfile.address,
        rates: settings.rates,
        zoneSettings: settings.zoneSettings,
        discounts: settings.defaultDiscounts,
        prioritySurchargePercent: settings.intakeSettings.prioritySurchargePercent,
        applyPrioritySurcharge,
        postWarrantyAction:
          !isWarrantyActive && isServiceRequest ? input.postWarrantyAction : null,
        aiEstimateSettings: settings.aiEstimateSettings,
        estimateClarifications: input.estimateClarifications?.trim() || null,
      });

      aiEstimateSnapshot = {
        public: computed.public,
        record: computed.record,
        serviceType: serviceTypeHint,
        requestType: input.requestType,
        prioritySurchargeApplied: computed.public.prioritySurchargeApplied,
        prioritySurchargePercent: computed.public.prioritySurchargePercent,
      };
    }
  }

  const isCommercialRequest = isCommercialIntakeRequestType(input.requestType);
  const preliminaryAccepted = Boolean(
    input.preliminaryAccepted && allowsPreliminaryAcceptanceForSnapshot && aiEstimateSnapshot,
  );
  // Nowa funkcja / prośba o ofertę → Szybkie oferty (converted), nigdy otwarta karta na tablicy serwisowej.
  const convertsToQuickOffer = preliminaryAccepted || (isCommercialRequest && Boolean(aiEstimateSnapshot));

  if (isCommercialRequest && !aiEstimateSnapshot) {
    throw new Error("Brak orientacyjnej wyceny. Wróć do kroku wyceny i spróbuj ponownie.");
  }

  if (isCommercialRequest && !input.preliminaryAccepted) {
    throw new Error("Zaakceptuj orientacyjną wycenę — zgłoszenie trafi do oferty, nie na tablicę serwisową.");
  }

  const { data, error } = await supabase
    .from("service_intake_requests")
    .insert({
      reference_number: referenceNumber,
      status: convertsToQuickOffer ? "converted" : "new",
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
      accepted_paid_terms: false,
      accepted_paid_terms_at: null,
      due_at: dueAt,
      ai_estimate: aiEstimateSnapshot,
      work_preference: workPreference,
      preliminary_accepted_at: convertsToQuickOffer ? now : null,
      metadata_json: {
        projectName: project.name,
        warrantyLabel: warranty.label,
        requestType: input.requestType,
        postWarrantyAction: input.postWarrantyAction,
        workPreference,
        preliminaryAccepted: convertsToQuickOffer,
        routedToQuickOffer: isCommercialRequest,
        prioritySurchargeApplied: aiEstimateSnapshot?.prioritySurchargeApplied ?? false,
        prioritySurchargePercent: aiEstimateSnapshot?.prioritySurchargePercent ?? null,
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

  if (convertsToQuickOffer && aiEstimateSnapshot) {
    const estimateScope = resolveIntakeEstimateScope(
      !isWarrantyActive && isServiceRequest ? input.postWarrantyAction : null,
    );
    const remoteHours = aggregateAiTaskHours(
      aiEstimateSnapshot.record.proposal.recognizedTasks,
    ).programmerRemoteHours;
    const travelContext = aiEstimateSnapshot.record.travelContext;
    const computedLineItems = applyEstimateScopeToLineItems(
      buildLineItemsFromAiEstimate({
        proposal: aiEstimateSnapshot.record.proposal,
        travelContext:
          estimateScope === "remote_only"
            ? {
                ...travelContext,
                resolvedTrips: 0,
                resolvedOvernights: 0,
                estimatedDriveTimeHours: 0,
              }
            : travelContext,
      }),
      estimateScope,
      remoteHours,
    );

    const service = await createServiceFromIntakePreliminaryAcceptance({
        intakeId: record.id,
        referenceNumber: record.referenceNumber,
        clientId: verified.clientId,
        projectId: project.id,
        contactEmail: verified.email,
        contactFullName: verified.fullName,
        contactPhone: input.contactPhone?.trim() || null,
        serviceTypeHint: aiEstimateSnapshot.serviceType,
        description,
        projectName: project.name,
        workPreference,
        aiEstimateRecord: aiEstimateSnapshot.record,
        lineItems: computedLineItems,
      });

      await supabase
        .from("service_intake_requests")
        .update({
          service_id: service.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      record.serviceId = service.id;

      await createServiceIntakePreliminaryOfferNotifications({
        intakeId: record.id,
        serviceId: service.id,
        referenceNumber: record.referenceNumber,
        clientName: verified.fullName,
        projectName: project.name,
        estimatedNetTotal: aiEstimateSnapshot.public.estimatedNetTotal,
      }).catch(() => undefined);
  }

  return record;
}

export async function listServiceIntakeRequests(options?: {
  status?: ServiceIntakeStatus;
  requestType?: ServiceIntakeRequestType;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("service_intake_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.requestType) {
    query = query.eq("request_type", options.requestType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return hydrateServiceIntakeRows((data ?? []) as Array<Record<string, unknown>>);
}

async function resolveAssigneeUpdate(assigneeId: string | null) {
  if (!assigneeId) {
    return { assignee_id: null, assignee_name: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", assigneeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Nie znaleziono aktywnego użytkownika.");
  }

  const profile = mapProfileRow(data);
  return {
    assignee_id: profile.id,
    assignee_name: getUserDisplayName(profile),
  };
}

export async function updateServiceIntake(
  id: string,
  patch: {
    status?: ServiceIntakeStatus;
    dueAt?: string | null;
    assigneeId?: string | null;
  },
) {
  if (
    patch.status === undefined &&
    patch.dueAt === undefined &&
    patch.assigneeId === undefined
  ) {
    throw new Error("Brak pól do aktualizacji.");
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const update: Partial<ServiceIntakeRequestRow> = { updated_at: now };

  let previousStatus: ServiceIntakeStatus | null = null;
  if (patch.status !== undefined) {
    const { data: existing, error: existingError } = await supabase
      .from("service_intake_requests")
      .select("status, priority")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }
    if (!existing) {
      throw new Error("Nie znaleziono zgłoszenia.");
    }

    previousStatus = existing.status as ServiceIntakeStatus;
    const reopening =
      isServiceIntakeInactive(previousStatus) && !isServiceIntakeInactive(patch.status);

    update.status = patch.status;
    update.closed_at = isServiceIntakeInactive(patch.status) ? now : null;

    if (reopening) {
      update.due_at = serviceIntakeDueAt(
        now,
        existing.priority ? (existing.priority as ServiceIntakePriority) : null,
      );
    }
  }

  if (patch.dueAt !== undefined) {
    update.due_at = patch.dueAt;
  }

  if (patch.assigneeId !== undefined) {
    const assignee = await resolveAssigneeUpdate(patch.assigneeId);
    update.assignee_id = assignee.assignee_id;
    update.assignee_name = assignee.assignee_name;
  }

  const { data, error } = await supabase
    .from("service_intake_requests")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = rowToIntakeRecord(data);
  if (patch.status !== undefined) {
    await notifyServiceIntakeStatusChange(record);
  }
  return record;
}

export async function updateServiceIntakeStatus(id: string, status: ServiceIntakeStatus) {
  return updateServiceIntake(id, { status });
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

  const body = input.body.trim();
  if (!body) {
    throw new Error("Wiadomość nie może być pusta.");
  }

  const isInactive = isServiceIntakeInactive(thread.intake.status);
  if (isInactive && input.authorSide !== "client") {
    throw new Error("Zgłoszenie jest zamknięte — otwórz je ponownie, aby odpowiedzieć.");
  }

  if (isInactive && input.authorSide === "client") {
    await updateServiceIntake(thread.intake.id, { status: "in_review" });
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

  const [{ data: attachments }, { data: comments }, hydrated] = await Promise.all([
    supabase
      .from("service_intake_attachments")
      .select("*")
      .eq("intake_id", String(data.id))
      .order("created_at", { ascending: true }),
    supabase
      .from("service_intake_comments")
      .select("*")
      .eq("intake_id", String(data.id))
      .order("created_at", { ascending: true }),
    hydrateServiceIntakeRows([data as Record<string, unknown>]),
  ]);

  const intake = hydrated[0] ?? rowToIntakeRecord(data);

  return {
    intake,
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

  return hydrateServiceIntakeRows((data ?? []) as Array<Record<string, unknown>>);
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
  const items = await listServiceIntakeRequests({ requestType: "service" });
  const activeItems = items.filter((item) => isServiceIntakeActive(item.status));
  const overdueCount = activeItems.filter((item) => isServiceIntakeOverdue(item)).length;
  const newCount = activeItems.filter((item) => isServiceIntakeAwaitingPickup(item)).length;

  return {
    activeCount: activeItems.length,
    overdueCount,
    newCount,
  };
}

export async function getPublicServiceRates() {
  return fetchServiceRates();
}
