import "server-only";

import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchCommunicationGates } from "@/lib/supabase/communication-gate-repository";
import { resolveSubstitutionTriggeredSlots, type SubstitutionSlotFacts } from "@/lib/leave/substitution-trigger";
import {
  rankSubstitutionCandidates,
  type SubstitutionCandidateFacts,
} from "@/lib/leave/substitution-ranking";
import { resolveRoleFallback } from "@/lib/process/role-fallback";
import { countLeaveWorkingDays } from "@/lib/leave/types";
import { sendPushToUser } from "@/lib/push/send-push";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

const WORKING_DAYS_THRESHOLD = 2;

/**
 * Faza 13 Krok 1 (/docs/role/04 §6.1) — sloty trzymane przez wnioskującego, które wymagają
 * planowania zastępstwa. Łączy fakty z bazy (kamień milowy) z bramą komunikacyjną już
 * przetestowaną w 11a (fetchCommunicationGates) — nie duplikuje jej logiki.
 */
export async function resolveTriggeredSubstitutionSlots(
  admin: AdminClient,
  profileId: string,
  startDate: string,
  endDate: string,
): Promise<SubstitutionSlotFacts[]> {
  const [{ data: slotFactsRows, error }, gates] = await Promise.all([
    admin.rpc("report_leave_substitution_slot_facts", {
      p_profile_id: profileId,
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    fetchCommunicationGates(),
  ]);
  if (error) throw new Error(error.message);

  const gateByProject = new Map(gates.map((gate) => [gate.projectId, gate.regime]));
  const slots: SubstitutionSlotFacts[] = (slotFactsRows ?? []).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    roleCode: row.role_code,
    gateRegime: gateByProject.get(row.project_id) ?? "nieustalona",
    milestoneOverlap: row.milestone_overlap,
  }));

  const workingDaysOverThreshold = countLeaveWorkingDays(startDate, endDate) > WORKING_DAYS_THRESHOLD;
  return resolveSubstitutionTriggeredSlots(workingDaysOverThreshold, slots);
}

export type GeneratedSubstitutionSlot = {
  id: string;
  projectId: string;
  projectName: string;
  roleCode: string;
  status: "proponowany" | "luka";
  proposedUserId: string | null;
  proposedUserName: string | null;
  proposedVia: "fallback" | "ranking" | null;
  gapReason: string | null;
};

/**
 * Faza 13 Krok 1 (/docs/role/04 §6.2 pkt 1) — dla każdego wyzwolonego slotu: domyślny kandydat
 * = fallback (jeśli jego posiadacz przechodzi wymaganą kompetencję i jest dostępny), inaczej
 * pierwszy z rankingu. Brak kandydata → status='luka' + eskalacja do właściciela (§6.2 pkt 5),
 * BEZ blokowania wniosku.
 */
