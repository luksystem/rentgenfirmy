import { getSupabase } from "@/lib/supabase/client";
import type {
  ResourcePlanItemCompetencyRequirementRow,
  ResourcePlanItemInsert,
  ResourcePlanItemParticipantRow,
  ResourcePlanItemRow,
  ResourcePlanItemUpdate,
} from "@/lib/supabase/database.types";
import type {
  ResourcePlanCompetencyRequirement,
  ResourcePlanItem,
  ResourcePlanItemInput,
  ResourcePlanParticipant,
} from "@/lib/resource-plan/types";

/** Migracja 134 musi być wdrożona, żeby kompetencje działały — bez niej odczyt planu
 *  nadal działa (pusta lista wymagań), żeby nie „znikały” istniejące przydziały. */
function isMissingCompetencyRequirementsTableError(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("resource_plan_item_competency_requirements") ||
    message.includes("Could not find the table")
  );
}

function mergeCompetencyRequirementLists(
  lists: ResourcePlanCompetencyRequirement[][],
): ResourcePlanCompetencyRequirement[] {
  const map = new Map<string, ResourcePlanCompetencyRequirement>();
  lists.flat().forEach((requirement) => {
    const existing = map.get(requirement.competencyItemId);
    if (!existing) {
      map.set(requirement.competencyItemId, requirement);
      return;
    }
    map.set(requirement.competencyItemId, {
      competencyItemId: requirement.competencyItemId,
      minLevelItemId: existing.minLevelItemId ?? requirement.minLevelItemId,
    });
  });
  return Array.from(map.values());
}
import { resourcePlanItemToInput } from "@/lib/resource-plan/types";

function rowToItem(
  row: ResourcePlanItemRow,
  participants: ResourcePlanParticipant[],
  requiredCompetencies: ResourcePlanCompetencyRequirement[],
): ResourcePlanItem {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    processStageId: row.process_stage_id,
    taskId: row.task_id,
    serviceIntakeRequestId: row.service_intake_request_id,
    workTypeItemId: row.work_type_item_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    plannedHours: row.planned_hours,
    actualHours: row.actual_hours,
    assigneeId: row.assignee_id,
    teamItemId: row.team_item_id,
    statusItemId: row.status_item_id,
    riskItemId: row.risk_item_id,
    riskNote: row.risk_note,
    laborBudget: row.labor_budget,
    materialBudget: row.material_budget,
    travelBudget: row.travel_budget,
    notes: row.notes,
    acceptedRisk: row.accepted_risk,
    createdBy: row.created_by,
    linkedGroupId: row.linked_group_id,
    shiftWithLinkedGroup: row.shift_with_linked_group,
    participants,
    requiredCompetencies,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: ResourcePlanItemInput): ResourcePlanItemInsert {
  return {
    project_id: input.projectId,
    client_id: input.clientId,
    process_stage_id: input.processStageId,
    task_id: input.taskId,
    service_intake_request_id: input.serviceIntakeRequestId,
    work_type_item_id: input.workTypeItemId,
    title: input.title.trim(),
    start_at: input.startAt,
    end_at: input.endAt,
    planned_hours: input.plannedHours,
    actual_hours: input.actualHours,
    assignee_id: input.assigneeId,
    team_item_id: input.teamItemId,
    status_item_id: input.statusItemId,
    risk_item_id: input.riskItemId,
    risk_note: input.riskNote.trim(),
    labor_budget: input.laborBudget,
    material_budget: input.materialBudget,
    travel_budget: input.travelBudget,
    notes: input.notes.trim(),
    accepted_risk: input.acceptedRisk,
    linked_group_id: input.linkedGroupId,
    shift_with_linked_group: input.shiftWithLinkedGroup,
  };
}

async function fetchParticipantsBatch(planItemIds: string[]): Promise<Map<string, ResourcePlanParticipant[]>> {
  const map = new Map<string, ResourcePlanParticipant[]>();
  if (planItemIds.length === 0) return map;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_item_participants")
    .select("*")
    .in("plan_item_id", planItemIds);

  if (error) throw new Error(error.message);

  (data ?? []).forEach((row: ResourcePlanItemParticipantRow) => {
    const list = map.get(row.plan_item_id) ?? [];
    list.push({
      userId: row.user_id,
      roleItemId: row.role_item_id,
      isLead: row.is_lead,
      involvementPercent: row.involvement_percent,
      startAt: row.start_at,
      endAt: row.end_at,
    });
    map.set(row.plan_item_id, list);
  });

  return map;
}

