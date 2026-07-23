import { partyToServiceClientName } from "@/lib/party/display-name";
import type { ServiceAiEstimateRecord } from "@/lib/service/ai-estimate-types";
import type { ServiceIntakeWorkPreference } from "@/lib/service-intake/types";
import { defaultClientOfferExpiry } from "@/lib/service/offer-validity";
import type { ServiceLineItems, ServiceRecord, ServiceType, Client } from "@/lib/service/types";
import { emptyLineItems } from "@/lib/service/types";
import { rowToClient } from "@/lib/supabase/client-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeServiceGlobalSettings, rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";

const WORK_PREFERENCE_LABELS: Record<ServiceIntakeWorkPreference, string> = {
  on_site: "Praca u klienta w obiekcie",
  remote: "Praca zdalna",
  either: "Do ustalenia (u klienta lub zdalnie)",
};

export async function createServiceFromIntakePreliminaryAcceptance(input: {
  intakeId: string;
  referenceNumber: string;
  clientId: string;
  projectId: string;
  contactEmail: string;
  contactFullName: string;
  contactPhone: string | null;
  serviceTypeHint: ServiceType;
  description: string;
  projectName: string;
  workPreference: ServiceIntakeWorkPreference | null;
  aiEstimateRecord: ServiceAiEstimateRecord;
  lineItems: ServiceLineItems;
}): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", input.clientId)
    .maybeSingle();

  if (clientError) {
    throw new Error(clientError.message);
  }
  if (!clientRow) {
    throw new Error("Nie znaleziono klienta.");
  }

  const client: Client = rowToClient(clientRow);
  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", "service_global_settings")
    .maybeSingle();

  const settings = normalizeServiceGlobalSettings(settingsRow?.data ?? {});
  const now = new Date().toISOString();

  const taskNames = input.aiEstimateRecord.proposal.recognizedTasks
    .map((task) => task.name)
    .slice(0, 2)
    .join(", ");
  const title = taskNames
    ? `Wstępna oferta: ${taskNames}`
    : `Wstępna oferta — ${input.projectName}`;

  const preferenceNote = input.workPreference
    ? `Preferencja klienta: ${WORK_PREFERENCE_LABELS[input.workPreference]}.`
    : "";

  const workReportNote = [
    preferenceNote,
    `Zgłoszenie ${input.referenceNumber} — klient zaakceptował orientacyjną wycenę AI.`,
    input.aiEstimateRecord.proposal.summary,
  ]
    .filter(Boolean)
    .join("\n\n");

  const estimate: ServiceLineItems = {
    ...input.lineItems,
    workReportNote: [workReportNote, input.lineItems.workReportNote].filter(Boolean).join("\n\n"),
  };

  const service: ServiceRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "Wycena",
    projectId: input.projectId,
    clientId: input.clientId,
    contactId: null,
    client: {
      fullName: partyToServiceClientName(client) || input.contactFullName.trim(),
      location: client.location,
      email: client.email || input.contactEmail,
      phone: client.phone || input.contactPhone || "",
    },
    title,
    serviceType: input.serviceTypeHint,
    rates: { ...settings.rates },
    estimateDiscounts: { ...settings.defaultDiscounts },
    actualDiscounts: { ...settings.defaultDiscounts },
    zoneSettings: { ...settings.zoneSettings },
    detailedSettlement: false,
    showEstimateComparison: true,
    estimate,
    actual: emptyLineItems(),
    optionalItems: [],
    clientOffer: {
      token: null,
      expiresAt: defaultClientOfferExpiry(),
      status: null,
      message: null,
      respondedAt: null,
      lastClientMessage: null,
    },
    clientOfferHistory: [],
    clientOfferAcceptedDocument: null,
    pricingModel: "hourly",
    fixedPriceTables: [],
    settlementOffer: {
      token: null,
      expiresAt: defaultClientOfferExpiry(),
      status: null,
      message: null,
      respondedAt: null,
      lastClientMessage: null,
    },
    settlementOfferHistory: [],
    settlementOfferAcceptedDocument: null,
    estimateApproval: { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] },
    settlementApproval: { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] },
    aiEstimate: {
      ...input.aiEstimateRecord,
      appliedAt: now,
      appliedLineItems: estimate,
      calculatedCosts: input.aiEstimateRecord.calculatedCosts,
    },
    intakeReference: input.referenceNumber,
    reviewedAt: null,
  };

  const { data, error } = await supabase
    .from("services")
    .insert(serviceToInsert(service))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToService(data);
}