export async function generateSubstitutionCoverageList(
  admin: AdminClient,
  input: {
    leaveRequestId: string;
    profileId: string;
    profileName: string;
    startDate: string;
    endDate: string;
    slots: SubstitutionSlotFacts[];
  },
): Promise<GeneratedSubstitutionSlot[]> {
  if (input.slots.length === 0) return [];

  const [{ data: allActiveSlots }, { data: fallbackRows }] = await Promise.all([
    admin.from("project_role_slot").select("project_id, role_code, user_id").is("to_date", null),
    admin.from("role_fallback").select("role_code, fallback_role_code").order("priority", { ascending: true }),
  ]);

  const fallbackEdgeByRole = new Map<string, string>();
  (fallbackRows ?? []).forEach((row) => {
    if (!fallbackEdgeByRole.has(row.role_code)) {
      fallbackEdgeByRole.set(row.role_code, row.fallback_role_code);
    }
  });

  const results: GeneratedSubstitutionSlot[] = [];
  const gapsForEscalation: { slot: SubstitutionSlotFacts; requirementLabel: string | null }[] = [];

  for (const slot of input.slots) {
    // Mapa aktywnych posiadaczy TEGO projektu, z pominięciem samego slotu (traktujemy go jako
    // wolny — inaczej resolveRoleFallback zwróci wprost wnioskującego, który wyjeżdża).
    const activeHolderByRole = new Map<string, string>();
    (allActiveSlots ?? [])
      .filter((row) => row.project_id === slot.projectId && row.role_code !== slot.roleCode)
      .forEach((row) => {
        if (!activeHolderByRole.has(row.role_code)) {
          activeHolderByRole.set(row.role_code, row.user_id);
        }
      });

    const { data: candidateRows, error: candidatesError } = await admin.rpc(
      "report_substitution_candidates",
      {
        p_project_id: slot.projectId,
        p_role_code: slot.roleCode,
        p_start_date: input.startDate,
        p_end_date: input.endDate,
        p_exclude_user_id: input.profileId,
      },
    );
    if (candidatesError) throw new Error(candidatesError.message);

    const candidateFacts: SubstitutionCandidateFacts[] = (candidateRows ?? []).map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      familiarityDays: row.familiarity_days,
      meetsRequiredCompetency: row.meets_required_competency,
      bestRequiredLevelSortOrder: row.best_required_level_sort_order,
      isAvailable: row.is_available,
      isWlasciciel: row.is_wlasciciel,
    }));
    const candidateByUserId = new Map(candidateFacts.map((c) => [c.userId, c]));

    const fallbackCoverage = resolveRoleFallback(slot.roleCode, activeHolderByRole, fallbackEdgeByRole);
    const fallbackCandidate = fallbackCoverage ? candidateByUserId.get(fallbackCoverage.userId) : null;
    const fallbackUsable =
      fallbackCandidate && fallbackCandidate.isAvailable && fallbackCandidate.meetsRequiredCompetency;

    const ranked = rankSubstitutionCandidates(candidateFacts);

    if (fallbackUsable && fallbackCandidate) {
      results.push({
        id: "",
        projectId: slot.projectId,
        projectName: slot.projectName,
        roleCode: slot.roleCode,
        status: "proponowany",
        proposedUserId: fallbackCandidate.userId,
        proposedUserName: fallbackCandidate.userName,
        proposedVia: "fallback",
        gapReason: null,
      });
    } else if (ranked.length > 0) {
      const top = ranked[0];
      results.push({
        id: "",
        projectId: slot.projectId,
        projectName: slot.projectName,
        roleCode: slot.roleCode,
        status: "proponowany",
        proposedUserId: top.userId,
        proposedUserName: top.userName,
        proposedVia: "ranking",
        gapReason: null,
      });
    } else {
      const requirementLabel = await describeMissingRequirement(admin, slot.roleCode);
      const gapReason = requirementLabel
        ? `Brak osoby z kompetencją ${requirementLabel} do pokrycia slotu ${slot.roleCode} na projekcie ${slot.projectName}.`
        : `Brak dostępnego kandydata do pokrycia slotu ${slot.roleCode} na projekcie ${slot.projectName}.`;
      results.push({
        id: "",
        projectId: slot.projectId,
        projectName: slot.projectName,
        roleCode: slot.roleCode,
        status: "luka",
        proposedUserId: null,
        proposedUserName: null,
        proposedVia: null,
        gapReason,
      });
      gapsForEscalation.push({ slot, requirementLabel });
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from("leave_substitution_slot")
    .insert(
      results.map((row) => ({
        leave_request_id: input.leaveRequestId,
        project_id: row.projectId,
        role_code: row.roleCode,
        status: row.status,
        proposed_user_id: row.proposedUserId,
        proposed_via: row.proposedVia,
        selected_user_id: row.proposedUserId,
        gap_reason: row.gapReason,
      })),
    )
    .select("id, project_id, role_code");
  if (insertError) throw new Error(insertError.message);

  const idByProjectRole = new Map((inserted ?? []).map((r) => [`${r.project_id}:${r.role_code}`, r.id]));
  const withIds = results.map((row) => ({
    ...row,
    id: idByProjectRole.get(`${row.projectId}:${row.roleCode}`) ?? row.id,
  }));

  if (gapsForEscalation.length > 0) {
    await escalateSubstitutionGaps(admin, input, gapsForEscalation).catch(() => undefined);
  }

  await notifyProposedCandidates(admin, input, withIds).catch(() => undefined);

  return withIds;
}

