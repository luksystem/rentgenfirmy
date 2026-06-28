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
