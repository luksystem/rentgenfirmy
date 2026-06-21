import type { ProcessElement, ProcessTemplate } from "@/lib/process/types";
import { rowToProcessElement } from "@/lib/supabase/process-element-mappers";
import {
  rowToProcessItem,
  rowToProcessMilestone,
  rowToProcessStage,
  rowToProcessTemplate,
} from "@/lib/supabase/process-mappers";
import { getSupabaseServer } from "@/lib/supabase/server";

async function fetchProcessElementsServer(): Promise<ProcessElement[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("process_elements")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProcessElement);
}

async function fetchTemplatesGraphServer(): Promise<ProcessTemplate[]> {
  const supabase = getSupabaseServer();

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

  const elements = await fetchProcessElementsServer();
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
    const mapped = rowToProcessStage(row, milestonesByStage.get(row.id) ?? []);
    const list = stagesByTemplate.get(row.template_id) ?? [];
    list.push(mapped);
    stagesByTemplate.set(row.template_id, list);
  });

  return templates.map((row) =>
    rowToProcessTemplate(row, stagesByTemplate.get(row.id) ?? []),
  );
}

export async function fetchProcessTemplateByProjectTypeServer(projectType: string) {
  const templates = await fetchTemplatesGraphServer();
  return templates.find((template) => template.projectType === projectType) ?? null;
}
