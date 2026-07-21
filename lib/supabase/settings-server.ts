import {
  DEFAULT_FIELD_OPTIONS,
  normalizeFieldOptions,
  type FieldOptions,
} from "@/lib/field-options";
import { createClient } from "@/lib/supabase/server-auth";

const SETTINGS_ID = "field_options";

export async function fetchFieldOptionsServer(): Promise<FieldOptions> {
  const supabase = await createClient();
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
