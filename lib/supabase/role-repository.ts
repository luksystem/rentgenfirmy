// Role procesowe — 9 kodów z docs/08 D10, tabela `role`. To NIE jest to samo co `operational_role`
// (funkcja wykonawcza, trzecia oś z D21/D22, słownik `resource_dictionary_items`) ani co legacy
// checkboxy `is_technical_lead/is_operational_lead/is_developer` w panelu dostępu do projektu.
// Trzy różne rzeczy o podobnie brzmiących nazwach — patrz docs/08 D42.
import { getSupabase } from "@/lib/supabase/client";

export type ProcessRole = {
  code: string;
  name: string;
  /** false dla `instalator` i `lider_montazu` — te role nie mają slotu na projekcie (docs/04),
   *  więc wpis w macierzy dla nich nigdy nie rozwiąże się na konkretną osobę. */
  usesProjectSlot: boolean;
};

export async function fetchProcessRoles(): Promise<ProcessRole[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("role")
    .select("code, name, uses_project_slot")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    code: row.code,
    name: row.name,
    usesProjectSlot: row.uses_project_slot,
  }));
}
