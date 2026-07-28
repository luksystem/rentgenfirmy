// Faza 5 (Generator raportu etapowego) — docs/role/03-warstwa-komunikacyjna.md §3, docs/08.
import { getSupabase } from "@/lib/supabase/client";
import { getUserDisplayName } from "@/lib/auth/types";
import { fetchProjectProcess } from "@/lib/supabase/process-repository";
import { fetchProjectProcessItems } from "@/lib/supabase/process-item-repository";
import { fetchRotItems } from "@/lib/supabase/rot-repository";
import { resolveRoleFallbackForProject } from "@/lib/process/role-fallback";
import { getProcessPublicUrl } from "@/lib/process/public-link-paths";
import { PROCESS_ROLE_LABELS, type ProcessRoleCode, type ProcessStage } from "@/lib/process/types";
import { COMMUNICATION_PHASE_RHYTHM_LABELS } from "@/lib/stage-report/types";
import type {
  StageReport,
  StageReportChange,
  StageReportCompletedItem,
  StageReportContent,
  StageReportDocument,
  StageReportRotItem,
  StageReportStatus,
} from "@/lib/stage-report/types";
import type { ProjectStageReportRow } from "@/lib/supabase/database.types";

function rowToStageReport(row: ProjectStageReportRow): StageReport {
  return {
    id: row.id,
    projectId: row.project_id,
    stageId: row.stage_id,
    milestoneId: row.milestone_id,
    status: row.status as StageReportStatus,
    content: row.content as StageReportContent,
    coordinatorComment: row.coordinator_comment,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    sentAt: row.sent_at,
    sentBy: row.sent_by,
  };
}

export async function fetchStageReports(projectId: string): Promise<StageReport[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_stage_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("generated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToStageReport);
}

/** Faza 5 pilotaż (docs/08) — flaga na projekcie, bez rozgałęziania kodu w reszcie funkcji poniżej. */
export async function fetchStageReportsPilotEnabled(projectId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("stage_reports_pilot_enabled")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean((data as { stage_reports_pilot_enabled?: boolean } | null)?.stage_reports_pilot_enabled);
}

export async function setStageReportsPilotEnabled(projectId: string, enabled: boolean): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("projects")
    .update({ stage_reports_pilot_enabled: enabled })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
}

async function resolveResponsible(
  supabase: ReturnType<typeof getSupabase>,
  projectId: string,
  stageId: string,
): Promise<{ roleLabel: string | null; name: string | null }> {
  const { data: respRows, error: respError } = await supabase
    .from("process_stage_role_responsibility")
    .select("role_code")
    .eq("stage_id", stageId)
    .eq("is_glowny", true)
    .limit(1);
  if (respError) throw new Error(respError.message);

  const roleCode = respRows?.[0]?.role_code as ProcessRoleCode | undefined;
  if (!roleCode) {
    return { roleLabel: null, name: null };
  }
  const roleLabel = PROCESS_ROLE_LABELS[roleCode] ?? roleCode;

  const coverage = await resolveRoleFallbackForProject(supabase, projectId, roleCode);
  if (!coverage) {
    return { roleLabel, name: null };
  }
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", coverage.userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profileRow) {
    return { roleLabel, name: null };
  }
  return {
    roleLabel,
    name: getUserDisplayName({
      firstName: profileRow.first_name,
      lastName: profileRow.last_name,
      email: profileRow.email,
    }),
  };
}

/**
 * Buduje treść raportu z żywych danych (checklisty/protokoły, ROT, zmiany, następny etap).
 * Wywoływane przy generowaniu i przy każdej regeneracji — dopóki raport ma status "wygenerowany",
 * wynik nadpisuje poprzednią treść; po zatwierdzeniu treść jest zamrożona (trigger w bazie),
 * ta funkcja przestaje być wywoływana dla tego raportu.
 */
