"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import type { ReviewSide } from "@/lib/dashboard/satisfaction-types";
import { StageSatisfactionDialog } from "@/components/dashboard/stage-satisfaction-dialog";
import { useProjectSatisfactionStore } from "@/store/project-satisfaction-store";

function getCompletedStages(template: ProcessTemplate, process: ProjectProcess | null | undefined) {
  if (!process) {
    return [];
  }

  return template.stages.filter((stage) => {
    const items = stage.milestones.flatMap((milestone) => milestone.items);
    if (items.length === 0) {
      return false;
    }
    return items.every((item) => Boolean(process.completions?.[item.id]));
  });
}

export function StageSatisfactionPrompt({
  projectId,
  template,
  process,
  authorName,
  authorSide,
  enabled = true,
}: {
  projectId: string;
  template: ProcessTemplate;
  process: ProjectProcess | null | undefined;
  authorName: string;
  authorSide: ReviewSide;
  enabled?: boolean;
}) {
  const stageSatisfactions = useProjectSatisfactionStore(
    (state) => state.byProject[projectId]?.stageSatisfactions ?? [],
  );
  const ensureSatisfaction = useProjectSatisfactionStore((state) => state.ensureSatisfaction);

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [dismissedStageIds, setDismissedStageIds] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void ensureSatisfaction(projectId);
  }, [enabled, ensureSatisfaction, projectId]);

  const pendingStage = useMemo(() => {
    if (!enabled || authorSide !== "client") {
      return null;
    }

    const completed = getCompletedStages(template, process);
    return (
      completed.find((stage) => {
        if (dismissedStageIds.includes(stage.id)) {
          return false;
        }
        const rated = stageSatisfactions.some(
          (entry) => entry.stageId === stage.id && entry.authorSide === authorSide && entry.score > 0,
        );
        return !rated;
      }) ?? null
    );
  }, [authorSide, dismissedStageIds, enabled, process, stageSatisfactions, template.stages]);

  useEffect(() => {
    if (pendingStage && !activeStageId) {
      setActiveStageId(pendingStage.id);
    }
  }, [activeStageId, pendingStage]);

  const activeStage = template.stages.find((stage) => stage.id === activeStageId) ?? pendingStage;

  if (!enabled || authorSide !== "client" || !activeStage) {
    return null;
  }

  return (
    <StageSatisfactionDialog
      open={Boolean(activeStageId)}
      projectId={projectId}
      stageId={activeStage.id}
      stageTitle={activeStage.title}
      authorName={authorName}
      authorSide={authorSide}
      onClose={() => {
        setDismissedStageIds((current) => [...current, activeStage.id]);
        setActiveStageId(null);
      }}
      onSaved={() => {
        setActiveStageId(null);
      }}
    />
  );
}
