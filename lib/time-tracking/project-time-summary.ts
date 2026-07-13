import type { TimeEntryView } from "@/lib/time-tracking/types";

export type ProjectTimeStageSummary = {
  stageId: string | null;
  stageTitle: string;
  totalMinutes: number;
  entryCount: number;
};

export type ProjectTimeSummary = {
  totalMinutes: number;
  entryCount: number;
  byStage: ProjectTimeStageSummary[];
};

export type ProjectTimeEntryRow = TimeEntryView & {
  userDisplayName: string;
  processStageTitle: string | null;
};

const UNASSIGNED_STAGE_TITLE = "Bez przypisanego etapu";

export function resolveProcessStageTitle(
  stageId: string | null | undefined,
  stageTitleById: Map<string, string>,
) {
  if (!stageId) {
    return null;
  }
  return stageTitleById.get(stageId) ?? "Nieznany etap";
}

export function buildProjectTimeSummary(
  entries: Array<Pick<ProjectTimeEntryRow, "durationMinutes" | "processStageId" | "processStageTitle">>,
  stageOrder: Array<{ id: string; title: string }>,
): ProjectTimeSummary {
  const totalsByStage = new Map<string | null, { totalMinutes: number; entryCount: number; title: string }>();

  for (const entry of entries) {
    const stageId = entry.processStageId ?? null;
    const title = entry.processStageTitle ?? UNASSIGNED_STAGE_TITLE;
    const bucket = totalsByStage.get(stageId) ?? { totalMinutes: 0, entryCount: 0, title };
    bucket.totalMinutes += entry.durationMinutes;
    bucket.entryCount += 1;
    totalsByStage.set(stageId, bucket);
  }

  const byStage: ProjectTimeStageSummary[] = [];

  for (const stage of stageOrder) {
    const bucket = totalsByStage.get(stage.id);
    if (!bucket || bucket.entryCount === 0) {
      continue;
    }
    byStage.push({
      stageId: stage.id,
      stageTitle: stage.title,
      totalMinutes: bucket.totalMinutes,
      entryCount: bucket.entryCount,
    });
    totalsByStage.delete(stage.id);
  }

  for (const [stageId, bucket] of totalsByStage) {
    byStage.push({
      stageId,
      stageTitle: bucket.title,
      totalMinutes: bucket.totalMinutes,
      entryCount: bucket.entryCount,
    });
  }

  return {
    totalMinutes: entries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
    entryCount: entries.length,
    byStage,
  };
}
