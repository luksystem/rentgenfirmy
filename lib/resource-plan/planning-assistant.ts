// Asystent planowania — z ilości + terminu + szablonu układa propozycję planu (kto/kiedy),
// dopasowując ludzi po kompetencjach wymaganych przez szablon i sprawdzając ich obłożenie
// z już istniejących elementów planu. Manager dostaje listę propozycji do ręcznej korekty i
// zatwierdzenia — asystent NIGDY nie zapisuje nic sam, tylko układa draft w pamięci przeglądarki.

import { getUserDisplayName } from "@/lib/auth/types";
import type { UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import { readPlanItemTemplateMetadata } from "@/lib/resource-plan/plan-item-template";
import type { ResourcePlanCompetencyRequirement, ResourcePlanItem } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import { isWeekend, itemDayKeys, itemHours, startOfDay, toDateKey } from "@/lib/resource-plan/date-utils";

export type PlanningMatchQuality = "full" | "partial" | "none";

export type PlanningAssistantProposalItem = {
  key: string;
  unitIndex: number;
  title: string;
  startAt: string;
  endAt: string;
  plannedHours: number;
  assigneeId: string | null;
  assigneeName: string;
  matchQuality: PlanningMatchQuality;
  missingCompetencyNames: string[];
};

export type PlanningAssistantProposal = {
  items: PlanningAssistantProposalItem[];
  deadlineAtRisk: boolean;
  warnings: string[];
};

export type PlanningAssistantInput = {
  templateItem: DictionaryItem;
  quantity: number;
  deadlineIso: string;
  startFromIso?: string;
  titlePrefix?: string;
};

function competencyRank(
  levelItemId: string | null,
  competencyLevelOptions: DictionaryItem[],
): number {
  if (!levelItemId) return 0;
  return competencyLevelOptions.find((option) => option.id === levelItemId)?.sortOrder ?? 0;
}

function matchesRequirement(
  requirement: ResourcePlanCompetencyRequirement,
  profile: UserResourceProfile | undefined,
  competencyLevelOptions: DictionaryItem[],
): boolean {
  const owned = profile?.competencies.find((c) => c.competencyItemId === requirement.competencyItemId);
  if (!owned) return false;
  if (!requirement.minLevelItemId) return true;
  return competencyRank(owned.levelItemId, competencyLevelOptions) >= competencyRank(requirement.minLevelItemId, competencyLevelOptions);
}

type Candidate = {
  profile: UserProfile;
  matchQuality: PlanningMatchQuality;
  missingCompetencyNames: string[];
  /** Kursor "następnego wolnego dnia" tej osoby — przesuwa się w miarę przydzielania jej kolejnych sztuk. */
  cursor: Date;
  /** Godziny już zajęte per dzień (z istniejących elementów planu, gdzie osoba jest odpowiedzialna). */
  bookedHoursByDate: Map<string, number>;
};

/** Buduje mapę już zarezerwowanych godzin (z istniejących elementów planu) per dzień dla danej osoby. */
function buildBookedHoursByDate(userId: string, existingItems: ResourcePlanItem[]): Map<string, number> {
  const map = new Map<string, number>();
  existingItems.forEach((item) => {
    if (item.assigneeId !== userId) return;
    const days = itemDayKeys(item);
    const hoursPerDay = itemHours(item) / days.length;
    days.forEach((dateKey) => {
      map.set(dateKey, (map.get(dateKey) ?? 0) + hoursPerDay);
    });
  });
  return map;
}

/** Znajduje kolejny blok dni roboczych dla kandydata, w którym zmieści się `hoursNeeded` godzin
 *  pracy (z uwzględnieniem limitu dziennego i już zarezerwowanych godzin), zaczynając od
 *  `candidate.cursor`. Przesuwa kursor kandydata za sobą. */
function scheduleUnitForCandidate(
  candidate: Candidate,
  hoursNeeded: number,
  dailyHoursLimit: number,
  deadline: Date,
): { startAt: string; endAt: string; withinDeadline: boolean } | null {
  let remaining = hoursNeeded;
  let start: Date | null = null;
  let last: Date | null = null;
  let cursor = new Date(candidate.cursor);
  let guard = 0;

  while (remaining > 0.001 && guard < 400) {
    guard += 1;
    if (!isWeekend(cursor)) {
      const dateKey = toDateKey(cursor);
      const bookedAlready = candidate.bookedHoursByDate.get(dateKey) ?? 0;
      const freeToday = Math.max(0, dailyHoursLimit - bookedAlready);
      if (freeToday > 0) {
        if (!start) start = new Date(cursor);
        last = new Date(cursor);
        const used = Math.min(freeToday, remaining);
        candidate.bookedHoursByDate.set(dateKey, bookedAlready + used);
        remaining -= used;
      }
    }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!start || !last) return null;
  candidate.cursor = cursor;

  const startAt = `${toDateKey(start)}T08:00:00`;
  const endAt = `${toDateKey(last)}T16:00:00`;
  return { startAt, endAt, withinDeadline: last <= deadline };
}

export function computePlanningAssistantProposal(params: {
  input: PlanningAssistantInput;
  teamProfiles: UserProfile[];
  resourceProfilesById: Record<string, UserResourceProfile>;
  existingItems: ResourcePlanItem[];
  competencyOptions: DictionaryItem[];
  competencyLevelOptions: DictionaryItem[];
}): PlanningAssistantProposal {
  const { input, teamProfiles, resourceProfilesById, existingItems, competencyOptions, competencyLevelOptions } = params;

  const meta = readPlanItemTemplateMetadata(input.templateItem.metadata);
  const hoursPerUnit = meta.plannedHours ?? 8;
  const requiredCompetencies = meta.requiredCompetencies;
  const startFrom = startOfDay(input.startFromIso ? new Date(input.startFromIso) : new Date());
  const deadline = startOfDay(new Date(input.deadlineIso));
  const titlePrefix = input.titlePrefix?.trim() || input.templateItem.name;

  const competencyName = (id: string) => competencyOptions.find((c) => c.id === id)?.name ?? "Nieznana kompetencja";

  const candidates: Candidate[] = teamProfiles
    .filter((profile) => profile.isAvailableForPlanning !== false)
    .map((profile) => {
      const resourceProfile = resourceProfilesById[profile.id];
      const missing = requiredCompetencies.filter(
        (requirement) => !matchesRequirement(requirement, resourceProfile, competencyLevelOptions),
      );
      const matchQuality: PlanningMatchQuality =
        requiredCompetencies.length === 0
          ? "full"
          : missing.length === 0
            ? "full"
            : missing.length < requiredCompetencies.length
              ? "partial"
              : "none";
      return {
        profile,
        matchQuality,
        missingCompetencyNames: missing.map((requirement) => competencyName(requirement.competencyItemId)),
        cursor: new Date(startFrom),
        bookedHoursByDate: buildBookedHoursByDate(profile.id, existingItems),
      };
    })
    // Wykluczamy zupełny brak dopasowania, chyba że NIKT nie ma choćby częściowego — wtedy
    // lepiej pokazać propozycję z ostrzeżeniem niż w ogóle nie zaproponować wykonawcy.
    .filter((candidate, _index, all) => {
      if (candidate.matchQuality !== "none") return true;
      return !all.some((other) => other.matchQuality !== "none");
    })
    .sort((a, b) => {
      const rank = { full: 0, partial: 1, none: 2 } as const;
      return rank[a.matchQuality] - rank[b.matchQuality];
    });

  const warnings: string[] = [];
  if (candidates.length === 0) {
    warnings.push(
      "Brak dostępnych osób do planowania (sprawdź dostępność w profilach użytkowników) — nie udało się ułożyć propozycji.",
    );
    return { items: [], deadlineAtRisk: true, warnings };
  }

  const items: PlanningAssistantProposalItem[] = [];
  let deadlineAtRisk = false;

  for (let unitIndex = 1; unitIndex <= input.quantity; unitIndex += 1) {
    const candidate = candidates[(unitIndex - 1) % candidates.length];
    const dailyHoursLimit = candidate.profile.dailyHoursLimit ?? 8;
    const scheduled = scheduleUnitForCandidate(candidate, hoursPerUnit, dailyHoursLimit, deadline);

    if (!scheduled) {
      deadlineAtRisk = true;
      warnings.push(`Nie udało się zaplanować sztuki ${unitIndex} — brak wolnych dni roboczych w rozsądnym horyzoncie.`);
      continue;
    }
    if (!scheduled.withinDeadline) {
      deadlineAtRisk = true;
    }

    items.push({
      key: `${input.templateItem.id}-${unitIndex}`,
      unitIndex,
      title: `${titlePrefix} ${unitIndex}/${input.quantity}`,
      startAt: scheduled.startAt,
      endAt: scheduled.endAt,
      plannedHours: hoursPerUnit,
      assigneeId: candidate.profile.id,
      assigneeName: getUserDisplayName(candidate.profile),
      matchQuality: candidate.matchQuality,
      missingCompetencyNames: candidate.missingCompetencyNames,
    });
  }

  if (deadlineAtRisk) {
    warnings.push(
      `Przy obecnej obsadzie i obłożeniu termin ${input.deadlineIso} jest zagrożony — część sztuk wypada po terminie.`,
    );
  }
  if (candidates.some((c) => c.matchQuality !== "full")) {
    warnings.push("Część proponowanych osób nie ma pełnych wymaganych kompetencji — sprawdź propozycje oznaczone ostrzeżeniem.");
  }

  return { items, deadlineAtRisk, warnings };
}
