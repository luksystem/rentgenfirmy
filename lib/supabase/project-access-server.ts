import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, STAFF_ROLES, type UserProfile } from "@/lib/auth/types";
import { HttpError } from "@/lib/auth/http-error";
import { PROCESS_ROLE_LABELS_INSTRUMENTAL, type ProcessRoleCode } from "@/lib/process/types";
import { profileHasAllProjectsAccess, roleHasImplicitAllProjects } from "@/lib/project-access/rules";
import type { ProfileProjectAccessState } from "@/lib/project-access/types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

type AdminClient = SupabaseClient;

export async function fetchProfileProjectAccessServer(
  admin: AdminClient,
  profileId: string,
): Promise<ProfileProjectAccessState> {
  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("id, role, all_projects_access")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profileRow) {
    throw new Error("Nie znaleziono użytkownika.");
  }

  const role = profileRow.role as UserProfile["role"];
  if (roleHasImplicitAllProjects(role)) {
    return { allProjectsAccess: true, projectIds: [] };
  }

  const allProjectsAccess = profileRow.all_projects_access !== false;
  if (allProjectsAccess) {
    return { allProjectsAccess: true, projectIds: [] };
  }

  const { data: rows, error } = await admin
    .from("profile_project_access")
    .select("project_id")
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }

  return {
    allProjectsAccess: false,
    projectIds: (rows ?? []).map((row) => row.project_id as string),
  };
}

export async function saveProfileProjectAccessServer(
  admin: AdminClient,
  profileId: string,
  input: ProfileProjectAccessState,
) {
  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profileRow) {
    throw new Error("Nie znaleziono użytkownika.");
  }

  const role = profileRow.role as UserProfile["role"];
  if (roleHasImplicitAllProjects(role)) {
    return fetchProfileProjectAccessServer(admin, profileId);
  }

  const allProjectsAccess = input.allProjectsAccess !== false;
  const projectIds = allProjectsAccess ? [] : [...new Set(input.projectIds.filter(Boolean))];

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      all_projects_access: allProjectsAccess,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteError } = await admin
    .from("profile_project_access")
    .delete()
    .eq("profile_id", profileId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!allProjectsAccess && projectIds.length) {
    const { error: insertError } = await admin.from("profile_project_access").insert(
      projectIds.map((projectId) => ({
        profile_id: profileId,
        project_id: projectId,
      })),
    );
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return fetchProfileProjectAccessServer(admin, profileId);
}

export async function fetchAccessibleProjectIdsForUserServer(
  admin: AdminClient,
  profile: Pick<UserProfile, "id" | "role"> & { allProjectsAccess?: boolean | null },
): Promise<"all" | string[]> {
  if (profileHasAllProjectsAccess(profile)) {
    return "all";
  }

  const { data, error } = await admin
    .from("profile_project_access")
    .select("project_id")
    .eq("profile_id", profile.id);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.project_id as string);
}

export async function fetchProfilesWithProjectAccessServer(
  admin: AdminClient,
  projectId: string,
) {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .in("role", [...STAFF_ROLES])
    .order("last_name");
  if (error) {
    throw new Error(error.message);
  }

  const { data: accessRows, error: accessError } = await admin
    .from("profile_project_access")
    .select("profile_id")
    .eq("project_id", projectId);
  if (accessError) {
    throw new Error(accessError.message);
  }

  const explicitIds = new Set((accessRows ?? []).map((row) => row.profile_id as string));

  return (profiles ?? [])
    .map((row) => mapProfileRow(row))
    .filter((profile) => {
      if (profileHasAllProjectsAccess(profile)) {
        return true;
      }
      return explicitIds.has(profile.id);
    });
}

export type ProjectRoleFlags = {
  technicalLead: boolean;
  operationalLead: boolean;
  developer: boolean;
};

export type ProjectRoleSlotSource = "obsada" | "fallback" | "zastepstwo" | "przejecie_czerwone";

