import {
  createDefaultInternalAcceptanceTemplateConfig,
  normalizeInternalAcceptanceTemplateConfig,
  type InternalAcceptanceTemplateConfig,
} from "@/lib/internal-acceptance/template-config";
import { getSupabase } from "@/lib/supabase/client";

type ConfigRow = {
  id: string;
  process_item_id: string;
  template_id: string;
  config: unknown;
  created_at: string;
  updated_at: string;
};

export async function fetchInternalAcceptanceTemplateConfig(
  processItemId: string,
): Promise<InternalAcceptanceTemplateConfig | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_internal_acceptance_configs")
    .select("config")
    .eq("process_item_id", processItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeInternalAcceptanceTemplateConfig(data.config);
}

export async function fetchInternalAcceptanceTemplateConfigOrDefault(
  processItemId: string,
): Promise<InternalAcceptanceTemplateConfig> {
  const saved = await fetchInternalAcceptanceTemplateConfig(processItemId);
  return saved ?? createDefaultInternalAcceptanceTemplateConfig();
}

export async function saveInternalAcceptanceTemplateConfig(
  processItemId: string,
  templateId: string,
  config: InternalAcceptanceTemplateConfig,
): Promise<InternalAcceptanceTemplateConfig> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const normalized = normalizeInternalAcceptanceTemplateConfig(config);

  const { data: existing, error: existingError } = await supabase
    .from("process_internal_acceptance_configs")
    .select("id")
    .eq("process_item_id", processItemId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("process_internal_acceptance_configs")
      .update({
        config: normalized,
        updated_at: now,
      })
      .eq("process_item_id", processItemId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("process_internal_acceptance_configs").insert({
      process_item_id: processItemId,
      template_id: templateId,
      config: normalized,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  return normalized;
}

export async function fetchTemplateInternalAcceptanceConfigs(
  templateId: string,
): Promise<Array<{ processItemId: string; config: InternalAcceptanceTemplateConfig }>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_internal_acceptance_configs")
    .select("process_item_id, config")
    .eq("template_id", templateId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    processItemId: (row as Pick<ConfigRow, "process_item_id">).process_item_id,
    config: normalizeInternalAcceptanceTemplateConfig(
      (row as Pick<ConfigRow, "config">).config,
    ),
  }));
}