export async function buildStageReportContent(
  projectId: string,
  projectName: string,
  stageId: string,
  milestoneId: string,
): Promise<StageReportContent> {
  const supabase = getSupabase();

  const process = await fetchProjectProcess(projectId);
  if (!process?.templateSnapshot) {
    throw new Error("Projekt nie ma jeszcze przypiętego szablonu procesu.");
  }
  const stages = process.templateSnapshot.stages;
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error("Nie znaleziono etapu w szablonie projektu.");
  }
  const milestone = stage.milestones.find((m) => m.id === milestoneId);
  if (!milestone) {
    throw new Error("Nie znaleziono kamienia milowego w tym etapie.");
  }

  const completions = process.completions ?? {};
  const completedDates = milestone.items
    .map((item) => completions[item.id]?.completedAt)
    .filter((value): value is string => Boolean(value));
  const milestoneReachedAt =
    completedDates.length > 0 ? completedDates.sort().at(-1)! : new Date().toISOString();

  const completedDocItems = milestone.items.filter(
    (item) => (item.kind === "checklist" || item.kind === "protocol") && completions[item.id]?.completedAt,
  );
  const completedItems: StageReportCompletedItem[] = completedDocItems.map((item) => ({
    title: item.title,
    kind: item.kind as "checklist" | "protocol",
    completedAt: completions[item.id]?.completedAt ?? null,
  }));

  // Dokumenty do wglądu: tylko elementy z JUŻ włączonym publicznym linkiem — generowanie raportu
  // nie zmienia cudzych ustawień widoczności jako efekt uboczny (opiekun włącza ręcznie, jeśli chce).
  const processItems = await fetchProjectProcessItems(projectId);
  const processItemsByTemplateId = new Map(processItems.map((item) => [item.templateItemId, item]));
  const relevantProcessItemIds = completedDocItems
    .map((item) => processItemsByTemplateId.get(item.id)?.id)
    .filter((id): id is string => Boolean(id));

  const documents: StageReportDocument[] = [];
  if (relevantProcessItemIds.length > 0) {
    const { data: publicRows, error: publicError } = await supabase
      .from("project_process_item_public_access")
      .select("project_process_item_id, public_token, public_enabled")
      .in("project_process_item_id", relevantProcessItemIds);
    if (publicError) throw new Error(publicError.message);
    const publicByItemId = new Map((publicRows ?? []).map((row) => [row.project_process_item_id, row]));

    for (const item of completedDocItems) {
      const processItem = processItemsByTemplateId.get(item.id);
      const publicRow = processItem ? publicByItemId.get(processItem.id) : undefined;
      documents.push({
        title: item.title,
        url:
          publicRow?.public_enabled && publicRow.public_token
            ? getProcessPublicUrl(item.kind, publicRow.public_token)
            : null,
      });
    }
  }

  // Zmiany w tym etapie: project_change_requests zaakceptowane w oknie [entered_at, exited_at/teraz)
  // tego wejścia w etap — brak bezpośredniego odniesienia stage_id na project_change_requests.
  const { data: historyRows, error: historyError } = await supabase
    .from("project_stage_history")
    .select("entered_at, exited_at")
    .eq("project_id", projectId)
    .eq("stage_id", stageId)
    .order("entered_at", { ascending: false })
    .limit(1);
  if (historyError) throw new Error(historyError.message);
  const stageWindow = historyRows?.[0];

  const changes: StageReportChange[] = [];
  if (stageWindow) {
    const windowEnd = stageWindow.exited_at ?? new Date().toISOString();
    const { data: changeRows, error: changeError } = await supabase
      .from("project_change_requests")
      .select("title, cost_note, proposed_cost_net, proposed_cost_gross, client_response_name, client_responded_at")
      .eq("project_id", projectId)
      .eq("status", "accepted")
      .gte("client_responded_at", stageWindow.entered_at)
      .lte("client_responded_at", windowEnd);
    if (changeError) throw new Error(changeError.message);
    for (const row of changeRows ?? []) {
      changes.push({
        title: row.title,
        costNote: row.cost_note ?? "",
        costNet: row.proposed_cost_net == null ? null : Number(row.proposed_cost_net),
        costGross: row.proposed_cost_gross == null ? null : Number(row.proposed_cost_gross),
        approvedByName: row.client_response_name,
        approvedAt: row.client_responded_at,
      });
    }
  }

  // ROT: raport_rot_items nie filtruje po projekcie (docs/08 D23) — filtrowanie po stronie klienta,
  // tak samo jak w app/rot/page.tsx.
  const rotItems = (await fetchRotItems()).filter((item) => item.projectId === projectId);
  const toRotSnapshot = (item: (typeof rotItems)[number]): StageReportRotItem => ({
    title: item.title,
    category: item.category,
    detail: item.detail,
    daysOpen: item.daysOpen,
  });
  const carriedOverItems = rotItems.filter((item) => item.rotStatus !== "ZAMKNIETE").map(toRotSnapshot);
  const clientNeeds = rotItems
    .filter((item) => item.category === "OCZEKIWANIE_DECYZJA_INWESTORA")
    .map(toRotSnapshot);

  // Następny etap.
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const currentIndex = sortedStages.findIndex((s) => s.id === stage.id);
  const nextStageTemplate: ProcessStage | undefined = sortedStages[currentIndex + 1];

  let nextStage: StageReportContent["nextStage"] = null;
  if (nextStageTemplate) {
    const startConditions = (nextStageTemplate.dependsOnStageIds ?? [])
      .map((depId) => stages.find((s) => s.id === depId)?.title)
      .filter((title): title is string => Boolean(title));
    const firstMilestoneId = nextStageTemplate.milestones[0]?.id;
    const plannedStartDate = firstMilestoneId ? process.milestoneDates?.[firstMilestoneId] ?? null : null;
    const { roleLabel, name } = await resolveResponsible(supabase, projectId, nextStageTemplate.id);
    nextStage = {
      title: nextStageTemplate.title,
      plannedStartDate,
      startConditions,
      responsibleRoleLabel: roleLabel,
      responsibleName: name,
      rhythmLabel: nextStageTemplate.baseCommunicationPhase
        ? COMMUNICATION_PHASE_RHYTHM_LABELS[nextStageTemplate.baseCommunicationPhase]
        : null,
    };
  }

  return {
    projectName,
    stageTitle: stage.title,
    milestoneTitle: milestone.title,
    milestoneReachedAt,
    completedItems,
    documents,
    changes,
    carriedOverItems,
    clientNeeds,
    nextStage,
  };
}

