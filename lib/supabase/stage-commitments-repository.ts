// Krok A A7 (docs/08 D27 2.4).
import { getSupabase } from "@/lib/supabase/client";
import type { StageCommitment, StageCommitmentStatus } from "@/lib/stage-commitments/types";
import { projectProcessItemPlannedDateUpdate } from "@/lib/supabase/process-item-mappers";
import { updateProjectProcessCompletion } from "@/lib/supabase/process-repository";

export async function fetchStageCommitments(horizonDays = 21): Promise<StageCommitment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_stage_commitments", {
    p_horizon_days: horizonDays,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageTitle: row.stage_title,
    itemId: row.item_id,
    templateItemId: row.template_item_id,
    title: row.title,
    terminWynikajacy: row.termin_wynikajacy,
    dataPlanowana: row.data_planowana,
    dataUkonczenia: row.data_ukonczenia,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name,
    responsibleSource: (row.responsible_source as StageCommitment["responsibleSource"]) ?? null,
    status: row.status as StageCommitmentStatus,
  }));
}

/** A6 (docs/08 D27 2.4) — szybka edycja daty planowanej. BLOKADA (>= data kamienia) wymuszana
 *  triggerem w bazie (validate_project_process_item_data_planowana). */
export async function setStageCommitmentPlannedDate(itemId: string, dataPlanowana: string | null): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_process_items")
    .update(projectProcessItemPlannedDateUpdate(dataPlanowana))
    .eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}

/** A6 — oznaczenie ukończone/nieukończone z poziomu planu, tą samą ścieżką co pipeline (data_ukonczenia
 *  jest źródłem prawdy, completions to cache — docs/08 D27 2.2). */
export async function setStageCommitmentCompleted(
  projectId: string,
  templateItemId: string,
  completed: boolean,
  completedByName?: string,
): Promise<void> {
  await updateProjectProcessCompletion(projectId, templateItemId, completed, completedByName);
}

export async function setStageCommitmentAssignee(
  itemId: string,
  assigneeId: string | null,
  assigneeName: string | null,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_process_items")
    .update({
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}
