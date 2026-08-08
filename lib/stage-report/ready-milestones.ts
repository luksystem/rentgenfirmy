import type { ProcessTemplate } from "@/lib/process/types";

export type ReadyMilestone = { stageId: string; stageTitle: string; milestoneId: string; milestoneTitle: string };

/** Kamień milowy gotowy do wygenerowania raportu etapowego: wszystkie elementy ukończone, raport
 *  jeszcze nie istnieje. Współdzielone przez panel "Raporty etapowe" i widok procesu — jedno
 *  miejsce liczenia gotowości, żeby te dwa widoki nie mogły się z czasem rozjechać. */
export function findReadyMilestones(
  template: ProcessTemplate,
  completions: Record<string, { completedAt: string } | undefined>,
  existingMilestoneIds: Set<string>,
): ReadyMilestone[] {
  const ready: ReadyMilestone[] = [];
  for (const stage of template.stages) {
    for (const milestone of stage.milestones) {
      if (milestone.items.length === 0) continue;
      if (existingMilestoneIds.has(milestone.id)) continue;
      const allDone = milestone.items.every((item) => completions[item.id]?.completedAt);
      if (allDone) {
        ready.push({
          stageId: stage.id,
          stageTitle: stage.title,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
        });
      }
    }
  }
  return ready;
}
