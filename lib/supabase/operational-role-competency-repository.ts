// Faza 3 (Kompetencje) — operational_role_competency: kluczuje na resource_dictionary_items
// (dictionary_key 'operational_role'), NIE na role.code (docs/08 D21/D22 — trzy osobne osie
// "rola": odpowiedzialność za projekt / funkcja wykonawcza / kompetencja). Nazwa świadomie
// dłuższa niż "role_competency" (poprawka migracją 222), żeby uniknąć kolizji z role.code.
import { getSupabase } from "@/lib/supabase/client";
import type { ResourcePlanCompetencyRequirement } from "@/lib/resource-plan/types";

export async function fetchOperationalRoleCompetencyRequirements(
  roleItemId: string,
): Promise<ResourcePlanCompetencyRequirement[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("operational_role_competency")
    .select("competency_item_id, min_level_item_id")
    .eq("role_item_id", roleItemId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    competencyItemId: row.competency_item_id,
    minLevelItemId: row.min_level_item_id,
  }));
}

export async function setOperationalRoleCompetencyRequirements(
  roleItemId: string,
  requirements: ResourcePlanCompetencyRequirement[],
): Promise<void> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from("operational_role_competency")
    .delete()
    .eq("role_item_id", roleItemId);
  if (deleteError) throw new Error(deleteError.message);
  if (requirements.length === 0) return;
  const { error } = await supabase.from("operational_role_competency").insert(
    requirements.map((requirement) => ({
      role_item_id: roleItemId,
      competency_item_id: requirement.competencyItemId,
      min_level_item_id: requirement.minLevelItemId,
    })),
  );
  if (error) throw new Error(error.message);
}

export type CompetencyGap = {
  kind: "rola" | "etap";
  subjectLabel: string;
  competencyLabel: string;
  requiredLevelLabel: string;
  qualifiedPeopleCount: number;
};

/** Mapa luk (docs/04 §3.3) — role/etapy z wymaganą kompetencją, dla których <2 osoby ją mają na najwyższym poziomie. */
export async function fetchCompetencyGapMap(): Promise<CompetencyGap[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_competency_gap_map");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    kind: row.kind as CompetencyGap["kind"],
    subjectLabel: row.subject_label,
    competencyLabel: row.competency_label,
    requiredLevelLabel: row.required_level_label,
    qualifiedPeopleCount: row.qualified_people_count,
  }));
}
