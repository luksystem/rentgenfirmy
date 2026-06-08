import {
  deriveProcessItemStatus,
  emptyChecklistPayload,
} from "@/lib/process/item-payload";
import type { ChecklistItemPayload, ProcessTemplate } from "@/lib/process/types";
import { flattenProcessItems } from "@/lib/process/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  projectProcessItemToUpdate,
  rowToProjectProcessItem,
} from "@/lib/supabase/process-item-mappers";
import { updateProjectProcessCompletion } from "@/lib/supabase/process-repository";

export async function fetchProjectProcessItems(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProjectProcessItem);
}

export async function ensureProjectProcessItems(projectId: string, template: ProcessTemplate) {
  const existing = await fetchProjectProcessItems(projectId);
  const existingIds = new Set(existing.map((item) => item.templateItemId));
  const templateItems = flattenProcessItems(template);
  const missing = templateItems.filter((item) => !existingIds.has(item.id));

  if (!missing.length) {
    return existing;
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase.from("project_process_items").insert(
    missing.map((item) => ({
      project_id: projectId,
      template_item_id: item.id,
      kind: item.kind,
      payload: item.kind === "checklist" ? emptyChecklistPayload() : {},
      status: "open",
      created_at: now,
      updated_at: now,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }

  return fetchProjectProcessItems(projectId);
}

export async function saveProjectProcessItemChecklist(
  projectId: string,
  templateItemId: string,
  payload: ChecklistItemPayload,
  actorName?: string,
) {
  const status = deriveProcessItemStatus("checklist", payload, "open");
  const supabase = getSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("template_item_id", templateItemId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let row;
  if (existing) {
    const { data, error } = await supabase
      .from("project_process_items")
      .update(projectProcessItemToUpdate(payload, status))
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }
    row = data;
  } else {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("project_process_items")
      .insert({
        project_id: projectId,
        template_item_id: templateItemId,
        kind: "checklist",
        payload,
        status,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }
    row = data;
  }

  await updateProjectProcessCompletion(
    projectId,
    templateItemId,
    status === "completed",
    actorName,
  );

  return rowToProjectProcessItem(row);
}

export function mapProjectProcessItemsByTemplateId(items: Awaited<ReturnType<typeof fetchProjectProcessItems>>) {
  return Object.fromEntries(items.map((item) => [item.templateItemId, item]));
}
