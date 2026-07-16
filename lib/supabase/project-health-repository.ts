import { getSupabase } from "@/lib/supabase/client";
import {
  rowToGoal,
  rowToGoalComment,
  rowToGoalDeferral,
  rowToGoalInitiative,
  rowToGoalUpdate,
} from "@/lib/supabase/goal-mappers";
import {
  buildProjectHealthThread,
  computeProjectHealthScore,
  type ProjectHealthBand,
  type ProjectHealthBundle,
  type ProjectHealthSentiment,
  type ProjectHealthSignals,
  type ProjectHealthSnapshot,
} from "@/lib/projects/project-health";
import type { GoalDeferralRow, GoalInitiativeRow } from "@/lib/supabase/database.types";

type SnapshotRow = {
  id: string;
  project_id: string;
  score: number;
  band: string;
  sentiment: string;
  summary_md: string;
  signals: unknown;
  stage_title: string | null;
  created_by: string | null;
  created_at: string;
};

function rowToSnapshot(row: SnapshotRow): ProjectHealthSnapshot {
  return {
    id: row.id,
    projectId: row.project_id,
    score: Number(row.score),
    band: row.band as ProjectHealthBand,
    sentiment: row.sentiment as ProjectHealthSentiment,
    summaryMd: row.summary_md,
    signals: (row.signals && typeof row.signals === "object"
      ? row.signals
      : {}) as ProjectHealthSignals,
    stageTitle: row.stage_title,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function fetchProjectHealthBundle(input: {
  projectId: string;
  projectName: string;
  stageTitle?: string | null;
  processProgressPercent?: number | null;
}): Promise<ProjectHealthBundle> {
  const supabase = getSupabase();
  const { data: goalRows, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("project_id", input.projectId)
    .order("updated_at", { ascending: false });

  if (goalsError) throw new Error(goalsError.message);

  const goals = (goalRows ?? []).map(rowToGoal);
  const goalIds = goals.map((g) => g.id);

  const snapshotPromise = supabase
    .from("project_health_snapshots")
    .select("*")
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [commentsRes, updatesRes, deferralsRes, initiativesRes, snapshotRes] = goalIds.length
    ? await Promise.all([
        supabase
          .from("goal_comments")
          .select("*")
          .in("goal_id", goalIds)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("goal_updates")
          .select("*")
          .in("goal_id", goalIds)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("goal_deferrals")
          .select("*")
          .in("goal_id", goalIds)
          .order("created_at", { ascending: false }),
        supabase.from("goal_initiatives").select("*").in("goal_id", goalIds).eq("kind", "task"),
        snapshotPromise,
      ])
    : [
        { data: [] as never[], error: null },
        { data: [] as never[], error: null },
        { data: [] as never[], error: null },
        { data: [] as never[], error: null },
        await snapshotPromise,
      ];

  for (const res of [commentsRes, updatesRes, deferralsRes, initiativesRes]) {
    if (res.error) throw new Error(res.error.message);
  }
  if (snapshotRes.error) throw new Error(snapshotRes.error.message);

  const comments = (commentsRes.data ?? []).map(rowToGoalComment);
  const updates = (updatesRes.data ?? []).map(rowToGoalUpdate);
  const deferrals = ((deferralsRes.data ?? []) as GoalDeferralRow[]).map(rowToGoalDeferral);
  const initiatives = ((initiativesRes.data ?? []) as GoalInitiativeRow[]).map(rowToGoalInitiative);

  const scored = computeProjectHealthScore({
    goals,
    initiatives,
    deferrals,
    comments,
    updates,
  });

  const thread = buildProjectHealthThread({
    goals,
    comments,
    updates,
    deferrals,
    initiatives,
  });

  return {
    projectId: input.projectId,
    projectName: input.projectName,
    stageTitle: input.stageTitle ?? null,
    processProgressPercent: input.processProgressPercent ?? null,
    score: scored.score,
    band: scored.band,
    sentiment: scored.sentiment,
    signals: scored.signals,
    thread,
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      progressPercent: g.progressPercent,
      periodEnd: g.periodEnd,
      needsRevisit: g.needsRevisit,
      deferralCount: g.deferralCount,
      lastDeferralReason: g.lastDeferralReason,
    })),
    latestSnapshot: snapshotRes.data ? rowToSnapshot(snapshotRes.data as SnapshotRow) : null,
  };
}

export async function saveProjectHealthSnapshot(input: {
  projectId: string;
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  summaryMd: string;
  signals: ProjectHealthSignals;
  stageTitle?: string | null;
  createdBy?: string | null;
}): Promise<ProjectHealthSnapshot> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_health_snapshots")
    .insert({
      project_id: input.projectId,
      score: input.score,
      band: input.band,
      sentiment: input.sentiment,
      summary_md: input.summaryMd,
      signals: input.signals,
      stage_title: input.stageTitle ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSnapshot(data as SnapshotRow);
}
