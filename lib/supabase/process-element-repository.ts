import { templatePayloadFromTitle } from "@/lib/process/item-payload";
import type { ProcessElementPayload, ProcessElement, ProcessItemKind } from "@/lib/process/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  processElementToInsert,
  processElementToUpdate,
  rowToProcessElement,
} from "@/lib/supabase/process-element-mappers";

export async function fetchProcessElements() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_elements")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProcessElement);
}

export type ProcessElementPlacement = {
  processItemId: string;
  itemTitle: string;
  milestoneTitle: string;
  stageTitle: string;
  projectType: string;
  templateName: string;
};

export async function fetchProcessElementPlacements(elementId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_items")
    .select(
      "id, title, process_milestones(title, process_stages(title, process_templates(project_type, name)))",
    )
    .eq("element_id", elementId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const milestone = row.process_milestones as {
      title?: string;
      process_stages?: {
        title?: string;
        process_templates?: { project_type?: string; name?: string };
      };
    } | null;
    const stage = milestone?.process_stages;
    const template = stage?.process_templates;
    return {
      processItemId: row.id,
      itemTitle: row.title,
      milestoneTitle: milestone?.title ?? "—",
      stageTitle: stage?.title ?? "—",
      projectType: template?.project_type ?? "—",
      templateName: template?.name ?? "—",
    } satisfies ProcessElementPlacement;
  });
}

export async function fetchProcessElementById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_elements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToProcessElement(data) : null;
}

export async function saveProcessElement(element: ProcessElement) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_elements")
    .update(processElementToUpdate(element))
    .eq("id", element.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProcessElement(data);
}

export async function createProcessElement(input: {
  kind: ProcessItemKind;
  title: string;
  description?: string;
  defaultPayload?: ProcessElementPayload;
}) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const title = input.title.trim();
  if (!title) {
    throw new Error("Nazwa elementu procesu jest wymagana.");
  }

  const element: ProcessElement = {
    id: crypto.randomUUID(),
    kind: input.kind,
    title,
    description: input.description?.trim() ?? "",
    defaultPayload: input.defaultPayload ?? templatePayloadFromTitle(title, input.kind),
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from("process_elements")
    .insert(processElementToInsert(element))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProcessElement(data);
}

export async function deleteProcessElement(id: string) {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("process_items")
    .select("id", { count: "exact", head: true })
    .eq("element_id", id);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    const placements = await fetchProcessElementPlacements(id);
    const summary = placements
      .map(
        (placement) =>
          `${placement.projectType} → ${placement.stageTitle} → ${placement.milestoneTitle}`,
      )
      .join("; ");
    throw new Error(
      summary
        ? `Nie można usunąć elementu używanego w szablonie procesu: ${summary}.`
        : "Nie można usunąć elementu używanego w szablonie procesu.",
    );
  }

  const { error } = await supabase.from("process_elements").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function findOrCreateProcessElement(input: {
  kind: ProcessItemKind;
  title: string;
  defaultPayload: ProcessElementPayload;
}) {
  const supabase = getSupabase();
  const title = input.title.trim();
  const { data: existing, error: existingError } = await supabase
    .from("process_elements")
    .select("*")
    .eq("kind", input.kind)
    .eq("title", title)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return rowToProcessElement(existing);
  }

  return createProcessElement({
    kind: input.kind,
    title,
    defaultPayload: input.defaultPayload,
  });
}
