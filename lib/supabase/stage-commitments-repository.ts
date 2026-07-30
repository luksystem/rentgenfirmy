// Krok A A7 / Krok B (docs/08 D27 2.4, D28).
import { getSupabase } from "@/lib/supabase/client";
import type { StageCommitment, StageCommitmentStatus } from "@/lib/stage-commitments/types";
import type { ResourcePlanItemInput } from "@/lib/resource-plan/types";
import { addDaysToIsoDate } from "@/lib/rot/review-date";
import { projectProcessItemPlannedDateUpdate } from "@/lib/supabase/process-item-mappers";
import { updateProjectProcessCompletion } from "@/lib/supabase/process-repository";
import { createResourcePlanItem, deleteResourcePlanItem } from "@/lib/supabase/resource-plan-repository";

export async function fetchStageCommitments(horizonDays = 21): Promise<StageCommitment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_stage_commitments", {
    p_horizon_days: horizonDays,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    stageId: row.stage_id,
    stageTitle: row.stage_title,
    itemId: row.item_id,
    templateItemId: row.template_item_id,
    title: row.title,
    terminWynikajacy: row.termin_wynikajacy,
    dataPlanowana: row.data_planowana,
    dataUkonczenia: row.data_ukonczenia,
    effortDays: row.effort_days,
    resourcePlanItemId: row.resource_plan_item_id,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name,
    responsibleSource: (row.responsible_source as StageCommitment["responsibleSource"]) ?? null,
    status: row.status as StageCommitmentStatus,
  }));
}

/** A6 (docs/08 D27 2.4) — szybka edycja daty planowanej. BLOKADA (>= data kamienia) wymuszana
 *  triggerem w bazie (validate_project_process_item_data_planowana). */
export async function setStageCommitmentPlannedDate(itemId: string, dataPlanowana: string | null): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_process_items")
    .update(projectProcessItemPlannedDateUpdate(dataPlanowana))
    .eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}

/** A6 — oznaczenie ukończone/nieukończone z poziomu planu, tą samą ścieżką co pipeline (data_ukonczenia
 *  jest źródłem prawdy, completions to cache — docs/08 D27 2.2). */
export async function setStageCommitmentCompleted(
  projectId: string,
  templateItemId: string,
  completed: boolean,
  completedByName?: string,
): Promise<void> {
  await updateProjectProcessCompletion(projectId, templateItemId, completed, completedByName);
}

/**
 * Krok B B7 — "Zaplanuj": materializuje zobowiązanie jako blok resource_plan_items (`process_item_id`
 * link). Godziny robocze 08:00-16:00, tyle dni ile `effortDays` (domyślnie 1, gdy szablon nie ma
 * jeszcze wartości — element i tak jest wyliczalny tylko dzięki `lead_days`, `effort_days` to osobna
 * wartość opcjonalna dla samego bloku).
 */
export async function planStageCommitment(commitment: StageCommitment): Promise<void> {
  const startDateIso = commitment.dataPlanowana ?? commitment.terminWynikajacy;
  if (!startDateIso) {
    throw new Error("Brak daty do zaplanowania — ustaw najpierw termin lub datę planowaną.");
  }
  const days = Math.max(1, commitment.effortDays ?? 1);
  const startAt = `${startDateIso}T08:00:00`;
  // UTC-safe arytmetyka dat — `new Date("...T00:00:00")` parsuje się w czasie LOKALNYM, a
  // `.toISOString()` konwertuje na UTC. W Europe/Warsaw (UTC+1/+2) północ lokalna wypada w
  // poprzednim dniu UTC, więc przy effortDays=1 (brak przesunięcia) data końcowa wychodziła
  // wcześniejsza niż początkowa i wpadała w `check(end_at >= start_at)` — dokładnie ten sam błąd,
  // który już raz naprawiono w computeSuggestedReviewDate (lib/rot/review-date.ts).
  const endAt = `${addDaysToIsoDate(startDateIso, days - 1)}T16:00:00`;

  const input: ResourcePlanItemInput = {
    projectId: commitment.projectId,
    clientId: null,
    processStageId: commitment.stageId,
    taskId: null,
    serviceIntakeRequestId: null,
    inspectionId: null,
    inspectionDateConfirmed: null,
    processItemId: commitment.itemId,
    workTypeItemId: null,
    title: `[Zobowiązanie] ${commitment.title}`,
    startAt,
    endAt,
    plannedHours: days * 8,
    actualHours: null,
    assigneeId: commitment.responsibleUserId,
    teamItemId: null,
    statusItemId: null,
    riskItemId: null,
    riskNote: "",
    laborBudget: null,
    materialBudget: null,
    travelBudget: null,
    notes: "",
    completionFeedback: "",
    acceptedRisk: false,
    linkedGroupId: null,
    shiftWithLinkedGroup: false,
    participants: commitment.responsibleUserId
      ? [
          {
            userId: commitment.responsibleUserId,
            roleItemId: null,
            isLead: true,
            involvementPercent: 100,
            startAt: null,
            endAt: null,
          },
        ]
      : [],
    requiredCompetencies: [],
  };

  await createResourcePlanItem(input);
}

/** Krok B B7 — "Odplanuj". Blok UKOŃCZONEGO zobowiązania nigdy nie jest usuwany (docs/08 D28) —
 *  wołający musi to sprawdzić przed wywołaniem (UI ukrywa/blokuje przycisk). */
export async function unplanStageCommitment(commitment: StageCommitment): Promise<void> {
  if (commitment.dataUkonczenia) {
    throw new Error("Nie można odplanować ukończonego zobowiązania — blok zostaje jako historia.");
  }
  if (!commitment.resourcePlanItemId) {
    return;
  }
  await deleteResourcePlanItem(commitment.resourcePlanItemId);
}

export async function setStageCommitmentAssignee(
  itemId: string,
  assigneeId: string | null,
  assigneeName: string | null,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_process_items")
    .update({
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}