export type ProjectAssignedProfile = UserProfile &
  ProjectRoleFlags & {
    /**
     * Źródło slotu pod każdą z trzech grubszych flag (docs/08 D4/D7). Brak klucza = rola
     * nieobsadzona dla tej osoby. UI MUSI odróżnić source='fallback' od 'obsada' —
     * slot fallbackowy nie jest obsadą docelową (/docs/04 §2.2).
     */
    roleSources: Partial<Record<keyof ProjectRoleFlags, ProjectRoleSlotSource>>;
  };

/**
 * Mapowanie grubszych flag UI na kody slotów procesowych (docs/08 D4 — migracja z
 * profile_project_access.is_technical_lead/is_operational_lead/is_developer).
 * `project_role_slot` jest dziś źródłem prawdy — te trzy boolean-kolumny na
 * profile_project_access są nieużywane (zostają w schemacie do czasu usunięcia po weryfikacji, D7).
 */
const TECHNICAL_LEAD_CODES = ["koordynator_techniczny", "projektant"] as const;
const OPERATIONAL_LEAD_CODES = ["opiekun_projektu", "koordynator_operacyjny"] as const;
const DEVELOPER_CODES = ["wdrozeniowiec"] as const;

const PROJECT_ROLE_FIELD_TO_SLOT_CODES: Record<keyof ProjectRoleFlags, readonly string[]> = {
  technicalLead: TECHNICAL_LEAD_CODES,
  operationalLead: OPERATIONAL_LEAD_CODES,
  developer: DEVELOPER_CODES,
};

/** Osoby z dostępem do projektu wraz z rolami projektowymi (lider techniczny/operacyjny, programista). */
export async function fetchProjectAssignedProfilesServer(
  admin: AdminClient,
  projectId: string,
): Promise<ProjectAssignedProfile[]> {
  const profiles = await fetchProfilesWithProjectAccessServer(admin, projectId);

  const { data: slotRows, error } = await admin
    .from("project_role_slot")
    .select("user_id, role_code, source")
    .eq("project_id", projectId)
    .is("to_date", null);
  if (error) {
    throw new Error(error.message);
  }

  const slotsByProfileId = new Map<string, { roleCode: string; source: ProjectRoleSlotSource }[]>();
  (slotRows ?? []).forEach((row) => {
    const list = slotsByProfileId.get(row.user_id) ?? [];
    list.push({ roleCode: row.role_code, source: row.source as ProjectRoleSlotSource });
    slotsByProfileId.set(row.user_id, list);
  });

  function firstSource(profileId: string, codes: readonly string[]): ProjectRoleSlotSource | undefined {
    const slots = slotsByProfileId.get(profileId);
    return slots?.find((slot) => codes.includes(slot.roleCode))?.source;
  }

  return profiles.map((profile) => {
    const technicalSource = firstSource(profile.id, TECHNICAL_LEAD_CODES);
    const operationalSource = firstSource(profile.id, OPERATIONAL_LEAD_CODES);
    const developerSource = firstSource(profile.id, DEVELOPER_CODES);

    const roleSources: ProjectAssignedProfile["roleSources"] = {};
    if (technicalSource) roleSources.technicalLead = technicalSource;
    if (operationalSource) roleSources.operationalLead = operationalSource;
    if (developerSource) roleSources.developer = developerSource;

    return {
      ...profile,
      technicalLead: Boolean(technicalSource),
      operationalLead: Boolean(operationalSource),
      developer: Boolean(developerSource),
      roleSources,
    };
  });
}

/**
 * Ustawia/zdejmuje slot(y) roli procesowej dla pary (profil, projekt) — zapisuje do
 * project_role_slot, nie do profile_project_access (docs/08 D4/D7). `technicalLead` i
 * `operationalLead` mapują się na PARĘ kodów jednocześnie (patrz komentarz przy
 * PROJECT_ROLE_FIELD_TO_SLOT_CODES) — to zamierzona, gruboziarnista ścieżka zgodna z
 * istniejącym UI (trzy checkboxy); niezależne przypisywanie poszczególnych 7 ról
 * wymaga osobnego, bardziej granularnego ekranu, poza zakresem tej fazy.
 *
 * Rzuca błąd, jeśli slot jest już aktywnie obsadzony przez KOGOŚ INNEGO — w
 * szczególności dla opiekun_projektu, gdzie baza ma twardy constraint "dokładnie jeden"
 * (/docs/04 §2.1). To zmiana zachowania względem starych booleanów, które pozwalały
 * zaznaczyć wielu ludzi jednocześnie bez żadnej walidacji.
 */