/** Generuje albo regeneruje raport (dopóki status='wygenerowany') — upsert po (project_id, milestone_id). */
export async function generateStageReport(
  projectId: string,
  projectName: string,
  stageId: string,
  milestoneId: string,
  generatedBy: string,
): Promise<StageReport> {
  const supabase = getSupabase();
  const content = await buildStageReportContent(projectId, projectName, stageId, milestoneId);

  const { data: existing, error: existingError } = await supabase
    .from("project_stage_reports")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("milestone_id", milestoneId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing && existing.status !== "wygenerowany") {
    throw new Error("Ten raport jest już zatwierdzony — regeneracja nie jest już możliwa.");
  }

  if (existing) {
    const { data, error } = await supabase
      .from("project_stage_reports")
      .update({ content, generated_at: new Date().toISOString(), generated_by: generatedBy })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToStageReport(data);
  }

  const { data, error } = await supabase
    .from("project_stage_reports")
    .insert({
      project_id: projectId,
      stage_id: stageId,
      milestone_id: milestoneId,
      content,
      generated_by: generatedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToStageReport(data);
}

export async function updateStageReportComment(reportId: string, coordinatorComment: string): Promise<StageReport> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_stage_reports")
    .update({ coordinator_comment: coordinatorComment })
    .eq("id", reportId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToStageReport(data);
}

/** Zatwierdzenie zamraża treść i komentarz (trigger w bazie egzekwuje to niezależnie od tego kodu). */
export async function approveStageReport(reportId: string, approvedBy: string): Promise<StageReport> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_stage_reports")
    .update({ status: "zatwierdzony", approved_at: new Date().toISOString(), approved_by: approvedBy })
    .eq("id", reportId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToStageReport(data);
}

/** Data wysłania jest polem obowiązkowym (docs/08 D — Faza 5 pkt 3), nawet przy ręcznej wysyłce. */
export async function markStageReportSent(reportId: string, sentAt: string, sentBy: string): Promise<StageReport> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_stage_reports")
    .update({ status: "wyslany", sent_at: sentAt, sent_by: sentBy })
    .eq("id", reportId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToStageReport(data);
}
