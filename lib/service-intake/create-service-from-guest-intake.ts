import type { ServiceAiEstimateRecord } from "@/lib/service/ai-estimate-types";
import type { ServiceIntakeWorkPreference } from "@/lib/service-intake/types";
import { defaultClientOfferExpiry } from "@/lib/service/offer-validity";
import { contactToServiceClient, type Contact } from "@/lib/contacts/types";
import { formatPartyName } from "@/lib/party/display-name";
import type { ServiceLineItems, ServiceRecord, ServiceType } from "@/lib/service/types";
import { emptyLineItems } from "@/lib/service/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeServiceGlobalSettings, rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";

const WORK_PREFERENCE_LABELS: Record<ServiceIntakeWorkPreference, string> = {
  on_site: "Praca u klienta w obiekcie",
  remote: "Praca zdalna",
  either: "Do ustalenia (u klienta lub zdalnie)",
};

export async function createServiceFromGuestIntake(input: {
  intakeReference: string;
  contact: Contact;
  serviceTypeHint: ServiceType;
  description: string;
  workPreference: ServiceIntakeWorkPreference | null;
  aiEstimateRecord: ServiceAiEstimateRecord;
  lineItems: ServiceLineItems;
}): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
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
    ? `Prośba o ofertę: ${taskNames}`
    : `Prośba o ofertę — ${formatPartyName(input.contact)}`;

  const preferenceNote = input.workPreference
    ? `Preferencja klienta: ${WORK_PREFERENCE_LABELS[input.workPreference]}.`
    : "";

  const workReportNote = [
    preferenceNote,
    `Zgłoszenie ${input.intakeReference} — nowy kontakt zaakceptował orientacyjną wycenę AI.`,
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
    projectId: null,
    clientId: null,
    contactId: input.contact.id,
    client: contactToServiceClient(input.contact),
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
    intakeReference: input.intakeReference,
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
