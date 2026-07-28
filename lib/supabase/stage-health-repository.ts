// Faza 7 (Warstwa sygnałów + zdrowie etapu) — docs/08 D3/D26.
import { getSupabase } from "@/lib/supabase/client";
import type { ProjectStageHealth, StageHealthBand } from "@/lib/stage-health/types";

export async function fetchStageHealth(): Promise<ProjectStageHealth[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_stage_health");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageTitle: row.stage_title,
    openBlockersCount: row.open_blockers_count,
    overdueReviewsCount: row.overdue_reviews_count,
    staleAcceptancesCount: row.stale_acceptances_count,
    overdueTasksCount: row.overdue_tasks_count,
    rawScore: row.raw_score,
    band: row.band as StageHealthBand,
  }));
}
