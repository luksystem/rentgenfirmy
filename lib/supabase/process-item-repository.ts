import {
  deriveProcessItemStatus,
  emptyChecklistPayload,
  hasChecklistLines,
  isEmptyChecklistPayload,
  mergeChecklistPayloadWithTemplate,
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
import { fetchProcessElements } from "@/lib/supabase/process-element-repository";
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

/**
 * Dociąga puste instancje checklist z szablonu, a dla już wypełnionych aktualizuje treść
 * pytań/list do aktualnej wersji elementu w katalogu (nie do zamrożonego `template_snapshot`
 * projektu — ten służy tylko do zakotwiczenia struktury etapów), zachowując zaznaczenia klienta.
 * Pomija elementy już zakończone (status "completed") — te zostają nienaruszone.
 */
export async function syncChecklistInstancesFromTemplate(
  supabase: SupabaseClient,
  projectId: string,
  template: ProcessTemplate,
) {
  const [existing, elements] = await Promise.all([
    fetchProjectProcessItems(projectId),
    fetchProcessElements(),
  ]);
  const templateById = new Map(flattenProcessItems(template).map((item) => [item.id, item]));
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const now = new Date().toISOString();

  await Promise.all(
    existing.map(async (row) => {
      if (row.kind !== "checklist" || row.status === "completed") {
        return;
      }
      const templateItem = templateById.get(row.templateItemId);
      if (!templateItem) {
        return;
      }
      const sourcePayload = elementById.get(templateItem.elementId)?.defaultPayload ?? templateItem.defaultPayload;
      if (!hasChecklistLines(sourcePayload)) {
        return;
      }

      const { error } = await supabase
        .from("project_process_items")
        .update({
          payload: mergeChecklistPayloadWithTemplate(row.payload, sourcePayload),
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
    await syncChecklistInstancesFromTemplate(getSupabase(), projectId, template);
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

  await syncChecklistInstancesFromTemplate(supabase, projectId, template);
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

/**
 * Elementy projektu, których `templateItemId` nie występuje już w bieżącym szablonie —
 * powstają, gdy element zostanie usunięty z jednego miejsca i dodany od nowa gdzie indziej
 * w edytorze szablonu (nowy `id`), przez co stary wiersz (z danymi klienta/tablicy kanban)
 * traci powiązanie z etapem i staje się niewidoczny w pipeline.
 */
export async function fetchOrphanedProjectProcessItems(
  supabase: SupabaseClient,
  projectId: string,
  template: ProcessTemplate,
) {
  const templateItemIds = new Set(flattenProcessItems(template).map((item) => item.id));
  const { data, error } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToProjectProcessItem).filter((item) => !templateItemIds.has(item.templateItemId));
}

async function isProjectProcessItemRowEmpty(
  supabase: SupabaseClient,
  row: { id: string; kind: string; payload: unknown; status: string; signedAt?: string | null },
) {
  if (row.kind === "checklist") {
    return isEmptyChecklistPayload(row.payload);
  }
  if (row.kind === "kanban") {
    const { data: board } = await supabase
      .from("process_kanban_boards")
      .select("id")
      .eq("project_process_item_id", row.id)
      .maybeSingle();
    if (!board) {
      return true;
    }
    const { data: columns } = await supabase
      .from("process_kanban_columns")
      .select("id")
      .eq("board_id", board.id);
    const columnIds = (columns ?? []).map((column) => column.id as string);
    if (!columnIds.length) {
      return true;
    }
    const { count } = await supabase
      .from("process_kanban_tasks")
      .select("id", { count: "exact", head: true })
      .in("column_id", columnIds);
    return !count;
  }
  return row.status !== "completed" && !row.signedAt;
}

/**
 * Przepina istniejący wiersz (z zachowanymi danymi — checklistą/tablicą kanban) na nowe miejsce
 * w szablonie, bez ruszania samych danych: `process_kanban_boards` jest powiązana z
 * `project_process_items.id` (stały identyfikator wiersza), a nie z `template_item_id`, więc
 * wystarczy zmienić samo dopasowanie do szablonu. Docelowy wiersz (pusty placeholder utworzony
 * automatycznie przy synchronizacji z szablonem) zostaje usunięty, żeby zwolnić unikalność
 * `(project_id, template_item_id)`.
 */
export async function reassignProjectProcessItemToTemplateItem(
  supabase: SupabaseClient,
  projectId: string,
  orphanItemId: string,
  targetTemplateItemId: string,
) {
  const { data: orphanRow, error: orphanError } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("id", orphanItemId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (orphanError) {
    throw new Error(orphanError.message);
  }
  if (!orphanRow) {
    throw new Error("Nie znaleziono elementu do naprawy.");
  }

  const { data: targetRow, error: targetError } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("template_item_id", targetTemplateItemId)
    .maybeSingle();

  if (targetError) {
    throw new Error(targetError.message);
  }

  if (targetRow) {
    if (targetRow.kind !== orphanRow.kind) {
      throw new Error("Element docelowy jest innego typu — wybierz element tego samego rodzaju.");
    }
    const targetIsEmpty = await isProjectProcessItemRowEmpty(supabase, {
      id: targetRow.id,
      kind: targetRow.kind,
      payload: targetRow.payload,
      status: targetRow.status,
      signedAt: targetRow.signed_at,
    });
    if (!targetIsEmpty) {
      throw new Error("Element docelowy nie jest pusty — wybierz inny lub najpierw go wyczyść.");
    }

    const { error: deleteError } = await supabase
      .from("project_process_items")
      .delete()
      .eq("id", targetRow.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("project_process_items")
    .update({ template_item_id: targetTemplateItemId, updated_at: new Date().toISOString() })
    .eq("id", orphanRow.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return rowToProjectProcessItem(updated);
}
