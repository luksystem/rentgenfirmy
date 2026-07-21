import { DEFAULT_FIELD_OPTIONS, normalizeFieldOptions, type FieldOptions } from "@/lib/field-options";
import { getSupabase } from "@/lib/supabase/client";

const SETTINGS_ID = "field_options";

export async function fetchFieldOptions(): Promise<FieldOptions> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return DEFAULT_FIELD_OPTIONS;
  }

  return normalizeFieldOptions(data.data as Partial<FieldOptions>);
}

export async function saveFieldOptions(options: FieldOptions): Promise<FieldOptions> {
  const supabase = getSupabase();
  const normalized = normalizeFieldOptions(options);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        data: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeFieldOptions(data.data as Partial<FieldOptions>);
}

/**
 * Read-modify-write: zawsze bazuje na świeżych danych z serwera,
 * żeby lokalnie stale fieldOptions nie nadpisywały katalogu branż.
 */
export async function patchFieldOptions(
  mutator: (current: FieldOptions) => FieldOptions,
): Promise<FieldOptions> {
  const current = await fetchFieldOptions();
  return saveFieldOptions(mutator(current));
}
