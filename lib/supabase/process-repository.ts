import { buildTemplateForProjectType } from "@/lib/process/template-factory";
import type { ProcessItemCompletion, ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  projectProcessToUpdate,
  rowToProcessItem,
  rowToProcessMilestone,
  rowToProcessStage,
  rowToProcessTemplate,
  rowToProjectProcess,
} from "@/lib/supabase/process-mappers";

async function fetchTemplatesGraph(): Promise<ProcessTemplate[]> {
  const supabase = getSupabase();

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

  const itemsByMilestone = new Map<string, ReturnType<typeof rowToProcessItem>[]>();
  (items ?? []).forEach((row) => {
    const mapped = rowToProcessItem(row);
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
    const mapped = rowToProcessStage(row, milestonesByStage.get(row.id) ?? []);
    const list = stagesByTemplate.get(row.template_id) ?? [];
    list.push(mapped);
    stagesByTemplate.set(row.template_id, list);
  });

  return templates.map((row) =>
    rowToProcessTemplate(row, stagesByTemplate.get(row.id) ?? []),
  );
}

export async function fetchProcessTemplates() {
  return fetchTemplatesGraph();
}

export async function fetchProcessTemplateByProjectType(projectType: string) {
  const templates = await fetchTemplatesGraph();
  return templates.find((template) => template.projectType === projectType) ?? null;
}

async function insertTemplateGraph(template: ProcessTemplate) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

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

  for (const stage of template.stages) {
    const { error } = await supabase.from("process_stages").insert({
      id: stage.id,
      template_id: stage.templateId,
      title: stage.title,
      position: stage.position,
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
        const { error: itemsError } = await supabase.from("process_items").insert(
          milestone.items.map((item) => ({
            id: item.id,
            milestone_id: item.milestoneId,
            kind: item.kind,
            title: item.title,
            position: item.position,
          })),
        );
        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }
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
  const existing = await fetchTemplatesGraph();
  const existingTypes = new Set(existing.map((template) => template.projectType));

  for (const projectType of projectTypes) {
    if (existingTypes.has(projectType)) {
      continue;
    }

    await ensureProcessTemplateForProjectType(projectType);
    existingTypes.add(projectType);
  }

  return fetchTemplatesGraph();
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
  const payload = {
    id: crypto.randomUUID(),
    project_id: projectId,
    template_id: template.id,
    completions: {},
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

  return rowToProjectProcess(data);
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

export async function saveProcessTemplate(template: ProcessTemplate) {
  const supabase = getSupabase();

  const { error: deleteError } = await supabase
    .from("process_templates")
    .delete()
    .eq("id", template.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await insertTemplateGraph({
    ...template,
    updatedAt: new Date().toISOString(),
  });

  return fetchProcessTemplateByProjectType(template.projectType);
}
