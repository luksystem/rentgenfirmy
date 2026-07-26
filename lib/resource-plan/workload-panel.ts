// Panel obłożenia pod Ganttem — dzienne osobodniówki, wykorzystanie zespołów/ról/osób w widocznym
// oknie. Liczone po stronie klienta z danych już wczytanych przez `useResourcePlanStore().ensureRange`,
// tym samym wzorcem co `dashboard-metrics.ts` (patrz komentarz na górze tamtego pliku).

import type { UserProfile } from "@/lib/auth/types";
import { getUserDisplayName } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import { userHoursInItem } from "@/lib/resource-plan/participant-contribution";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import { isWeekend, itemDayKeys, toDateKey } from "@/lib/resource-plan/date-utils";

/** Standardowy dzień roboczy przyjęty do przeliczenia godzin na osobodniówki (8h = 1 osobodniówka). */
const HOURS_PER_PERSON_DAY = 8;

export type ResourcePlanDailyLoadRow = {
  dateIso: string;
  date: Date;
  personDays: number;
  /** Pojemność dnia = liczba dostępnych do planowania osób (przybliżenie, jak reszta panelu — nie
   *  uwzględnia nieobecności). Stała dla każdego dnia okna, także weekendów (żeby nie dzielić przez 0). */
  capacityPersonDays: number;
  utilizationPercent: number | null;
};

export type ResourcePlanGroupUtilizationRow = {
  groupId: string;
  groupName: string;
  color: string | null;
  personDays: number;
  memberCount: number;
  /** Osobodniówki dostępne w oknie = liczba osób w grupie × liczba dni roboczych okna. */
  capacityPersonDays: number;
  /** null gdy grupa nie ma żadnych aktywnych członków (brak sensownego mianownika). */
  utilizationPercent: number | null;
};

export type ResourcePlanPersonUtilizationRow = {
  userId: string;
  name: string;
  personDays: number;
  /** Osobodniówki dostępne w oknie = liczba dni roboczych okna (1 osoba × dni robocze). */
  capacityPersonDays: number;
  utilizationPercent: number | null;
};

export type ResourcePlanWorkloadPanelData = {
  dailyLoad: ResourcePlanDailyLoadRow[];
  totalPersonDays: number;
  teamUtilization: ResourcePlanGroupUtilizationRow[];
  roleUtilization: ResourcePlanGroupUtilizationRow[];
  personUtilization: ResourcePlanPersonUtilizationRow[];
  /** Zespół "Bez zespołu" — osoby zaangażowane w elementy planu, ale bez przypisania do żadnego zespołu. */
  unassignedTeamPersonDays: number;
  /** "Bez roli" — osoby zaangażowane w elementy planu, ale bez żadnej roli operacyjnej. */
  unassignedRolePersonDays: number;
};

function groupUtilization(params: {
  options: DictionaryItem[];
  memberIdsByGroup: (userId: string, profile: UserResourceProfile | undefined) => string[];
  personDaysByUser: Map<string, number>;
  teamProfiles: UserProfile[];
  resourceProfilesById: Record<string, UserResourceProfile>;
  workingDaysCount: number;
}): { rows: ResourcePlanGroupUtilizationRow[]; unassignedPersonDays: number } {
  const { options, memberIdsByGroup, personDaysByUser, teamProfiles, resourceProfilesById, workingDaysCount } = params;

  const memberCountByGroup = new Map<string, number>();
  teamProfiles.forEach((profile) => {
    memberIdsByGroup(profile.id, resourceProfilesById[profile.id]).forEach((groupId) => {
      memberCountByGroup.set(groupId, (memberCountByGroup.get(groupId) ?? 0) + 1);
    });
  });

  const personDaysByGroup = new Map<string, number>();
  let unassignedPersonDays = 0;
  personDaysByUser.forEach((personDays, userId) => {
    const groupIds = memberIdsByGroup(userId, resourceProfilesById[userId]);
    if (groupIds.length === 0) {
      unassignedPersonDays += personDays;
      return;
    }
    // Osoba w kilku grupach (np. 2 zespoły) — jej osobodniówki liczą się w każdej z nich (obraz
    // "kto ile pracuje w kontekście danej grupy"), zamiast dzielić je między grupy.
    groupIds.forEach((groupId) => {
      personDaysByGroup.set(groupId, (personDaysByGroup.get(groupId) ?? 0) + personDays);
    });
  });

  const rows: ResourcePlanGroupUtilizationRow[] = options
    .map((option) => {
      const memberCount = memberCountByGroup.get(option.id) ?? 0;
      const capacityPersonDays = memberCount * workingDaysCount;
      const personDays = Math.round((personDaysByGroup.get(option.id) ?? 0) * 100) / 100;
      return {
        groupId: option.id,
        groupName: option.name,
        color: option.color ?? null,
        personDays,
        memberCount,
        capacityPersonDays,
        utilizationPercent: capacityPersonDays > 0 ? Math.round((personDays / capacityPersonDays) * 1000) / 10 : null,
      };
    })
    .filter((row) => row.memberCount > 0 || row.personDays > 0)
    .sort((a, b) => (b.utilizationPercent ?? -1) - (a.utilizationPercent ?? -1));

  return { rows, unassignedPersonDays: Math.round(unassignedPersonDays * 100) / 100 };
}

