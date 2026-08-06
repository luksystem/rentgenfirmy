import type { ContractContentBlock } from "@/lib/contracts/types";
import { getSupabase } from "@/lib/supabase/client";
import { contractContentBlockToInsert, rowToContractContentBlock } from "@/lib/supabase/contract-mappers";

export async function fetchContractContentBlocks(): Promise<ContractContentBlock[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contract_content_blocks")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToContractContentBlock);
}

export async function upsertContractContentBlock(
  block: ContractContentBlock,
): Promise<ContractContentBlock> {
  const supabase = getSupabase();
  const payload = contractContentBlockToInsert({ ...block, updatedAt: new Date().toISOString() });

  const { data, error } = await supabase
    .from("contract_content_blocks")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContractContentBlock(data);
}

export async function deleteContractContentBlock(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("contract_content_blocks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