async function replaceParticipants(planItemId: string, participants: ResourcePlanParticipant[]) {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from("resource_plan_item_participants")
    .delete()
    .eq("plan_item_id", planItemId);
  if (deleteError) throw new Error(deleteError.message);

  if (participants.length === 0) return;

  const { error } = await supabase.from("resource_plan_item_participants").insert(
    participants.map((participant) => ({
      plan_item_id: planItemId,
      user_id: participant.userId,
      role_item_id: participant.roleItemId,
      is_lead: participant.isLead,
      involvement_percent: participant.involvementPercent,
      start_at: participant.startAt,
      end_at: participant.endAt,
    })),
  );
  if (error) throw new Error(error.message);
}

async function fetchCompetencyRequirementsBatch(
  planItemIds: string[],
): Promise<Map<string, ResourcePlanCompetencyRequirement[]>> {
  const map = new Map<string, ResourcePlanCompetencyRequirement[]>();
  if (planItemIds.length === 0) return map;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_item_competency_requirements")
    .select("*")
    .in("plan_item_id", planItemIds);

  if (error) {
    if (isMissingCompetencyRequirementsTableError(error)) return map;
    throw new Error(error.message);
  }

  (data ?? []).forEach((row: ResourcePlanItemCompetencyRequirementRow) => {
    const list = map.get(row.plan_item_id) ?? [];
    list.push({
      competencyItemId: row.competency_item_id,
      minLevelItemId: row.min_level_item_id,
    });
    map.set(row.plan_item_id, list);
  });

  return map;
}

async function replaceCompetencyRequirements(
  planItemId: string,
  requirements: ResourcePlanCompetencyRequirement[],
) {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from("resource_plan_item_competency_requirements")
    .delete()
    .eq("plan_item_id", planItemId);
  if (deleteError) {
    if (isMissingCompetencyRequirementsTableError(deleteError)) {
      if (requirements.length === 0) return;
      throw new Error(
        "Brak tabeli kompetencji przydziału w bazie — uruchom migrację 134_resource_plan_item_competency_requirements.sql w Supabase.",
      );
    }
    throw new Error(deleteError.message);
  }

  if (requirements.length === 0) return;

  const { error } = await supabase.from("resource_plan_item_competency_requirements").insert(
    requirements.map((requirement) => ({
      plan_item_id: planItemId,
      competency_item_id: requirement.competencyItemId,
      min_level_item_id: requirement.minLevelItemId,
    })),
  );
  if (error) {
    if (isMissingCompetencyRequirementsTableError(error)) {
      throw new Error(
        "Brak tabeli kompetencji przydziału w bazie — uruchom migrację 134_resource_plan_item_competency_requirements.sql w Supabase.",
      );
    }
    throw new Error(error.message);
  }
}

function mapRowsToItems(
  rows: ResourcePlanItemRow[],
  participantsByItem: Map<string, ResourcePlanParticipant[]>,
  competenciesByItem: Map<string, ResourcePlanCompetencyRequirement[]>,
): ResourcePlanItem[] {
  return rows.map((row) =>
    rowToItem(
      row,
      participantsByItem.get(row.id) ?? [],
      competenciesByItem.get(row.id) ?? [],
    ),
  );
}

/** Elementy planu nachodzące na zakres dat (do Gantt/kalendarza/listy/walidacji konfliktów). */
export async function fetchResourcePlanItemsInRange(fromIso: string, toIso: string): Promise<ResourcePlanItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_items")
    .select("*")
    .lte("start_at", toIso)
    .gte("end_at", fromIso)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [participantsByItem, competenciesByItem] = await Promise.all([
    fetchParticipantsBatch(ids),
    fetchCompetencyRequirementsBatch(ids),
  ]);
  return mapRowsToItems(rows, participantsByItem, competenciesByItem);
}

