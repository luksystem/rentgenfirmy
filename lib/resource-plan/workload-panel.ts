// Panel obłożenia pod Ganttem — dzienne osobodniówki i wykorzystanie zespołów w widocznym oknie.
// Liczone po stronie klienta z danych już wczytanych przez `useResourcePlanStore().ensureRange`,
// tym samym wzorcem co `dashboard-metrics.ts` (patrz komentarz na górze tamtego pliku).

import type { UserProfile } from "@/lib/auth/types";
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
};

export type ResourcePlanTeamUtilizationRow = {
  teamId: string;
  teamName: string;
  color: string | null;
  personDays: number;
  memberCount: number;
  /** Osobodniówki dostępne w oknie = liczba członków zespołu × liczba dni roboczych okna. */
  capacityPersonDays: number;
  /** null gdy zespół nie ma żadnych aktywnych członków (brak sensownego mianownika). */
  utilizationPercent: number | null;
};

export type ResourcePlanWorkloadPanelData = {
  dailyLoad: ResourcePlanDailyLoadRow[];
  totalPersonDays: number;
  teamUtilization: ResourcePlanTeamUtilizationRow[];
  /** Zespół "Bez zespołu" — osoby zaangażowane w elementy planu, ale bez przypisania do żadnego zespołu. */
  unassignedTeamPersonDays: number;
};

export function computeResourcePlanWorkloadPanel(params: {
  /** Elementy planu widoczne w oknie (nakładające się z [from, to)) — jak w Gantcie/liście. */
  items: ResourcePlanItem[];
  from: string;
  to: string;
  teamProfiles: UserProfile[];
  resourceProfilesById: Record<string, UserResourceProfile>;
  teamOptions: DictionaryItem[];
}): ResourcePlanWorkloadPanelData {
  const { items, from, to, teamProfiles, resourceProfilesById, teamOptions } = params;

  // `to` (jak w Gantcie/liście) to koniec ostatniego widocznego dnia (periodEnd - 1ms), więc jest
  // INKLUZYWNY — po wyzerowaniu godziny wciąż wskazuje dzień, który ma być objęty oknem, stąd
  // pętle poniżej używają `<=`, nie `<`.
  const windowStart = new Date(from);
  windowStart.setHours(0, 0, 0, 0);
  const windowEndInclusive = new Date(to);
  windowEndInclusive.setHours(0, 0, 0, 0);

  // Dni robocze widocznego okna — mianownik "pojemności" zespołu (bez świąt, jak w dashboard-metrics.ts).
  const workingDays: Date[] = [];
  for (const cursor = new Date(windowStart); cursor <= windowEndInclusive; cursor.setDate(cursor.getDate() + 1)) {
    if (!isWeekend(cursor)) workingDays.push(new Date(cursor));
  }

  // Osobodniówki per dzień (klucz) i per osoba+dzień (do przypisania na zespoły).
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
    dailyLoad.push({
      dateIso: dateKey,
      date: new Date(cursor),
      personDays: Math.round((personDaysByDateKey.get(dateKey) ?? 0) * 100) / 100,
    });
  }

  const totalPersonDays = dailyLoad.reduce((sum, row) => sum + row.personDays, 0);

  // Suma osobodniówek per osoba (całe okno) — do przypisania na zespoły.
  const personDaysByUser = new Map<string, number>();
  personDaysByUserAndDate.forEach((value, key) => {
    const userId = key.split("|")[0];
    personDaysByUser.set(userId, (personDaysByUser.get(userId) ?? 0) + value);
  });

  const memberCountByTeam = new Map<string, number>();
  teamProfiles.forEach((profile) => {
    const teams = resourceProfilesById[profile.id]?.teams ?? [];
    teams.forEach((membership) => {
      memberCountByTeam.set(membership.teamItemId, (memberCountByTeam.get(membership.teamItemId) ?? 0) + 1);
    });
  });

  const personDaysByTeam = new Map<string, number>();
  let unassignedTeamPersonDays = 0;
  personDaysByUser.forEach((personDays, userId) => {
    const teams = resourceProfilesById[userId]?.teams ?? [];
    if (teams.length === 0) {
      unassignedTeamPersonDays += personDays;
      return;
    }
    // Osoba w kilku zespołach — jej osobodniówki liczą się w każdym z nich (obraz "kto ile pracuje
    // w kontekście danego zespołu"), zamiast dzielić je między zespoły.
    teams.forEach((membership) => {
      personDaysByTeam.set(membership.teamItemId, (personDaysByTeam.get(membership.teamItemId) ?? 0) + personDays);
    });
  });

  const teamUtilization: ResourcePlanTeamUtilizationRow[] = teamOptions
    .map((team) => {
      const memberCount = memberCountByTeam.get(team.id) ?? 0;
      const capacityPersonDays = memberCount * workingDays.length;
      const personDays = Math.round((personDaysByTeam.get(team.id) ?? 0) * 100) / 100;
      return {
        teamId: team.id,
        teamName: team.name,
        color: team.color ?? null,
        personDays,
        memberCount,
        capacityPersonDays,
        utilizationPercent: capacityPersonDays > 0 ? Math.round((personDays / capacityPersonDays) * 1000) / 10 : null,
      };
    })
    .filter((row) => row.memberCount > 0 || row.personDays > 0)
    .sort((a, b) => (b.utilizationPercent ?? -1) - (a.utilizationPercent ?? -1));

  return {
    dailyLoad,
    totalPersonDays: Math.round(totalPersonDays * 100) / 100,
    teamUtilization,
    unassignedTeamPersonDays: Math.round(unassignedTeamPersonDays * 100) / 100,
  };
}

export function formatWorkloadDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(date);
}
