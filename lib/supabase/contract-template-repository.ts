import type { ContractTemplate } from "@/lib/contracts/types";
import { getSupabase } from "@/lib/supabase/client";
import { contractTemplateToInsert, rowToContractTemplate } from "@/lib/supabase/contract-mappers";

export async function fetchContractTemplates(): Promise<ContractTemplate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToContractTemplate);
}

export async function upsertContractTemplate(template: ContractTemplate): Promise<ContractTemplate> {
  const supabase = getSupabase();
  const payload = contractTemplateToInsert({ ...template, updatedAt: new Date().toISOString() });

  const { data, error } = await supabase
    .from("contract_templates")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContractTemplate(data);
}

export async function deleteContractTemplate(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("contract_templates").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