/** §6.2 pkt 3 — kandydat dostaje kartę przekazania i akceptuje jednym kliknięciem. */
async function notifyProposedCandidates(
  admin: AdminClient,
  input: { leaveRequestId: string; profileName: string; startDate: string; endDate: string },
  slots: GeneratedSubstitutionSlot[],
): Promise<void> {
  const byCandidate = new Map<string, GeneratedSubstitutionSlot[]>();
  slots
    .filter((slot) => slot.status === "proponowany" && slot.proposedUserId)
    .forEach((slot) => {
      const list = byCandidate.get(slot.proposedUserId as string) ?? [];
      list.push(slot);
      byCandidate.set(slot.proposedUserId as string, list);
    });

  const linkUrl = "/moja-praca/zastepstwa";
  for (const [candidateId, candidateSlots] of byCandidate) {
    const lines = candidateSlots.map((s) => `${s.projectName} / ${s.roleCode}`);
    const title = `Propozycja zastępstwa: ${input.profileName}, ${input.startDate}–${input.endDate}`;
    const body = lines.join("; ") + " — karta przekazania czeka na akceptację.";
    const sourceId = `leave_substitution_proposed:${input.leaveRequestId}:${candidateId}`;

    await admin.from("user_notifications").insert({
      id: crypto.randomUUID(),
      profile_id: candidateId,
      kind: "leave_substitution_proposed",
      title,
      body,
      link_url: linkUrl,
      source_id: sourceId,
      created_at: new Date().toISOString(),
    });
    try {
      await sendPushToUser(candidateId, { title, body, url: linkUrl, tag: sourceId });
    } catch {
      // Brak VAPID / subskrypcji — pomijamy.
    }
  }
}

async function describeMissingRequirement(admin: AdminClient, roleCode: string): Promise<string | null> {
  const { data } = await admin
    .from("project_role_competency")
    .select("competency_item_id, min_level_item_id")
    .eq("role_code", roleCode)
    .eq("is_required", true);
  if (!data || data.length === 0) return null;

  const [requirement] = data;
  const [{ data: competency }, { data: level }] = await Promise.all([
    admin.from("resource_dictionary_items").select("name").eq("id", requirement.competency_item_id).maybeSingle(),
    requirement.min_level_item_id
      ? admin.from("resource_dictionary_items").select("name").eq("id", requirement.min_level_item_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!competency?.name) return null;
  return level?.name ? `${competency.name} ≥ ${level.name}` : competency.name;
}

/** §6.2 pkt 5 — brak kandydata nie blokuje wniosku, idzie do właściciela z jawnie nazwaną luką. */
async function escalateSubstitutionGaps(
  admin: AdminClient,
  input: { leaveRequestId: string; profileId: string; profileName: string },
  gaps: { slot: SubstitutionSlotFacts; requirementLabel: string | null }[],
): Promise<void> {
  const projectIds = [...new Set(gaps.map((g) => g.slot.projectId))];
  const { data: ownerSlots } = await admin
    .from("project_role_slot")
    .select("project_id, user_id")
    .in("project_id", projectIds)
    .eq("role_code", "wlasciciel")
    .is("to_date", null);

  const ownerIds = [...new Set((ownerSlots ?? []).map((r) => r.user_id))];
  if (ownerIds.length === 0) return;

  const lines = gaps.map((g) => {
    const req = g.requirementLabel ? `kompetencja ${g.requirementLabel}` : "brak dostępnego kandydata";
    return `${g.slot.projectName} / ${g.slot.roleCode}: ${req}`;
  });
  const title = `Urlop ${input.profileName} — ${gaps.length} slotów bez zastępcy`;
  const body = lines.slice(0, 5).join("; ") + (lines.length > 5 ? ` i ${lines.length - 5} więcej…` : "");
  const sourceId = `leave_substitution_gap:${input.leaveRequestId}`;
  const linkUrl = "/moja-praca/dostepnosc";

  for (const ownerId of ownerIds) {
    await admin.from("user_notifications").insert({
      id: crypto.randomUUID(),
      profile_id: ownerId,
      kind: "leave_substitution_gap",
      title,
      body,
      link_url: linkUrl,
      source_id: `${sourceId}:${ownerId}`,
      created_at: new Date().toISOString(),
    });
    try {
      await sendPushToUser(ownerId, { title, body, url: linkUrl, tag: sourceId });
    } catch {
      // Brak VAPID / subskrypcji — pomijamy.
    }
  }
}
