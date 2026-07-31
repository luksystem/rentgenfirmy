import "server-only";

import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { LeaveSubstitutionSlot, MySubstitutionProposal } from "@/lib/leave/substitution-types";
import { sendPushToUser } from "@/lib/push/send-push";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export async function fetchSubstitutionSlotsForRequestServer(
  admin: AdminClient,
  leaveRequestId: string,
): Promise<LeaveSubstitutionSlot[]> {
  const { data, error } = await admin
    .from("leave_substitution_slot")
    .select("*")
    .eq("leave_request_id", leaveRequestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const projectIds = [...new Set(rows.map((r) => r.project_id))];
  const userIds = [...new Set(rows.flatMap((r) => [r.proposed_user_id, r.selected_user_id]).filter(Boolean))] as string[];

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    projectIds.length
      ? admin.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? admin.from("profiles").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ]);

  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const userNameById = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]),
  );

  return rows.map((row) => ({
    id: row.id,
    leaveRequestId: row.leave_request_id,
    projectId: row.project_id,
    projectName: projectNameById.get(row.project_id) ?? null,
    roleCode: row.role_code,
    status: row.status as LeaveSubstitutionSlot["status"],
    proposedUserId: row.proposed_user_id,
    proposedUserName: row.proposed_user_id ? userNameById.get(row.proposed_user_id) ?? null : null,
    proposedVia: row.proposed_via as LeaveSubstitutionSlot["proposedVia"],
    selectedUserId: row.selected_user_id,
    selectedUserName: row.selected_user_id ? userNameById.get(row.selected_user_id) ?? null : null,
    gapReason: row.gap_reason,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
  }));
}

/** §6.2 pkt 2 — wnioskujący koryguje wyjątki, nie wypełnia pustych pól. Zaufanie do wyboru człowieka. */
export async function correctSubstitutionSlotServer(
  admin: AdminClient,
  slotId: string,
  newUserId: string,
): Promise<void> {
  const { data: slot, error } = await admin
    .from("leave_substitution_slot")
    .update({ selected_user_id: newUserId, status: "skorygowany", gap_reason: null, updated_at: new Date().toISOString() })
    .eq("id", slotId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const [{ data: project }, { data: leaveRequest }] = await Promise.all([
    admin.from("projects").select("name").eq("id", slot.project_id).maybeSingle(),
    admin.from("leave_requests").select("start_date, end_date").eq("id", slot.leave_request_id).single(),
  ]);

  const title = `Propozycja zastępstwa: ${project?.name ?? "projekt"} / ${slot.role_code}`;
  const body = `${leaveRequest?.start_date}–${leaveRequest?.end_date} — karta przekazania czeka na akceptację.`;
  const sourceId = `leave_substitution_proposed:${slot.leave_request_id}:${newUserId}:corrected:${slot.id}`;
  const linkUrl = "/moja-praca/dostepnosc?tab=zastepstwa";

  await admin.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: newUserId,
    kind: "leave_substitution_proposed",
    title,
    body,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: new Date().toISOString(),
  });
  try {
    await sendPushToUser(newUserId, { title, body, url: linkUrl, tag: sourceId });
  } catch {
    // Brak VAPID / subskrypcji — pomijamy.
  }
}

/** §6.2 pkt 3 — kandydat akceptuje kartę przekazania jednym kliknięciem. */
export async function acceptSubstitutionSlotServer(admin: AdminClient, slotId: string): Promise<void> {
  const { error } = await admin
    .from("leave_substitution_slot")
    .update({ status: "zaakceptowany", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", slotId);
  if (error) throw new Error(error.message);
}

/** §6.4 — propozycje zastępstwa skierowane do zalogowanego użytkownika, z kartą przekazania. */
export async function fetchMySubstitutionProposalsServer(
  admin: AdminClient,
  userId: string,
): Promise<MySubstitutionProposal[]> {
  const { data: slots, error } = await admin
    .from("leave_substitution_slot")
    .select("*")
    .eq("selected_user_id", userId)
    .in("status", ["proponowany", "skorygowany", "zaakceptowany"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!slots || slots.length === 0) return [];

  const leaveRequestIds = [...new Set(slots.map((s) => s.leave_request_id))];
  const projectIds = [...new Set(slots.map((s) => s.project_id))];

  const [{ data: leaveRequests }, { data: projects }] = await Promise.all([
    admin.from("leave_requests").select("id, start_date, end_date, profile_id").in("id", leaveRequestIds),
    admin.from("projects").select("id, name").in("id", projectIds),
  ]);

  const requesterIds = [...new Set((leaveRequests ?? []).map((r) => r.profile_id))];
  const { data: requesterProfiles } = requesterIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", requesterIds)
    : { data: [] as { id: string; first_name: string; last_name: string }[] };

  const leaveRequestById = new Map((leaveRequests ?? []).map((r) => [r.id, r]));
  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const requesterNameById = new Map(
    (requesterProfiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]),
  );

  const proposals: MySubstitutionProposal[] = [];
  for (const slot of slots) {
    const lr = leaveRequestById.get(slot.leave_request_id);
    if (!lr) continue;

    const { data: impactRows } = await admin.rpc("report_leave_commitment_impact", {
      p_profile_id: lr.profile_id,
      p_start_date: lr.start_date,
      p_end_date: lr.end_date,
    });
    const commitments = (impactRows ?? [])
      .filter((row) => row.project_id === slot.project_id)
      .map((row) => ({
        kind: row.kind as "zaplanowany" | "niezaplanowany",
        title: row.title,
        windowStart: row.window_start,
        windowEnd: row.window_end,
      }));

    proposals.push({
      slotId: slot.id,
      leaveRequestId: slot.leave_request_id,
      projectId: slot.project_id,
      projectName: projectNameById.get(slot.project_id) ?? null,
      roleCode: slot.role_code,
      status: slot.status as LeaveSubstitutionSlot["status"],
      startDate: lr.start_date,
      endDate: lr.end_date,
      requesterName: requesterNameById.get(lr.profile_id) ?? null,
      commitments,
    });
  }

  return proposals;
}
