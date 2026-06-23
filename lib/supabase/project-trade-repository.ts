import type { ProjectTrade, ProjectTradeInput } from "@/lib/dashboard/trade-types";
import { getSupabase } from "@/lib/supabase/client";

type TradeRow = {
  id: string;
  project_id: string;
  name: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
};

function rowToTrade(row: TradeRow): ProjectTrade {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    company: row.company,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    description: row.description,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeInput(input: ProjectTradeInput) {
  return {
    name: input.name.trim(),
    company: input.company?.trim() ?? "",
    contact_name: input.contactName?.trim() ?? "",
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    description: input.description?.trim() ?? "",
  };
}

export async function fetchProjectTrades(projectId: string): Promise<ProjectTrade[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_trades")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToTrade(row as TradeRow));
}

export async function addProjectTrade(projectId: string, input: ProjectTradeInput) {
  const supabase = getSupabase();
  const normalized = normalizeInput(input);
  if (!normalized.name) {
    throw new Error("Nazwa branży jest wymagana.");
  }

  const now = new Date().toISOString();
  const { data: lastRow } = await supabase
    .from("project_trades")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_trades")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      ...normalized,
      position,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToTrade(data as TradeRow);
}

export async function updateProjectTrade(tradeId: string, input: ProjectTradeInput) {
  const supabase = getSupabase();
  const normalized = normalizeInput(input);
  if (!normalized.name) {
    throw new Error("Nazwa branży jest wymagana.");
  }

  const { data, error } = await supabase
    .from("project_trades")
    .update({
      ...normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tradeId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToTrade(data as TradeRow);
}

export async function deleteProjectTrade(tradeId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_trades").delete().eq("id", tradeId);

  if (error) {
    throw new Error(error.message);
  }
}
