import {
  CONTRACT_MODULE_SETTINGS_ID,
  normalizeContractModuleSettings,
  type ContractModuleSettings,
} from "@/lib/contracts/module-settings";
import { getSupabase } from "@/lib/supabase/client";

export async function fetchContractModuleSettings(): Promise<ContractModuleSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", CONTRACT_MODULE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeContractModuleSettings(data?.data);
}

export async function saveContractModuleSettings(
  settings: ContractModuleSettings,
): Promise<ContractModuleSettings> {
  const supabase = getSupabase();
  const normalized = normalizeContractModuleSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: CONTRACT_MODULE_SETTINGS_ID, data: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeContractModuleSettings(data.data);
}