export function computeResourcePlanWorkloadPanel(params: {
  /** Elementy planu widoczne w oknie (nakładające się z [from, to)) — jak w Gantcie/liście. */
  items: ResourcePlanItem[];
  from: string;
  to: string;
  teamProfiles: UserProfile[];
  resourceProfilesById: Record<string, UserResourceProfile>;
  teamOptions: DictionaryItem[];
  roleOptions: DictionaryItem[];
}): ResourcePlanWorkloadPanelData {
  const { items, from, to, teamProfiles, resourceProfilesById, teamOptions, roleOptions } = params;

  // `to` (jak w Gantcie/liście) to koniec ostatniego widocznego dnia (periodEnd - 1ms), więc jest
  // INKLUZYWNY — po wyzerowaniu godziny wciąż wskazuje dzień, który ma być objęty oknem, stąd
  // pętle poniżej używają `<=`, nie `<`.
  const windowStart = new Date(from);
  windowStart.setHours(0, 0, 0, 0);
  const windowEndInclusive = new Date(to);
  windowEndInclusive.setHours(0, 0, 0, 0);

  // Dni robocze widocznego okna — mianownik "pojemności" grup (bez świąt, jak w dashboard-metrics.ts).
  const workingDays: Date[] = [];
  for (const cursor = new Date(windowStart); cursor <= windowEndInclusive; cursor.setDate(cursor.getDate() + 1)) {
    if (!isWeekend(cursor)) workingDays.push(new Date(cursor));
  }

  // Liczba osób dostępnych do planowania — pojemność dnia w podsumowaniu dziennym.
  const availablePeopleCount = teamProfiles.filter((profile) => profile.isAvailableForPlanning !== false).length;

  // Osobodniówki per dzień (klucz) i per osoba+dzień (do przypisania na zespoły/role).
  const personDaysByDateKey = new Map<string, number>();
  const personDaysByUserAndDate = new Map<string, number>(); // klucz: `${userId}|${dateKey}`

  items.forEach((item) => {
    const dayKeys = itemDayKeys(item);
    const involved = new Set<string>();
    if (item.assigneeId) involved.add(item.assigneeId);
    item.participants.forEach((participant) => involved.add(participant.userId));

    involved.forEach((userId) => {
      const totalHoursForUser = userHoursInItem(item, userId);
      const hoursPerDay = totalHoursForUser / dayKeys.length;
      const personDaysPerDay = hoursPerDay / HOURS_PER_PERSON_DAY;

      dayKeys.forEach((dateKey) => {
        const dayDate = new Date(dateKey);
        if (dayDate < windowStart || dayDate > windowEndInclusive) return;

        personDaysByDateKey.set(dateKey, (personDaysByDateKey.get(dateKey) ?? 0) + personDaysPerDay);
        const userKey = `${userId}|${dateKey}`;
        personDaysByUserAndDate.set(userKey, (personDaysByUserAndDate.get(userKey) ?? 0) + personDaysPerDay);
      });
    });
  });

  const dailyLoad: ResourcePlanDailyLoadRow[] = [];
  for (const cursor = new Date(windowStart); cursor <= windowEndInclusive; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = toDateKey(cursor);
    const personDays = Math.round((personDaysByDateKey.get(dateKey) ?? 0) * 100) / 100;
    dailyLoad.push({
      dateIso: dateKey,
      date: new Date(cursor),
      personDays,
      capacityPersonDays: availablePeopleCount,
      utilizationPercent: availablePeopleCount > 0 ? Math.round((personDays / availablePeopleCount) * 1000) / 10 : null,
    });
  }

  const totalPersonDays = dailyLoad.reduce((sum, row) => sum + row.personDays, 0);

  // Suma osobodniówek per osoba (całe okno) — do przypisania na zespoły/role i do widoku per osoba.
  const personDaysByUser = new Map<string, number>();
  personDaysByUserAndDate.forEach((value, key) => {
    const userId = key.split("|")[0];
    personDaysByUser.set(userId, (personDaysByUser.get(userId) ?? 0) + value);
  });

  const { rows: teamUtilization, unassignedPersonDays: unassignedTeamPersonDays } = groupUtilization({
    options: teamOptions,
    memberIdsByGroup: (_userId, profile) => (profile?.teams ?? []).map((membership) => membership.teamItemId),
    personDaysByUser,
    teamProfiles,
    resourceProfilesById,
    workingDaysCount: workingDays.length,
  });

  const { rows: roleUtilization, unassignedPersonDays: unassignedRolePersonDays } = groupUtilization({
    options: roleOptions,
    memberIdsByGroup: (_userId, profile) => profile?.roleItemIds ?? [],
    personDaysByUser,
    teamProfiles,
    resourceProfilesById,
    workingDaysCount: workingDays.length,
  });

  const profileById = new Map(teamProfiles.map((profile) => [profile.id, profile]));
  const personUtilization: ResourcePlanPersonUtilizationRow[] = [...personDaysByUser.entries()]
    .map(([userId, personDaysRaw]) => {
      const profile = profileById.get(userId);
      const personDays = Math.round(personDaysRaw * 100) / 100;
      const capacityPersonDays = workingDays.length;
      return {
        userId,
        name: profile ? getUserDisplayName(profile) : "Nieznana osoba",
        personDays,
        capacityPersonDays,
        utilizationPercent: capacityPersonDays > 0 ? Math.round((personDays / capacityPersonDays) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => (b.utilizationPercent ?? -1) - (a.utilizationPercent ?? -1));

  return {
    dailyLoad,
    totalPersonDays: Math.round(totalPersonDays * 100) / 100,
    teamUtilization,
    roleUtilization,
    personUtilization,
    unassignedTeamPersonDays,
    unassignedRolePersonDays,
  };
}

export function formatWorkloadDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(date);
}
