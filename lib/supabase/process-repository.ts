import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTemplateForProjectType } from "@/lib/process/template-factory";
import {
  cloneProcessTemplate,
  collectTemplateItemIds,
  collectTemplateMilestoneIds,
} from "@/lib/process/anchored-template";
import type {
  ProcessItem,
  ProcessItemCompletion,
  ProcessItemKind,
  ProcessTemplate,
  ProjectProcess,
} from "@/lib/process/types";
import { getSupabase } from "@/lib/supabase/client";
import { ensureProjectProcessItems } from "@/lib/supabase/process-item-repository";
import {
  projectProcessToUpdate,
  rowToProcessItem,
  rowToProcessMilestone,
  rowToProcessStage,
  rowToProcessTemplate,
  rowToProjectProcess,
} from "@/lib/supabase/process-mappers";
import { rowToProcessElement } from "@/lib/supabase/process-element-mappers";

type DbClient = SupabaseClient;

async function fetchProcessElementsWithClient(supabase: DbClient) {
  const { data, error } = await supabase
    .from("process_elements")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProcessElement);
}

export async function fetchTemplatesGraphWithClient(
  supabase: DbClient = getSupabase(),
): Promise<ProcessTemplate[]> {

  const { data: templates, error: templatesError } = await supabase
    .from("process_templates")
    .select("*")
    .order("project_type", { ascending: true });

  if (templatesError) {
    throw new Error(templatesError.message);
  }

  if (!templates?.length) {
    return [];
  }

  const templateIds = templates.map((row) => row.id);

  const { data: stages, error: stagesError } = await supabase
    .from("process_stages")
    .select("*")
    .in("template_id", templateIds)
    .order("position", { ascending: true });

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  const stageIds = (stages ?? []).map((row) => row.id);

  const [roleReqResult, competencyReqResult, dependencyResult] = stageIds.length
    ? await Promise.all([
        supabase.from("process_stage_role_requirements").select("*").in("stage_id", stageIds),
        supabase.from("process_stage_competency_requirements").select("*").in("stage_id", stageIds),
        supabase.from("process_stage_dependencies").select("*").in("stage_id", stageIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

  if (roleReqResult.error) throw new Error(roleReqResult.error.message);
  if (competencyReqResult.error) throw new Error(competencyReqResult.error.message);
  if (dependencyResult.error) throw new Error(dependencyResult.error.message);

  const roleReqByStage = new Map<string, typeof roleReqResult.data>();
  (roleReqResult.data ?? []).forEach((row) => {
    const list = roleReqByStage.get(row.stage_id) ?? [];
    list.push(row);
    roleReqByStage.set(row.stage_id, list);
  });

  const competencyReqByStage = new Map<string, typeof competencyReqResult.data>();
  (competencyReqResult.data ?? []).forEach((row) => {
    const list = competencyReqByStage.get(row.stage_id) ?? [];
    list.push(row);
    competencyReqByStage.set(row.stage_id, list);
  });

  const dependencyByStage = new Map<string, typeof dependencyResult.data>();
  (dependencyResult.data ?? []).forEach((row) => {
    const list = dependencyByStage.get(row.stage_id) ?? [];
    list.push(row);
    dependencyByStage.set(row.stage_id, list);
  });

  const { data: milestones, error: milestonesError } = stageIds.length
    ? await supabase
        .from("process_milestones")
        .select("*")
        .in("stage_id", stageIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (milestonesError) {
    throw new Error(milestonesError.message);
  }

  const milestoneIds = (milestones ?? []).map((row) => row.id);

  const { data: items, error: itemsError } = milestoneIds.length
    ? await supabase
        .from("process_items")
        .select("*")
        .in("milestone_id", milestoneIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const elements = await fetchProcessElementsWithClient(supabase);
  const elementsById = new Map(elements.map((element) => [element.id, element]));

  const itemsByMilestone = new Map<string, ReturnType<typeof rowToProcessItem>[]>();
  (items ?? []).forEach((row) => {
    const mapped = rowToProcessItem(row, elementsById);
    const list = itemsByMilestone.get(row.milestone_id) ?? [];
    list.push(mapped);
    itemsByMilestone.set(row.milestone_id, list);
  });

  const milestonesByStage = new Map<string, ReturnType<typeof rowToProcessMilestone>[]>();
  (milestones ?? []).forEach((row) => {
    const mapped = rowToProcessMilestone(row, itemsByMilestone.get(row.id) ?? []);
    const list = milestonesByStage.get(row.stage_id) ?? [];
    list.push(mapped);
    milestonesByStage.set(row.stage_id, list);
  });

  const stagesByTemplate = new Map<string, ReturnType<typeof rowToProcessStage>[]>();
  (stages ?? []).forEach((row) => {
    const mapped = rowToProcessStage(row, milestonesByStage.get(row.id) ?? [], {
      roles: roleReqByStage.get(row.id) ?? [],
      competencies: competencyReqByStage.get(row.id) ?? [],
      dependencies: dependencyByStage.get(row.id) ?? [],
    });
    const list = stagesByTemplate.get(row.template_id) ?? [];
    list.push(mapped);
    stagesByTemplate.set(row.template_id, list);
  });

  return templates.map((row) =>
    rowToProcessTemplate(row, stagesByTemplate.get(row.id) ?? []),
  );
}

export async function fetchProcessTemplates() {
  return fetchTemplatesGraphWithClient();
}

export async function fetchProcessTemplateByProjectType(projectType: string) {
  const templates = await fetchTemplatesGraphWithClient();
  return templates.find((template) => template.projectType === projectType) ?? null;
}

export async function fetchProcessTemplateByProjectTypeWithClient(
  supabase: DbClient,
  projectType: string,
) {
  const templates = await fetchTemplatesGraphWithClient(supabase);
  return templates.find((template) => template.projectType === projectType) ?? null;
}

async function insertTemplateGraph(template: ProcessTemplate, options?: { includeTemplate?: boolean }) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const includeTemplate = options?.includeTemplate ?? true;

  if (includeTemplate) {
    const { error: templateError } = await supabase.from("process_templates").insert({
      id: template.id,
      project_type: template.projectType,
      name: template.name,
      description: template.description,
      created_at: now,
      updated_at: now,
    });

    if (templateError) {
      throw new Error(templateError.message);
    }
  }

  await insertTemplateStagesGraph(template);
}

async function resolvePlacementElementId(
  item: ProcessTemplate["stages"][number]["milestones"][number]["items"][number],
) {
  if (item.elementId) {
    return item.elementId;
  }

  const { findOrCreateProcessElement } = await import(
    "@/lib/supabase/process-element-repository"
  );
  const element = await findOrCreateProcessElement({
    kind: item.kind,
    title: item.title,
    defaultPayload: item.defaultPayload,
  });
  return element.id;
}

async function insertTemplateStagesGraph(template: ProcessTemplate) {
  const supabase = getSupabase();

  for (const stage of template.stages) {
    const { error } = await supabase.from("process_stages").insert({
      id: stage.id,
      template_id: stage.templateId,
      title: stage.title,
      description: stage.description ?? "",
      for_closing: stage.forClosing ?? false,
      position: stage.position,
      min_people_count: stage.minPeopleCount ?? 1,
      optimal_people_count: stage.optimalPeopleCount ?? null,
      estimated_duration_days: stage.estimatedDurationDays ?? null,
      estimated_labor_hours: stage.estimatedLaborHours ?? null,
      default_labor_budget: stage.defaultLaborBudget ?? null,
      default_material_budget: stage.defaultMaterialBudget ?? null,
      default_risk_item_id: stage.defaultRiskItemId ?? null,
      can_run_in_parallel: stage.canRunInParallel ?? false,
      requires_leader: stage.requiresLeader ?? false,
      allows_trainee: stage.allowsTrainee ?? true,
    });
    if (error) {
      throw new Error(error.message);
    }

    for (const milestone of stage.milestones) {
      const { error: milestoneError } = await supabase.from("process_milestones").insert({
        id: milestone.id,
        stage_id: milestone.stageId,
        title: milestone.title,
        position: milestone.position,
      });
      if (milestoneError) {
        throw new Error(milestoneError.message);
      }

      if (milestone.items.length) {
        const placements = await Promise.all(
          milestone.items.map(async (item) => ({
            id: item.id,
            milestone_id: item.milestoneId,
            element_id: await resolvePlacementElementId(item),
            kind: item.kind,
            title: item.title,
            position: item.position,
            default_payload: item.defaultPayload,
            is_internal_acceptance: item.isInternalAcceptance ?? false,
          })),
        );

        const { error: itemsError } = await supabase.from("process_items").insert(placements);
        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }
    }
  }

  // Drugi przebieg — wymagania i zależności wstawiamy po utworzeniu WSZYSTKICH etapów,
  // bo zależność może wskazywać na etap dalszy w kolejności wstawiania.
  for (const stage of template.stages) {
    if (stage.requiredRoles?.length) {
      const { error: rolesError } = await supabase.from("process_stage_role_requirements").insert(
        stage.requiredRoles.map((requirement) => ({
          stage_id: stage.id,
          role_item_id: requirement.roleItemId,
          min_count: requirement.minCount,
        })),
      );
      if (rolesError) throw new Error(rolesError.message);
    }

    if (stage.requiredCompetencies?.length) {
      const { error: competenciesError } = await supabase.from("process_stage_competency_requirements").insert(
        stage.requiredCompetencies.map((requirement) => ({
          stage_id: stage.id,
          competency_item_id: requirement.competencyItemId,
          min_level_item_id: requirement.minLevelItemId,
        })),
      );
      if (competenciesError) throw new Error(competenciesError.message);
    }

    if (stage.dependsOnStageIds?.length) {
      const { error: dependenciesError } = await supabase.from("process_stage_dependencies").insert(
        stage.dependsOnStageIds.map((dependsOnStageId) => ({
          stage_id: stage.id,
          depends_on_stage_id: dependsOnStageId,
        })),
      );
      if (dependenciesError) throw new Error(dependenciesError.message);
    }
  }
}

export async function ensureProcessTemplateForProjectType(projectType: string) {
  const existing = await fetchProcessTemplateByProjectType(projectType);
  if (existing) {
    return existing;
  }

  const template = buildTemplateForProjectType(projectType);
  await insertTemplateGraph(template);
  return fetchProcessTemplateByProjectType(projectType);
}

export async function ensureDefaultProcessTemplates(projectTypes: string[]) {
  const existing = await fetchTemplatesGraphWithClient();
  const existingTypes = new Set(existing.map((template) => template.projectType));

  for (const projectType of projectTypes) {
    if (existingTypes.has(projectType)) {
      continue;
    }

    await ensureProcessTemplateForProjectType(projectType);
    existingTypes.add(projectType);
  }

  return fetchTemplatesGraphWithClient();
}

export async function fetchProjectProcess(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToProjectProcess(data) : null;
}

export async function fetchProjectProcesses() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("project_processes").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProjectProcess);
}

export async function getOrCreateProjectProcess(projectId: string, projectType: string) {
  const existing = await fetchProjectProcess(projectId);
  if (existing) {
    return existing;
  }

  const template = await ensureProcessTemplateForProjectType(projectType);

  if (!template) {
    throw new Error(`Brak szablonu procesu dla typu projektu „${projectType}”.`);
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const snapshot = cloneProcessTemplate(template);
  const payload = {
    id: crypto.randomUUID(),
    project_id: projectId,
    template_id: template.id,
    template_snapshot: snapshot,
    completions: {},
    milestone_dates: {},
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("project_processes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = rowToProjectProcess(data);
  await ensureProjectProcessItems(projectId, snapshot);
  return created;
}

export async function updateProjectProcessCompletion(
  projectId: string,
  itemId: string,
  completed: boolean,
  completedBy?: string,
) {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }

  const completions = { ...process.completions };
  if (completed) {
    completions[itemId] = {
      completedAt: new Date().toISOString(),
      completedBy,
    } satisfies ProcessItemCompletion;
  } else {
    delete completions[itemId];
  }

  const updated: ProjectProcess = {
    ...process,
    completions,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcess(data);
}

/**
 * Dodaje nowy element (np. notatkę/dokument) do struktury procesu WYŁĄCZNIE dla tego projektu —
 * mutuje `template_snapshot`, nie dotyka globalnego szablonu innych projektów tego typu.
 */
export async function addProjectProcessSnapshotItem(
  projectId: string,
  milestoneId: string,
  input: { title: string; kind: ProcessItemKind },
): Promise<{ process: ProjectProcess; item: ProcessItem }> {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }
  if (!process.templateSnapshot) {
    throw new Error("Proces projektu nie ma jeszcze zakotwiczonej struktury.");
  }

  const snapshot = cloneProcessTemplate(process.templateSnapshot);
  const milestone = snapshot.stages
    .flatMap((stage) => stage.milestones)
    .find((entry) => entry.id === milestoneId);

  if (!milestone) {
    throw new Error("Nie znaleziono kamienia milowego w strukturze procesu.");
  }

  const newItem: ProcessItem = {
    id: crypto.randomUUID(),
    milestoneId,
    elementId: "",
    kind: input.kind,
    title: input.title.trim() || "Nowy element",
    position: milestone.items.length,
    defaultPayload: { sections: [] },
    isInternalAcceptance: false,
  };
  milestone.items.push(newItem);

  const updated: ProjectProcess = {
    ...process,
    templateSnapshot: snapshot,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await ensureProjectProcessItems(projectId, snapshot);

  return { process: rowToProjectProcess(data), item: newItem };
}

/** Usuwa element dodany doraźnie do projektu (mutacja `template_snapshot`, jak wyżej). */
export async function removeProjectProcessSnapshotItem(
  projectId: string,
  itemId: string,
): Promise<ProjectProcess> {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }
  if (!process.templateSnapshot) {
    throw new Error("Proces projektu nie ma jeszcze zakotwiczonej struktury.");
  }

  const snapshot = cloneProcessTemplate(process.templateSnapshot);
  let removed = false;
  for (const stage of snapshot.stages) {
    for (const milestone of stage.milestones) {
      const index = milestone.items.findIndex((entry) => entry.id === itemId);
      if (index !== -1) {
        milestone.items.splice(index, 1);
        milestone.items.forEach((entry, position) => {
          entry.position = position;
        });
        removed = true;
      }
    }
  }

  if (!removed) {
    throw new Error("Nie znaleziono elementu procesu do usunięcia.");
  }

  const completions = { ...process.completions };
  delete completions[itemId];

  const updated: ProjectProcess = {
    ...process,
    templateSnapshot: snapshot,
    completions,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("project_process_items")
    .delete()
    .eq("project_id", projectId)
    .eq("template_item_id", itemId);

  return rowToProjectProcess(data);
}

export async function updateProjectProcessMilestoneDate(
  projectId: string,
  milestoneId: string,
  plannedDate: string | null,
) {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }

  const milestoneDates = { ...process.milestoneDates, [milestoneId]: plannedDate };
  const updated: ProjectProcess = {
    ...process,
    milestoneDates,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcess(data);
}

export async function updateProjectProcessActiveStage(
  projectId: string,
  stageId: string | null,
) {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }

  const updated: ProjectProcess = {
    ...process,
    activeStageId: stageId,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcess(data);
}

export async function ensureAnchoredTemplateSnapshot(
  projectId: string,
  liveTemplate: ProcessTemplate,
) {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }

  if (process.templateSnapshot) {
    return process;
  }

  const now = new Date().toISOString();
  const updated: ProjectProcess = {
    ...process,
    templateId: liveTemplate.id,
    templateSnapshot: cloneProcessTemplate(liveTemplate),
    updatedAt: now,
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const saved = rowToProjectProcess(data);
  await ensureProjectProcessItems(projectId, saved.templateSnapshot ?? liveTemplate);
  return saved;
}

export async function syncProjectProcessFromTemplate(
  projectId: string,
  liveTemplate: ProcessTemplate,
) {
  const process = await fetchProjectProcess(projectId);
  if (!process) {
    throw new Error("Nie znaleziono procesu projektu.");
  }

  const snapshot = cloneProcessTemplate(liveTemplate);
  const itemIds = collectTemplateItemIds(snapshot);
  const milestoneIds = collectTemplateMilestoneIds(snapshot);
  const now = new Date().toISOString();

  const completions = Object.fromEntries(
    Object.entries(process.completions).filter(([itemId]) => itemIds.has(itemId)),
  ) as Record<string, ProcessItemCompletion>;

  const milestoneDates = Object.fromEntries(
    Object.entries(process.milestoneDates).filter(([milestoneId]) =>
      milestoneIds.has(milestoneId),
    ),
  ) as Record<string, string | null>;

  const updated: ProjectProcess = {
    ...process,
    templateId: liveTemplate.id,
    templateSnapshot: snapshot,
    completions,
    milestoneDates,
    updatedAt: now,
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const saved = rowToProjectProcess(data);
  await ensureProjectProcessItems(projectId, snapshot);
  return saved;
}

export async function saveProcessTemplate(template: ProcessTemplate) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("process_templates")
    .update({
      name: template.name,
      description: template.description,
      updated_at: now,
    })
    .eq("id", template.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteStagesError } = await supabase
    .from("process_stages")
    .delete()
    .eq("template_id", template.id);

  if (deleteStagesError) {
    throw new Error(deleteStagesError.message);
  }

  await insertTemplateStagesGraph({
    ...template,
    updatedAt: now,
  });

  return fetchProcessTemplateByProjectType(template.projectType);
}
