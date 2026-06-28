import { buildInternalAcceptanceState } from "@/lib/internal-acceptance/generator";
import { computeInternalAcceptanceSummary } from "@/lib/internal-acceptance/quality-gate";
import type {
  InternalAcceptanceItemState,
  InternalAcceptanceState,
} from "@/lib/internal-acceptance/types";
import { fetchInternalAcceptanceTemplateConfigOrDefault } from "@/lib/supabase/internal-acceptance-config-repository";
import { getSupabase } from "@/lib/supabase/client";
import { fetchProjectAgreements } from "@/lib/supabase/project-agreement-repository";
import { fetchProjectSpecificationItems } from "@/lib/supabase/project-specification-repository";
import { rowToProjectProcessItem } from "@/lib/supabase/process-item-mappers";

export async function loadInternalAcceptanceGenerationInput(
  projectId: string,
  templateItemId: string,
) {
  const [specificationItems, agreements, templateConfig] = await Promise.all([
    fetchProjectSpecificationItems(projectId),
    fetchProjectAgreements(projectId),
    fetchInternalAcceptanceTemplateConfigOrDefault(templateItemId),
  ]);

  return {
    specificationItems: specificationItems.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
    })),
    agreements: agreements
      .filter((item) => item.status === "accepted" || item.status === "pending_client")
      .map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        body: item.body,
      })),
    templateConfig,
  };
}

export async function ensureInternalAcceptanceState(
  projectId: string,
  templateItemId: string,
): Promise<InternalAcceptanceState> {
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

  const instance = rowToProjectProcessItem(data);
  const input = await loadInternalAcceptanceGenerationInput(projectId, templateItemId);
  const state = buildInternalAcceptanceState(input, instance.internalAcceptanceState);

  const { error: updateError } = await supabase
    .from("project_process_items")
    .update({
      internal_acceptance_state: state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", instance.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return state;
}

export async function saveInternalAcceptanceState(
  projectId: string,
  templateItemId: string,
  state: InternalAcceptanceState,
) {
  const supabase = getSupabase();
  const summary = computeInternalAcceptanceSummary(state.items);
  const nextState: InternalAcceptanceState = { ...state, summary };

  const { data, error } = await supabase
    .from("project_process_items")
    .update({
      internal_acceptance_state: nextState,
      status: summary.readyForClientHandover ? "completed" : summary.percentComplete > 0 ? "in_progress" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("template_item_id", templateItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToProjectProcessItem(data);
}

export async function updateInternalAcceptanceItem(
  projectId: string,
  templateItemId: string,
  itemKey: string,
  patch: Partial<InternalAcceptanceItemState>,
) {
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

  const instance = rowToProjectProcessItem(data);
  const current = instance.internalAcceptanceState;
  if (!current) {
    throw new Error("Brak wygenerowanej checklisty odbioru.");
  }

  const items = current.items.map((item) => {
    if (item.itemKey !== itemKey) {
      return item;
    }
    const nextStatus = patch.status ?? item.status;
    return {
      ...item,
      ...patch,
      status: nextStatus,
      completedAt:
        patch.completedAt ??
        (nextStatus === "PASSED" || nextStatus === "NOT_APPLICABLE"
          ? new Date().toISOString()
          : item.completedAt),
    };
  });

  return saveInternalAcceptanceState(projectId, templateItemId, {
    ...current,
    items,
  });
}
