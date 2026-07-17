import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizIntegratedSystemRow } from "@/lib/supabase/database.types";
import { rowToVizIntegratedSystem } from "@/lib/supabase/viz-mappers";
import type { VizIntegratedSystem } from "@/lib/viz/types";

type SystemRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  dashboard_id: string | null;
};

export type VizDashboardSystemInput = {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

function slugifyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export async function listVizDashboardSystems(dashboardId: string): Promise<VizIntegratedSystem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_integrated_systems")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("sort_order")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToVizIntegratedSystem(row as SystemRow));
}

async function listGlobalSystemTemplates() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_integrated_systems")
    .select("*")
    .is("dashboard_id", null)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SystemRow[];
}

/** Kopiuje globalny szablon systemów do dashboardu, jeśli katalog jest pusty. */
export async function ensureVizDashboardSystemsCatalog(
  dashboardId: string,
): Promise<VizIntegratedSystem[]> {
  const existing = await listVizDashboardSystems(dashboardId);
  if (existing.length) {
    return existing;
  }

  const templates = await listGlobalSystemTemplates();
  if (!templates.length) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const payload = templates.map((template) => ({
    dashboard_id: dashboardId,
    code: template.code,
    name: template.name,
    description: template.description,
    sort_order: template.sort_order,
    is_active: true,
  }));

  const { error } = await supabase.from("viz_integrated_systems").insert(payload);
  if (error) {
    throw new Error(error.message);
  }

  return listVizDashboardSystems(dashboardId);
}

export async function createVizDashboardSystem(
  dashboardId: string,
  input: VizDashboardSystemInput,
): Promise<VizIntegratedSystem> {
  const supabase = getSupabaseAdmin();
  const code = slugifyCode(input.code || input.name);
  if (!code) {
    throw new Error("Kod systemu jest wymagany.");
  }

  const existing = await listVizDashboardSystems(dashboardId);
  const maxSort = existing.reduce((max, item) => Math.max(max, item.sortOrder), 0);

  const { data, error } = await supabase
    .from("viz_integrated_systems")
    .insert({
      dashboard_id: dashboardId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? maxSort + 10,
      is_active: input.isActive !== false,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      throw new Error("System o tym kodzie już istnieje w tym dashboardzie.");
    }
    throw new Error(error.message);
  }

  return rowToVizIntegratedSystem(data as SystemRow);
}

export async function updateVizDashboardSystem(
  systemId: string,
  input: Partial<VizDashboardSystemInput>,
): Promise<VizIntegratedSystem> {
  const supabase = getSupabaseAdmin();
  const payload: Partial<VizIntegratedSystemRow> = {};

  if (input.name !== undefined) {
    payload.name = input.name.trim();
  }
  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }
  if (input.sortOrder !== undefined) {
    payload.sort_order = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  if (input.code !== undefined) {
    const code = slugifyCode(input.code);
    if (!code) {
      throw new Error("Kod systemu jest wymagany.");
    }
    payload.code = code;
  }

  const { data, error } = await supabase
    .from("viz_integrated_systems")
    .update(payload)
    .eq("id", systemId)
    .not("dashboard_id", "is", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToVizIntegratedSystem(data as SystemRow);
}

export async function deleteVizDashboardSystem(systemId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("viz_integrated_systems")
    .delete()
    .eq("id", systemId)
    .not("dashboard_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resetVizDashboardSystemsFromTemplate(dashboardId: string) {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("viz_integrated_systems")
    .delete()
    .eq("dashboard_id", dashboardId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return ensureVizDashboardSystemsCatalog(dashboardId);
}
