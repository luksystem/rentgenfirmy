// D46 — lider etapu: ranking kandydatów i zapis wyboru.
import { getSupabase } from "@/lib/supabase/client";
import {
  rankStageLeadCandidates,
  type RankedStageLeadCandidate,
} from "@/lib/resource-plan/stage-lead-ranking";

export async function fetchStageLeadCandidates(
  projectId: string,
  stageId: string,
): Promise<RankedStageLeadCandidate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_stage_lead_candidate_facts", {
    p_project_id: projectId,
    p_stage_id: stageId,
  });
  if (error) {
    throw new Error(error.message);
  }
  const facts = (data ?? []).map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
    assignedToStage: row.assigned_to_stage,
    knownProject: row.known_project,
    meetsCompetency: row.meets_competency,
    isAvailable: row.is_available,
    continuityFromPreviousStage: row.continuity_from_previous_stage,
  }));
  return rankStageLeadCandidates(facts);
}

/**
 * Jedyna droga zapisu lidera etapu — `set_project_stage_lead` w bazie wymusza `handoverNote` przy
 * zastąpieniu istniejącego lidera i zapisuje każdą zmianę do `project_stage_lead_history`.
 * `userId = null` zdejmuje lidera bez wskazania następcy.
 */
export async function setStageLead(input: {
  projectId: string;
  stageId: string;
  userId: string | null;
  handoverNote: string | null;
  changedBy: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("set_project_stage_lead", {
    p_project_id: input.projectId,
    p_stage_id: input.stageId,
    p_user_id: input.userId,
    p_handover_note: input.handoverNote,
    p_changed_by: input.changedBy,
  });
  if (error) {
    throw new Error(error.message);
  }
}
