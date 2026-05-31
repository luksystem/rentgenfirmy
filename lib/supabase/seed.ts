import { mockInterruptions, mockProjects } from "@/lib/mock-data";
import { getSupabase } from "@/lib/supabase/client";
import { interruptionToInsert, projectToInsert } from "@/lib/supabase/mappers";
import { clearAllData } from "@/lib/supabase/repository";

export async function seedDemoData() {
  await clearAllData();

  const supabase = getSupabase();
  const projectRows = mockProjects.map((project) =>
    projectToInsert({
      name: project.name,
      isActive: project.isActive,
      type: project.type,
      flowStatus: project.flowStatus,
      stage: project.stage,
      priority: project.priority,
      nextStepOwner: project.nextStepOwner,
      nextContactDate: project.nextContactDate,
      blockerReason: project.blockerReason,
      notes: project.notes,
      lastChangedBy: project.lastChangedBy,
      lastChangedAt: project.lastChangedAt,
      lastContactDate: project.lastContactDate,
      closeBlocker: project.closeBlocker,
      remainingHours: project.remainingHours,
      nextAction: project.nextAction,
      closeDeadline: project.closeDeadline,
      waitingDependsOnUs: project.waitingDependsOnUs,
      waitingIncreasesCostLater: project.waitingIncreasesCostLater,
      waitingBlocksSettlement: project.waitingBlocksSettlement,
    }),
  );

  const { data: insertedProjects, error: projectsError } = await supabase
    .from("projects")
    .insert(projectRows)
    .select("id");

  if (projectsError || !insertedProjects) {
    throw new Error(projectsError?.message ?? "Nie udało się wstawić projektów demo");
  }

  const idMap = new Map(
    mockProjects.map((project, index) => [project.id, insertedProjects[index].id]),
  );

  const interruptionRows = mockInterruptions.map((interruption) =>
    interruptionToInsert({
      ...interruption,
      projectId: idMap.get(interruption.projectId)!,
    }),
  );

  const { error: interruptionsError } = await supabase
    .from("interruptions")
    .insert(interruptionRows);

  if (interruptionsError) {
    throw new Error(interruptionsError.message);
  }
}
