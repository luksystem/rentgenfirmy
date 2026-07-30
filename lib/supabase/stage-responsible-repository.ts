// D42 pkt 4b — odpowiedzialny za etap. Czytane z report_stage_responsible, JEDNEGO źródła dla
// wszystkich miejsc wyświetlania, żeby nie powstały cztery różne definicje tego samego.
//
// UWAGA: to NIE jest lider etapu (project_stage_leads). Odpowiedzialny prowadzi etap i wynika
// z macierzy ról; lider montażu prowadzi brygadę i jest wskazywany ręcznie. Funkcja zwraca oba,
// osobnymi polami, i UI ma je podpisywać inaczej.
import { getSupabase } from "@/lib/supabase/client";

export type StageResponsible = {
  stageId: string;
  stageCode: string;
  stageTitle: string;
  stagePosition: number;
  /** Kod roli oznaczonej `is_glowny` w macierzy etapu. null = etap nie ma głównego odpowiedzialnego. */
  roleCode: string | null;
  roleName: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  /** 'obsada' — slot obsadzony wprost; 'fallback' — podstawiony zastępczo (UI: badge „zastępczo”). */
  slotSource: string | null;
  /** Rola, która faktycznie pokryła odpowiedzialność — wypełniona TYLKO przy 'fallback'. Bez tego
   *  badge „zastępczo” mówiłby, że ktoś jest zastępstwem, ale nie za kogo. */
  coveredByRoleCode: string | null;
  coveredByRoleName: string | null;
  requiresProjectStageLead: boolean;
  stageLeadUserId: string | null;
  stageLeadName: string | null;
};

export async function fetchStageResponsible(projectId: string): Promise<StageResponsible[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_stage_responsible", {
    p_project_id: projectId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    stageId: row.stage_id,
    stageCode: row.stage_code,
    stageTitle: row.stage_title,
    stagePosition: row.stage_position,
    roleCode: row.role_code,
    roleName: row.role_name,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name,
    slotSource: row.slot_source,
    coveredByRoleCode: row.covered_by_role_code,
    coveredByRoleName: row.covered_by_role_name,
    requiresProjectStageLead: row.requires_project_stage_lead,
    stageLeadUserId: row.stage_lead_user_id,
    stageLeadName: row.stage_lead_name,
  }));
}

export function indexStageResponsibleByStageId(
  rows: StageResponsible[],
): Record<string, StageResponsible> {
  const map: Record<string, StageResponsible> = {};
  for (const row of rows) {
    map[row.stageId] = row;
  }
  return map;
}