export async function fetchResourcePlanItemsForProject(projectId: string): Promise<ResourcePlanItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_items")
    .select("*")
    .eq("project_id", projectId)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [participantsByItem, competenciesByItem] = await Promise.all([
    fetchParticipantsBatch(ids),
    fetchCompetencyRequirementsBatch(ids),
  ]);
  return mapRowsToItems(rows, participantsByItem, competenciesByItem);
}

export async function createResourcePlanItem(input: ResourcePlanItemInput): Promise<ResourcePlanItem> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("resource_plan_items")
    .insert({ ...inputToRow(input), created_by: user?.id ?? null })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await replaceParticipants(data.id, input.participants);
  await replaceCompetencyRequirements(data.id, input.requiredCompetencies);
  return rowToItem(data, input.participants, input.requiredCompetencies);
}

export async function updateResourcePlanItem(id: string, input: ResourcePlanItemInput): Promise<ResourcePlanItem> {
  const supabase = getSupabase();
  const payload: ResourcePlanItemUpdate = { ...inputToRow(input), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("resource_plan_items").update(payload).eq("id", id).select("*").single();

  if (error) throw new Error(error.message);

  await replaceParticipants(id, input.participants);
  await replaceCompetencyRequirements(id, input.requiredCompetencies);
  return rowToItem(data, input.participants, input.requiredCompetencies);
}

export async function deleteResourcePlanItem(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("resource_plan_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Wszystkie części jednego podzielonego przydziału (patrz `splitResourcePlanItem`). */
export async function fetchLinkedGroupItems(groupId: string): Promise<ResourcePlanItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_items")
    .select("*")
    .eq("linked_group_id", groupId)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [participantsByItem, competenciesByItem] = await Promise.all([
    fetchParticipantsBatch(ids),
    fetchCompetencyRequirementsBatch(ids),
  ]);
  return mapRowsToItems(rows, participantsByItem, competenciesByItem);
}

/**
 * Pola, które przy podziale przydziału na części (i przy późniejszej edycji jednej z nich)
 * mają sens jako "wspólne" dla wszystkich części — reszta (terminy, godziny, budżety,
 * uczestnicy) jest z natury inna dla każdej części, więc jej nie propagujemy.
 */
const LINKED_GROUP_SHARED_FIELD_KEYS = [
  "title",
  "projectId",
  "clientId",
  "processStageId",
  "workTypeItemId",
  "teamItemId",
  "statusItemId",
  "riskItemId",
  "riskNote",
  "notes",
  "acceptedRisk",
  "requiredCompetencies",
] as const satisfies readonly (keyof ResourcePlanItemInput)[];

export function pickLinkedGroupSharedFields(input: ResourcePlanItemInput): Partial<ResourcePlanItemInput> {
  const patch: Partial<ResourcePlanItemInput> = {};
  LINKED_GROUP_SHARED_FIELD_KEYS.forEach((key) => {
    (patch as Record<string, unknown>)[key] = input[key];
  });
  return patch;
}

/** Aktualizuje "wspólne" pola (patrz wyżej) we wszystkich innych częściach tej samej grupy —
 *  na życzenie koordynatora (checkbox w panelu edycji), żeby podział na części nie oznaczał
 *  ręcznej synchronizacji tytułu/statusu/ryzyka w kilku miejscach. */
export async function applySharedFieldsToLinkedGroup(
  groupId: string,
  excludeId: string,
  patch: Partial<ResourcePlanItemInput>,
): Promise<void> {
  const siblings = (await fetchLinkedGroupItems(groupId)).filter((sibling) => sibling.id !== excludeId);
  await Promise.all(
    siblings.map((sibling) => updateResourcePlanItem(sibling.id, { ...resourcePlanItemToInput(sibling), ...patch })),
  );
}

/**
 * Dzieli element planu na dwie części w punkcie `splitAtIso` (musi być wewnątrz zakresu),
 * zachowując, że to "jeden przydział" — obie części dostają ten sam `linkedGroupId` (nowy,
 * jeśli element jeszcze nie był częścią grupy). Godziny planowane są dzielone proporcjonalnie
 * do długości nowych zakresów (edytowalne później niezależnie w każdej części). Uczestnicy
 * (z własnymi % i zakresami) są kopiowani do obu części — koordynator dostosowuje je ręcznie,
 * jeśli konkretna osoba brała udział tylko w jednej z części.
 */
export async function splitResourcePlanItem(
  item: ResourcePlanItem,
  splitAtIso: string,
): Promise<{ updatedOriginal: ResourcePlanItem; created: ResourcePlanItem }> {
  if (!(item.startAt < splitAtIso && splitAtIso < item.endAt)) {
    throw new Error("Punkt podziału musi być wewnątrz zakresu przydziału.");
  }

  const groupId = item.linkedGroupId ?? crypto.randomUUID();
  const totalMs = new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
  const firstMs = new Date(splitAtIso).getTime() - new Date(item.startAt).getTime();
  const fraction = totalMs > 0 ? firstMs / totalMs : 0.5;

  const baseInput = resourcePlanItemToInput(item);
  const firstHours = item.plannedHours != null ? Math.round(item.plannedHours * fraction * 100) / 100 : null;
  const secondHours =
    item.plannedHours != null ? Math.round((item.plannedHours - (firstHours ?? 0)) * 100) / 100 : null;

  const updatedOriginal = await updateResourcePlanItem(item.id, {
    ...baseInput,
    endAt: splitAtIso,
    plannedHours: firstHours,
    linkedGroupId: groupId,
  });

  const created = await createResourcePlanItem({
    ...baseInput,
    startAt: splitAtIso,
    plannedHours: secondHours,
    linkedGroupId: groupId,
  });

  return { updatedOriginal, created };
}

/**
 * Odwraca podział — scala wszystkie części grupy `groupId` z powrotem w jeden element planu
 * (przywrócenie do stanu pierwotnego). Zachowuje najstarszą część (najwcześniejszy `startAt`) jako
 * "nośnik", rozciąga jej zakres na min(startAt)…max(endAt) całej grupy, sumuje `plannedHours`
 * (jeśli wszystkie części mają podane godziny — inaczej `null`, bez zgadywania), łączy uczestników
 * (deduplikacja po `userId`, pierwsze wystąpienie wygrywa) i usuwa pozostałe części.
 */
export async function mergeLinkedGroupItems(groupId: string): Promise<ResourcePlanItem> {
  const members = await fetchLinkedGroupItems(groupId);
  if (members.length === 0) throw new Error("Nie znaleziono elementów tej grupy.");
  if (members.length === 1) return members[0];

  const primary = members[0];
  const rest = members.slice(1);

  const mergedStartAt = members.reduce((min, m) => (m.startAt < min ? m.startAt : min), primary.startAt);
  const mergedEndAt = members.reduce((max, m) => (m.endAt > max ? m.endAt : max), primary.endAt);
  const allHoursKnown = members.every((m) => m.plannedHours != null);
  const mergedHours = allHoursKnown
    ? Math.round(members.reduce((sum, m) => sum + (m.plannedHours ?? 0), 0) * 100) / 100
    : null;

  const mergedParticipants: ResourcePlanParticipant[] = [];
  const seenUserIds = new Set<string>();
  members.forEach((member) => {
    member.participants.forEach((participant) => {
      if (seenUserIds.has(participant.userId)) return;
      seenUserIds.add(participant.userId);
      mergedParticipants.push(participant);
    });
  });

  const mergedCompetencies = mergeCompetencyRequirementLists(members.map((member) => member.requiredCompetencies));

  const merged = await updateResourcePlanItem(primary.id, {
    ...resourcePlanItemToInput(primary),
    startAt: mergedStartAt,
    endAt: mergedEndAt,
    plannedHours: mergedHours,
    linkedGroupId: null,
    shiftWithLinkedGroup: false,
    participants: mergedParticipants,
    requiredCompetencies: mergedCompetencies,
  });

  await Promise.all(rest.map((sibling) => deleteResourcePlanItem(sibling.id)));

  return merged;
}

/** Ustawia "zależność pociętych" (patrz migracja 111) na WSZYSTKICH częściach grupy naraz —
 *  to jest ustawienie grupy, nie pojedynczej części, więc musi być zsynchronizowane. */
export async function setLinkedGroupShiftEnabled(groupId: string, enabled: boolean): Promise<ResourcePlanItem[]> {
  const members = await fetchLinkedGroupItems(groupId);
  return Promise.all(
    members.map((member) =>
      updateResourcePlanItem(member.id, { ...resourcePlanItemToInput(member), shiftWithLinkedGroup: enabled }),
    ),
  );
}
