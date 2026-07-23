import { rowToService } from "@/lib/supabase/service-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ServiceRecord } from "@/lib/service/types";
import {
  appendOfferApprovalHistory,
  canDecideOfferApproval,
  type OfferApprovalState,
  type OfferKind,
} from "@/lib/service/offer-approval";
import { isAdministratorRole } from "@/lib/auth/types";

function isMissingTableError(message: string) {
  return message.toLowerCase().includes("does not exist");
}

async function fetchServiceRowServer(supabase: ReturnType<typeof getSupabaseAdmin>, serviceId: string) {
  const { data: row, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    throw new Error("Nie znaleziono oferty.");
  }
  return row;
}

export async function fetchServiceByIdServer(serviceId: string): Promise<ServiceRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data ? rowToService(data) : null;
}

function approvalColumns(kind: OfferKind) {
  const prefix = kind === "estimate" ? "estimate_approval" : "settlement_approval";
  return {
    status: `${prefix}_status`,
    requestedBy: `${prefix}_requested_by`,
    assignedAdminId: `${prefix}_assigned_admin_id`,
    note: `${prefix}_note`,
    history: `${prefix}_history`,
  } as const;
}

function approvalStateToRow(kind: OfferKind, approval: OfferApprovalState) {
  const columns = approvalColumns(kind);
  return {
    [columns.status]: approval.status,
    [columns.requestedBy]: approval.requestedBy,
    [columns.assignedAdminId]: approval.assignedAdminId,
    [columns.note]: approval.note,
    [columns.history]: approval.history,
  };
}

function approvalStateOf(service: ServiceRecord, kind: OfferKind): OfferApprovalState {
  return kind === "estimate" ? service.estimateApproval : service.settlementApproval;
}

export async function requestOfferApprovalServer(input: {
  serviceId: string;
  kind: OfferKind;
  requestedBy: string;
  assignedAdminId: string;
}): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const row = await fetchServiceRowServer(supabase, input.serviceId);
  const service = rowToService(row);
  const now = new Date().toISOString();

  const nextApproval: OfferApprovalState = {
    status: "pending",
    requestedBy: input.requestedBy,
    assignedAdminId: input.assignedAdminId,
    note: "",
    history: appendOfferApprovalHistory(approvalStateOf(service, input.kind).history, {
      type: "requested",
      actorId: input.requestedBy,
      at: now,
    }),
  };

  const { data, error } = await supabase
    .from("services")
    .update({ ...approvalStateToRow(input.kind, nextApproval), updated_at: now })
    .eq("id", input.serviceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToService(data);
}

export async function decideOfferApprovalServer(input: {
  serviceId: string;
  kind: OfferKind;
  decidedBy: string;
  decidedByRole: Parameters<typeof isAdministratorRole>[0];
  decision: "approve" | "question";
  note?: string;
}): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const row = await fetchServiceRowServer(supabase, input.serviceId);
  const service = rowToService(row);
  const approval = approvalStateOf(service, input.kind);

  if (
    !canDecideOfferApproval(approval, { id: input.decidedBy, role: input.decidedByRole })
  ) {
    throw new Error("Tylko wskazany administrator lub dowolny administrator może zdecydować.");
  }

  if (input.decision === "question" && !input.note?.trim()) {
    throw new Error("Pytanie do wnioskodawcy jest wymagane.");
  }

  const now = new Date().toISOString();
  const note = input.decision === "question" ? (input.note ?? "").trim() : "";

  const nextApproval: OfferApprovalState = {
    status: input.decision === "approve" ? "approved" : "question",
    requestedBy: approval.requestedBy,
    assignedAdminId: approval.assignedAdminId,
    note,
    history: appendOfferApprovalHistory(approval.history, {
      type: input.decision === "approve" ? "approved" : "question_asked",
      actorId: input.decidedBy,
      note: note || null,
      at: now,
    }),
  };

  const { data, error } = await supabase
    .from("services")
    .update({ ...approvalStateToRow(input.kind, nextApproval), updated_at: now })
    .eq("id", input.serviceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToService(data);
}

/**
 * Domyka cykl akceptacji po faktycznej wysyłce (przez wnioskodawcę po zaakceptowaniu, albo
 * bezpośrednio przez administratora). Zwraca requestedBy do powiadomienia, jeśli wysyłał ktoś
 * inny niż wnioskodawca.
 */
export async function resolveOfferApprovalAfterSendServer(
  service: ServiceRecord,
  kind: OfferKind,
  sentBy: string,
): Promise<{ notifyRequestedBy: string | null }> {
  const approval = approvalStateOf(service, kind);
  if (!approval.status) {
    return { notifyRequestedBy: null };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const nextApproval: OfferApprovalState = {
    status: null,
    requestedBy: null,
    assignedAdminId: null,
    note: "",
    history: appendOfferApprovalHistory(approval.history, {
      type: "sent",
      actorId: sentBy,
      at: now,
    }),
  };

  const { error } = await supabase
    .from("services")
    .update({ ...approvalStateToRow(kind, nextApproval), updated_at: now })
    .eq("id", service.id);

  if (error) {
    throw new Error(error.message);
  }

  const notifyRequestedBy =
    approval.requestedBy && approval.requestedBy !== sentBy ? approval.requestedBy : null;
  return { notifyRequestedBy };
}

export async function servicesTableExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("services").select("id").limit(1);
  if (!error) {
    return true;
  }
  return !isMissingTableError(error.message);
}

export async function fetchServicesByClientIdServer(clientId: string): Promise<ServiceRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToService);
}

export async function countUnreviewedIntakeOffersServer(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .is("reviewed_at", null)
    .not("intake_reference", "is", null);

  if (error) {
    if (isMissingTableError(error.message)) {
      return 0;
    }
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markIntakeOfferReviewedServer(serviceId: string): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: row, error: fetchError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!row) {
    throw new Error("Nie znaleziono oferty.");
  }

  const service = rowToService(row);
  if (!service.intakeReference?.trim() || service.reviewedAt) {
    return service;
  }

  const { data, error } = await supabase
    .from("services")
    .update({
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToService(data);
}
