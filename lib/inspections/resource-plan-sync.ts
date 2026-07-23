import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InspectionRecord } from "@/lib/inspections/types";

let inspectionWorkTypeItemId: string | null | undefined;

async function getInspectionWorkTypeItemId(supabase: SupabaseClient) {
  if (inspectionWorkTypeItemId !== undefined) {
    return inspectionWorkTypeItemId;
  }
  const { data } = await supabase
    .from("resource_dictionary_items")
    .select("id")
    .eq("dictionary_key", "work_type")
    .eq("name", "Przegląd")
    .maybeSingle();
  inspectionWorkTypeItemId = data?.id ?? null;
  return inspectionWorkTypeItemId;
}

let completedPlanStatusItemId: string | null | undefined;

async function getCompletedPlanStatusItemId(supabase: SupabaseClient) {
  if (completedPlanStatusItemId !== undefined) {
    return completedPlanStatusItemId;
  }
  const { data } = await supabase
    .from("resource_dictionary_items")
    .select("id")
    .eq("dictionary_key", "plan_status")
    .eq("name", "Zakończone")
    .maybeSingle();
  completedPlanStatusItemId = data?.id ?? null;
  return completedPlanStatusItemId;
}

const REALIZED_STATUSES = new Set(["completed", "billing", "settled"]);

/**
 * Synchronizuje wpis planu zasobów dla przeglądu — od razu po zaplanowaniu (data
 * wstępna) i po każdej zmianie (ustalenie terminu, przypisanie wykonawcy, zmiana
 * statusu). Dopóki przegląd nie ma przypisanego wykonawcy, wpis wisi tymczasowo
 * pod osobą odpowiedzialną za koordynację — inaczej byłby niewidoczny w widoku
 * Gantt "Osoby" (filtruje po assignee_id).
 */
export async function syncInspectionResourcePlanItem(
  supabase: SupabaseClient,
  inspection: InspectionRecord,
): Promise<void> {
  const effectiveDate = inspection.confirmedDate ?? inspection.preliminaryDate;
  if (!effectiveDate) {
    return;
  }

  const isConfirmed = Boolean(inspection.confirmedDate);
  const assigneeId = inspection.assigneeId?.trim() || inspection.responsibleId?.trim() || null;
  const workTypeItemId = await getInspectionWorkTypeItemId(supabase).catch(() => null);
  const isRealized = REALIZED_STATUSES.has(inspection.status);
  const statusItemId = isRealized ? await getCompletedPlanStatusItemId(supabase).catch(() => null) : null;

  const startAt = `${effectiveDate}T08:00:00`;
  const endAt = `${effectiveDate}T16:00:00`;
  const clientLabel = inspection.clientName?.trim() || "Klient";
  const title = `[Przegląd] ${inspection.systemLabel} — ${clientLabel}`;

  const payload: Record<string, unknown> = {
    inspection_id: inspection.id,
    inspection_date_confirmed: isConfirmed,
    client_id: inspection.clientId,
    project_id: inspection.projectId,
    title,
    start_at: startAt,
    end_at: endAt,
    planned_hours: 8,
    assignee_id: assigneeId,
    work_type_item_id: workTypeItemId,
    notes: inspection.workScope || `Przegląd ${inspection.systemLabel}`,
  };
  if (statusItemId) {
    payload.status_item_id = statusItemId;
  }

  const { data: existing } = await supabase
    .from("resource_plan_items")
    .select("id")
    .eq("inspection_id", inspection.id)
    .maybeSingle();

  let planItemId: string;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("resource_plan_items")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    planItemId = data.id;
  } else {
    const { data, error } = await supabase
      .from("resource_plan_items")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    planItemId = data.id;
  }

  await supabase.from("resource_plan_item_participants").delete().eq("plan_item_id", planItemId);

  if (assigneeId) {
    const { error: partError } = await supabase.from("resource_plan_item_participants").insert({
      plan_item_id: planItemId,
      user_id: assigneeId,
      role_item_id: null,
      is_lead: true,
      involvement_percent: 100,
      start_at: startAt,
      end_at: endAt,
    });
    if (partError) throw new Error(partError.message);
  }
}