export async function setProjectRoleFlagServer(
  admin: AdminClient,
  input: { projectId: string; profileId: string; field: keyof ProjectRoleFlags; value: boolean },
) {
  const roleCodes = PROJECT_ROLE_FIELD_TO_SLOT_CODES[input.field];
  const today = new Date().toISOString().slice(0, 10);

  if (input.value) {
    for (const roleCode of roleCodes) {
      const { data: existing, error: fetchError } = await admin
        .from("project_role_slot")
        .select("id, user_id")
        .eq("project_id", input.projectId)
        .eq("role_code", roleCode)
        .is("to_date", null)
        .maybeSingle();
      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (existing) {
        if (existing.user_id === input.profileId) {
          continue;
        }

        const { data: holderRow } = await admin
          .from("profiles")
          .select("*")
          .eq("id", existing.user_id)
          .maybeSingle();
        const holderName = holderRow ? getUserDisplayName(mapProfileRow(holderRow)) : "inna osoba";
        const roleLabelInstrumental =
          PROCESS_ROLE_LABELS_INSTRUMENTAL[roleCode as ProcessRoleCode] ?? roleCode;

        throw new HttpError(
          409,
          `${roleLabelInstrumental} jest już ${holderName}. Zmień obsadę albo ustaw zastępstwo.`,
        );
      }

      const { error: insertError } = await admin.from("project_role_slot").insert({
        project_id: input.projectId,
        role_code: roleCode,
        user_id: input.profileId,
        source: "obsada",
      });
      if (insertError) {
        throw new Error(insertError.message);
      }
    }
    return;
  }

  for (const roleCode of roleCodes) {
    const { error } = await admin
      .from("project_role_slot")
      .update({ to_date: today })
      .eq("project_id", input.projectId)
      .eq("role_code", roleCode)
      .eq("user_id", input.profileId)
      .is("to_date", null);
    if (error) {
      throw new Error(error.message);
    }
  }
}

/** Odbiorcy powiadomień projektowych (akceptacje itp.) — tylko liderzy i programista, nie cały zespół. */
export async function fetchProjectNotificationRecipientsServer(
  admin: AdminClient,
  projectId: string,
): Promise<UserProfile[]> {
  const { data: slotRows, error } = await admin
    .from("project_role_slot")
    .select("user_id")
    .eq("project_id", projectId)
    .is("to_date", null)
    .in("role_code", [...TECHNICAL_LEAD_CODES, ...OPERATIONAL_LEAD_CODES, ...DEVELOPER_CODES]);
  if (error) {
    throw new Error(error.message);
  }

  const profileIds = [...new Set((slotRows ?? []).map((row) => row.user_id as string))];
  if (!profileIds.length) {
    return [];
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .in("id", profileIds);
  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return (profiles ?? []).map((row) => mapProfileRow(row));
}

export async function assertUserCanAccessProjectServer(
  admin: AdminClient,
  profile: Pick<UserProfile, "id" | "role"> & { allProjectsAccess?: boolean | null },
  projectId: string | null | undefined,
) {
  if (!projectId) {
    return;
  }
  const allowed = await fetchAccessibleProjectIdsForUserServer(admin, profile);
  if (allowed === "all") {
    return;
  }
  if (!allowed.includes(projectId)) {
    throw new Error("Brak dostępu do tego projektu.");
  }
}

export async function assertAssigneeHasProjectAccessServer(
  admin: AdminClient,
  assigneeId: string | null | undefined,
  projectId: string | null | undefined,
) {
  if (!projectId || !assigneeId) {
    return;
  }
  const { data, error } = await admin.from("profiles").select("*").eq("id", assigneeId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Nie znaleziono użytkownika przypisanego.");
  }
  await assertUserCanAccessProjectServer(admin, mapProfileRow(data), projectId);
}
