import { applyInternalAcceptanceItemPatch } from "@/lib/internal-acceptance/item-history";
import { getInternalAcceptanceDocumentationBlockReason } from "@/lib/internal-acceptance/documentation";
import { computeInternalAcceptanceSummary } from "@/lib/internal-acceptance/quality-gate";
import type {
  InternalAcceptanceItemState,
  InternalAcceptanceState,
} from "@/lib/internal-acceptance/types";
import { deriveProcessItemStatus, normalizeChecklistPayload, validateChecklistDocumentationRules } from "@/lib/process/item-payload";
import type { ChecklistItemPayload } from "@/lib/process/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToProjectProcessItem } from "@/lib/supabase/process-item-mappers";
import { fetchProcessPublicAccessByToken } from "@/lib/supabase/process-public-access-repository";

async function resolvePublicInstance(token: string) {
  const supabase = getSupabaseAdmin();
  const access = await fetchProcessPublicAccessByToken(supabase, token);
  if (!access?.publicEnabled) {
    return null;
  }

  const { data, error } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("id", access.projectProcessItemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    access,
    instance: rowToProjectProcessItem(data),
    supabase,
  };
}

export async function savePublicChecklistPayload(
  token: string,
  payload: ChecklistItemPayload,
) {
  const resolved = await resolvePublicInstance(token);
  if (!resolved || resolved.instance.isInternalAcceptance) {
    throw new Error("Nie znaleziono publicznej checklisty.");
  }

  const normalized = normalizeChecklistPayload(payload);
  const documentationError = validateChecklistDocumentationRules(normalized);
  if (documentationError) {
    throw new Error(documentationError);
  }
  const status = deriveProcessItemStatus("checklist", normalized, resolved.instance.status);
  const now = new Date().toISOString();

  const { data, error } = await resolved.supabase
    .from("project_process_items")
    .update({
      payload: normalized,
      status,
      updated_at: now,
    })
    .eq("id", resolved.instance.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessItem(data);
}

export async function savePublicInternalAcceptanceItemPatch(
  token: string,
  itemKey: string,
  patch: Partial<InternalAcceptanceItemState>,
  actor: { id?: string; name: string },
) {
  const resolved = await resolvePublicInstance(token);
  if (!resolved || !resolved.instance.isInternalAcceptance) {
    throw new Error("Nie znaleziono publicznej tablicy odbioru.");
  }

  const current = resolved.instance.internalAcceptanceState;
  if (!current) {
    throw new Error("Brak wygenerowanej checklisty odbioru.");
  }

  const resolvedActor = {
    id: actor.id,
    name: actor.name?.trim() || resolved.access.publicAuthorName?.trim() || "Gość",
  };

  const items = current.items.map((item) => {
    if (item.itemKey !== itemKey) {
      return item;
    }
    const nextItem = applyInternalAcceptanceItemPatch(item, patch, resolvedActor);
    if (nextItem.status === "PASSED") {
      const reason = getInternalAcceptanceDocumentationBlockReason(nextItem);
      if (reason) {
        throw new Error(reason);
      }
    }
    return nextItem;
  });

  const nextState: InternalAcceptanceState = {
    ...current,
    items,
    summary: computeInternalAcceptanceSummary(items),
  };

  const now = new Date().toISOString();
  const { data, error } = await resolved.supabase
    .from("project_process_items")
    .update({
      internal_acceptance_state: nextState,
      updated_at: now,
    })
    .eq("id", resolved.instance.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessItem(data);
}
