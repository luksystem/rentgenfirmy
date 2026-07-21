import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveServiceIntakeDueAt } from "@/lib/service-intake/sla";
import type { ServiceIntakeRecord } from "@/lib/service-intake/types";

let serviceWorkTypeItemId: string | null | undefined;

async function getServiceWorkTypeItemId(supabase: SupabaseClient) {
  if (serviceWorkTypeItemId !== undefined) {
    return serviceWorkTypeItemId;
  }
  const { data } = await supabase
    .from("resource_dictionary_items")
    .select("id")
    .eq("dictionary_key", "work_type")
    .eq("name", "Serwis")
    .maybeSingle();
  serviceWorkTypeItemId = data?.id ?? null;
  return serviceWorkTypeItemId;
}

/**
 * Synchronizuje wpis planu zasobów dla przyjętego / utkniętego zgłoszenia.
 * Przypisany = lead; zaangażowani = uczestnicy. Godziny: domyślnie dziś 8–16.
 */
export async function syncServiceIntakeResourcePlanItem(
  supabase: SupabaseClient,
  intake: ServiceIntakeRecord,
  options?: { clearWhenUnassigned?: boolean },
): Promise<void> {
  const assigneeId = intake.assigneeId?.trim() || null;
  const { data: existing } = await supabase
    .from("resource_plan_items")
    .select("id")
    .eq("service_intake_request_id", intake.id)
    .maybeSingle();

  if (!assigneeId) {
    if (options?.clearWhenUnassigned && existing?.id) {
      await supabase.from("resource_plan_items").delete().eq("id", existing.id);
    }
    return;
  }

  const workTypeItemId = await getServiceWorkTypeItemId(supabase).catch(() => null);
  const now = new Date();
  const dueAtIso = resolveServiceIntakeDueAt(intake);
  const dueDate = dueAtIso ? new Date(dueAtIso) : null;
  // Dzień wpisu = termin wykonania (jeśli jeszcze nie minął), inaczej dziś (zgłoszenie przeterminowane).
  const day = dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() > now.getTime() ? dueDate : now;
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const startAt = `${y}-${m}-${d}T08:00:00`;
  const endAt = `${y}-${m}-${d}T16:00:00`;
  const clientLabel = intake.clientName?.trim() || intake.contactFullName || "Klient";
  const title = `[Serwis] ${intake.referenceNumber} — ${clientLabel}`;
  const stuckNote =
    intake.status === "stuck"
      ? ` · Utknięte · podejście ${intake.attemptCount}`
      : intake.attemptCount > 1
        ? ` · podejście ${intake.attemptCount}`
        : "";

  const involved = (intake.involvedProfileIds ?? []).filter((id) => id && id !== assigneeId);
  const payload = {
    service_intake_request_id: intake.id,
    client_id: intake.clientId,
    project_id: null as string | null,
    title,
    start_at: startAt,
    end_at: endAt,
    planned_hours: 8,
    assignee_id: assigneeId,
    work_type_item_id: workTypeItemId,
    notes: `Zgłoszenie serwisowe ${intake.referenceNumber}${stuckNote}`,
  };

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

  const participantRows = [
    {
      plan_item_id: planItemId,
      user_id: assigneeId,
      role_item_id: null as string | null,
      is_lead: true,
      involvement_percent: 100,
      start_at: startAt,
      end_at: endAt,
    },
    ...involved.map((userId) => ({
      plan_item_id: planItemId,
      user_id: userId,
      role_item_id: null as string | null,
      is_lead: false,
      involvement_percent: 100,
      start_at: startAt,
      end_at: endAt,
    })),
  ];

  const { error: partError } = await supabase
    .from("resource_plan_item_participants")
    .insert(participantRows);
  if (partError) throw new Error(partError.message);
}
