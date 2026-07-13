// Etap 2 (Plan Zasobów) — role operacyjne, kompetencje, zespoły, certyfikaty, nieobecności.
// Rozszerza istniejące profiles (nie tworzymy osobnego modelu pracownika).
import { getSupabase } from "@/lib/supabase/client";
import type {
  UserAbsenceInsert,
  UserAbsenceRow,
  UserAbsenceUpdate,
  UserCertificateInsert,
  UserCertificateRow,
  UserCertificateUpdate,
  UserCompetencyRow,
  UserOperationalRoleRow,
  UserTeamRow,
} from "@/lib/supabase/database.types";
import type {
  UserAbsence,
  UserAbsenceInput,
  UserCertificate,
  UserCertificateInput,
  UserCompetency,
  UserResourceProfile,
} from "@/lib/resource-plan/user-resource-types";

function rowToCompetency(row: UserCompetencyRow): UserCompetency {
  return {
    id: row.id,
    userId: row.user_id,
    competencyItemId: row.competency_item_id,
    levelItemId: row.level_item_id,
    notes: row.notes,
  };
}

function rowToCertificate(row: UserCertificateRow): UserCertificate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    fileUrl: row.file_url,
    notes: row.notes,
  };
}

function rowToAbsence(row: UserAbsenceRow): UserAbsence {
  return {
    id: row.id,
    userId: row.user_id,
    absenceTypeItemId: row.absence_type_item_id,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note,
    status: row.status as UserAbsence["status"],
  };
}

/** Batch fetch — jedno zapytanie per tabela dla wielu użytkowników (bez N+1). */
export async function fetchUserResourceProfilesBatch(userIds: string[]): Promise<Record<string, UserResourceProfile>> {
  if (userIds.length === 0) return {};
  const supabase = getSupabase();

  const [rolesResult, competenciesResult, teamsResult, certificatesResult, absencesResult] = await Promise.all([
    supabase.from("user_operational_roles").select("*").in("user_id", userIds),
    supabase.from("user_competencies").select("*").in("user_id", userIds),
    supabase.from("user_teams").select("*").in("user_id", userIds),
    supabase.from("user_certificates").select("*").in("user_id", userIds),
    supabase.from("user_absences").select("*").in("user_id", userIds).order("start_date", { ascending: true }),
  ]);

  for (const result of [rolesResult, competenciesResult, teamsResult, certificatesResult, absencesResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const byUser: Record<string, UserResourceProfile> = {};
  for (const userId of userIds) {
    byUser[userId] = { roleItemIds: [], competencies: [], teams: [], certificates: [], absences: [] };
  }

  (rolesResult.data ?? []).forEach((row: UserOperationalRoleRow) => {
    byUser[row.user_id]?.roleItemIds.push(row.role_item_id);
  });
  (competenciesResult.data ?? []).forEach((row: UserCompetencyRow) => {
    byUser[row.user_id]?.competencies.push(rowToCompetency(row));
  });
  (teamsResult.data ?? []).forEach((row: UserTeamRow) => {
    byUser[row.user_id]?.teams.push({ teamItemId: row.team_item_id, isLead: row.is_lead });
  });
  (certificatesResult.data ?? []).forEach((row: UserCertificateRow) => {
    byUser[row.user_id]?.certificates.push(rowToCertificate(row));
  });
  (absencesResult.data ?? []).forEach((row: UserAbsenceRow) => {
    byUser[row.user_id]?.absences.push(rowToAbsence(row));
  });

  return byUser;
}

export async function fetchUserResourceProfile(userId: string): Promise<UserResourceProfile> {
  const batch = await fetchUserResourceProfilesBatch([userId]);
  return batch[userId] ?? { roleItemIds: [], competencies: [], teams: [], certificates: [], absences: [] };
}

export async function fetchProfileIdsByOperationalRole(roleItemId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_operational_roles")
    .select("user_id")
    .eq("role_item_id", roleItemId);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.user_id as string))];
}

