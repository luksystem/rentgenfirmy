import {
  deriveProcessItemStatus,
  emptyChecklistPayload,
  hasChecklistLines,
  isEmptyChecklistPayload,
  normalizeChecklistPayload,
  projectChecklistPayloadFromTemplate,
  validateChecklistDocumentationRules,
} from "@/lib/process/item-payload";
import type { ChecklistItemPayload, ProcessTemplate } from "@/lib/process/types";
import { flattenProcessItems } from "@/lib/process/types";
import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  projectProcessItemAssigneeUpdate,
  projectProcessItemBlockingUpdate,
  projectProcessItemSignatureUpdate,
  projectProcessItemToUpdate,
  rowToProjectProcessItem,
} from "@/lib/supabase/process-item-mappers";
import { updateProjectProcessCompletion } from "@/lib/supabase/process-repository";
import { syncProcessItemWorkItems } from "@/lib/supabase/my-work-repository";

export async function fetchProjectProcessItem(projectId: string, templateItemId: string) {
  const row = await getProjectProcessItemRow(projectId, templateItemId);
  return rowToProjectProcessItem(row);
}

async function getProjectProcessItemRow(projectId: string, templateItemId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("template_item_id", templateItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nie znaleziono instancji elementu procesu.");
  }

  return data;
}

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

export async function backfillEmptyChecklistInstances(
  supabase: SupabaseClient,
  projectId: string,
  template: ProcessTemplate,
) {
  const existing = await fetchProjectProcessItems(projectId);
  const templateById = new Map(flattenProcessItems(template).map((item) => [item.id, item]));
  const now = new Date().toISOString();

  await Promise.all(
    existing.map(async (row) => {
      if (row.kind !== "checklist" || row.status === "completed") {
        return;
      }
      if (!isEmptyChecklistPayload(row.payload)) {
        return;
      }
      const templateItem = templateById.get(row.templateItemId);
      if (!templateItem || !hasChecklistLines(templateItem.defaultPayload)) {
        return;
      }

      const { error } = await supabase
        .from("project_process_items")
        .update({
          payload: projectChecklistPayloadFromTemplate(templateItem.defaultPayload),
          updated_at: now,
        })
        .eq("id", row.id);

      if (error) {
        throw new Error(error.message);
      }
    }),
  );
}

export async function ensureProjectProcessItems(projectId: string, template: ProcessTemplate) {
  const existing = await fetchProjectProcessItems(projectId);
  const existingIds = new Set(existing.map((item) => item.templateItemId));
  const templateItems = flattenProcessItems(template);
  const missing = templateItems.filter((item) => !existingIds.has(item.id));

  if (!missing.length) {
    await backfillEmptyChecklistInstances(getSupabase(), projectId, template);
    return fetchProjectProcessItems(projectId);
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  // `upsert` + `ignoreDuplicates` (nie `insert`) — kilka równoległych wywołań (np. otwarcie elementu
  // i jednoczesne dodanie innego) mogą policzyć te same „brakujące” pozycje; bez tego druga próba
  // wstawienia tego samego (project_id, template_item_id) kończy się konfliktem 409.
  const { error } = await supabase
    .from("project_process_items")
    .upsert(
      missing.map((item) => ({
        project_id: projectId,
        template_item_id: item.id,
        kind: item.kind,
        is_internal_acceptance: item.isInternalAcceptance ?? false,
        payload:
          item.kind === "checklist"
            ? projectChecklistPayloadFromTemplate(item.defaultPayload)
            : emptyChecklistPayload(),
        status: "open",
        created_at: now,
        updated_at: now,
      })),
      { onConflict: "project_id,template_item_id", ignoreDuplicates: true },
    );

  if (error) {
    throw new Error(error.message);
  }

  await backfillEmptyChecklistInstances(supabase, projectId, template);
  return fetchProjectProcessItems(projectId);
}

export async function saveProjectProcessItemChecklist(
  projectId: string,
  templateItemId: string,
  payload: ChecklistItemPayload,
  actorName?: string,
) {
  const normalized = normalizeChecklistPayload(payload);
  const documentationError = validateChecklistDocumentationRules(normalized);
  if (documentationError) {
    throw new Error(documentationError);
  }
  const status = deriveProcessItemStatus("checklist", normalized, "open");
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
      .update(projectProcessItemToUpdate(normalized, status))
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
        payload: normalized,
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

  void syncProcessItemWorkItems(row.id).catch(() => undefined);

  return rowToProjectProcessItem(row);
}

export async function assignProjectProcessItem(
  projectId: string,
  templateItemId: string,
  assigneeId: string | null,
  assigneeName: string | null,
) {
  const supabase = getSupabase();
  await getProjectProcessItemRow(projectId, templateItemId);

  const { data, error } = await supabase
    .from("project_process_items")
    .update(projectProcessItemAssigneeUpdate(assigneeId, assigneeName))
    .eq("project_id", projectId)
    .eq("template_item_id", templateItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  void syncProcessItemWorkItems(data.id).catch(() => undefined);

  return rowToProjectProcessItem(data);
}

export async function setProjectProcessItemBlocksNextStage(
  projectId: string,
  templateItemId: string,
  blocksNextStage: boolean,
) {
  const supabase = getSupabase();
  await getProjectProcessItemRow(projectId, templateItemId);

  const { data, error } = await supabase
    .from("project_process_items")
    .update(projectProcessItemBlockingUpdate(blocksNextStage))
    .eq("project_id", projectId)
    .eq("template_item_id", templateItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessItem(data);
}

export async function signProjectProcessItem(
  projectId: string,
  templateItemId: string,
  signer: { id: string; name: string },
  signatureNote?: string,
) {
  const supabase = getSupabase();
  const existing = await getProjectProcessItemRow(projectId, templateItemId);
  const mapped = rowToProjectProcessItem(existing);

  if (!mapped.assigneeId) {
    throw new Error("Przypisz osobę odpowiedzialną przed podpisem.");
  }

  if (mapped.assigneeId !== signer.id) {
    throw new Error("Podpisać może tylko przypisana osoba odpowiedzialna.");
  }

  if (mapped.signedAt) {
    throw new Error("Element został już podpisany.");
  }

  const { data, error } = await supabase
    .from("project_process_items")
    .update(
      projectProcessItemSignatureUpdate(
        signer.id,
        signer.name,
        signatureNote?.trim() || null,
      ),
    )
    .eq("project_id", projectId)
    .eq("template_item_id", templateItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await updateProjectProcessCompletion(projectId, templateItemId, true, signer.name);

  void syncProcessItemWorkItems(data.id).catch(() => undefined);

  return rowToProjectProcessItem(data);
}

export function mapProjectProcessItemsByTemplateId(items: Awaited<ReturnType<typeof fetchProjectProcessItems>>) {
  return Object.fromEntries(items.map((item) => [item.templateItemId, item]));
}
