import { rowToService } from "@/lib/supabase/service-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ServiceRecord } from "@/lib/service/types";

function isMissingTableError(message: string) {
  return message.toLowerCase().includes("does not exist");
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