export async function setUserOperationalRoles(userId: string, roleItemIds: string[]): Promise<void> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase.from("user_operational_roles").delete().eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);
  if (roleItemIds.length === 0) return;
  const { error } = await supabase
    .from("user_operational_roles")
    .insert(roleItemIds.map((roleItemId) => ({ user_id: userId, role_item_id: roleItemId })));
  if (error) throw new Error(error.message);
}

export async function setUserTeams(
  userId: string,
  teams: { teamItemId: string; isLead: boolean }[],
): Promise<void> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase.from("user_teams").delete().eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);
  if (teams.length === 0) return;
  const { error } = await supabase
    .from("user_teams")
    .insert(teams.map((team) => ({ user_id: userId, team_item_id: team.teamItemId, is_lead: team.isLead })));
  if (error) throw new Error(error.message);
}

export async function upsertUserCompetency(
  userId: string,
  competencyItemId: string,
  levelItemId: string | null,
  notes = "",
): Promise<UserCompetency> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_competencies")
    .upsert(
      { user_id: userId, competency_item_id: competencyItemId, level_item_id: levelItemId, notes },
      { onConflict: "user_id,competency_item_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToCompetency(data);
}

export async function removeUserCompetency(userId: string, competencyItemId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("user_competencies")
    .delete()
    .eq("user_id", userId)
    .eq("competency_item_id", competencyItemId);
  if (error) throw new Error(error.message);
}

export async function addUserCertificate(userId: string, input: UserCertificateInput): Promise<UserCertificate> {
  const supabase = getSupabase();
  const payload: UserCertificateInsert = {
    user_id: userId,
    name: input.name.trim(),
    issued_at: input.issuedAt,
    expires_at: input.expiresAt,
    file_url: input.fileUrl,
    notes: input.notes ?? "",
  };
  const { data, error } = await supabase.from("user_certificates").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return rowToCertificate(data);
}

export async function updateUserCertificate(id: string, input: Partial<UserCertificateInput>): Promise<UserCertificate> {
  const supabase = getSupabase();
  const payload: UserCertificateUpdate = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.issuedAt !== undefined) payload.issued_at = input.issuedAt;
  if (input.expiresAt !== undefined) payload.expires_at = input.expiresAt;
  if (input.fileUrl !== undefined) payload.file_url = input.fileUrl;
  if (input.notes !== undefined) payload.notes = input.notes;
  const { data, error } = await supabase.from("user_certificates").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return rowToCertificate(data);
}

export async function deleteUserCertificate(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("user_certificates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addUserAbsence(userId: string, input: UserAbsenceInput): Promise<UserAbsence> {
  const supabase = getSupabase();
  const payload: UserAbsenceInsert = {
    user_id: userId,
    absence_type_item_id: input.absenceTypeItemId,
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note ?? "",
    status: input.status ?? "confirmed",
  };
  const { data, error } = await supabase.from("user_absences").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return rowToAbsence(data);
}

export async function updateUserAbsence(id: string, input: Partial<UserAbsenceInput>): Promise<UserAbsence> {
  const supabase = getSupabase();
  const payload: UserAbsenceUpdate = { updated_at: new Date().toISOString() };
  if (input.absenceTypeItemId !== undefined) payload.absence_type_item_id = input.absenceTypeItemId;
  if (input.startDate !== undefined) payload.start_date = input.startDate;
  if (input.endDate !== undefined) payload.end_date = input.endDate;
  if (input.note !== undefined) payload.note = input.note;
  if (input.status !== undefined) payload.status = input.status;
  const { data, error } = await supabase.from("user_absences").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return rowToAbsence(data);
}

export async function deleteUserAbsence(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("user_absences").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Wszystkie nieobecności w zakresie dat (do walidacji konfliktów i dashboardu). */
export async function fetchAbsencesInRange(startDate: string, endDate: string): Promise<UserAbsence[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_absences")
    .select("*")
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .neq("status", "cancelled");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAbsence);
}
