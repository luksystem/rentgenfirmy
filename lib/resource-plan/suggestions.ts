// Etap 7 modułu Plan Zasobów — sugestie regułowe (bez AI). Czysta funkcja, ta sama sygnatura
// danych co `validateResourcePlanItem` (Etap 5) — reużywa profilesById/resourceProfilesById/
// dictionaryItems/otherItems, które panel boczny i tak już wczytuje, więc podłączenie sugestii
// nie wymaga nowych zapytań do bazy.
//
// Silnik jest z założenia "ground truth" pod przyszły Etap 8 (AI) — patrz
// `lib/resource-plan/suggestion-provider.ts` (interfejs dostawcy, `RuleBasedSuggestionProvider`
// implementuje ten interfejs w oparciu o funkcję poniżej).

import type { ProcessStage } from "@/lib/process/types";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import {
  resolveEffectiveCompetencyRequirements,
  scoreUserCompetencyMatch,
} from "@/lib/resource-plan/competency-requirements";
import { userHoursInItem } from "@/lib/resource-plan/participant-contribution";
import { hoursBetween, rangesOverlap, sameDay, sameWeek } from "@/lib/resource-plan/validations";
import type { ResourcePlanItem, ResourcePlanItemInput } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";

export type ResourcePlanCandidate = {
  userId: string;
  name: string;
  /** 0–100, im wyżej tym lepsze dopasowanie. */
  score: number;
  matchedRoleNames: string[];
  missingRoleNames: string[];
  matchedCompetencyNames: string[];
  missingCompetencyNames: string[];
  conflictCount: number;
  isOnLeave: boolean;
  isAvailableForPlanning: boolean;
  exceedsDailyLimit: boolean;
  exceedsWeeklyLimit: boolean;
  /** Godziny już zaplanowane w tym samym dniu co analizowany element (bez niego). */
  sameDayHours: number;
  /** Zwięzłe, czytelne dla koordynatora uzasadnienia — do wyświetlenia pod kandydatem. */
  reasons: string[];
};

/**
 * Rankuje potencjalnych kandydatów (`candidateUserIds`) do przypisania do elementu planu, na
 * podstawie ról/kompetencji wymaganych przez etap procesu i sam element planu, dostępności,
 * nieobecności, obciążenia godzinowego i istniejących konfliktów terminów. Bez AI — czyste reguły,
 * w pełni wyjaśnialne (`reasons`).
 */
export function suggestResourcePlanCandidates(params: {
  input: ResourcePlanItemInput;
  editingId?: string | null;
  candidateUserIds: string[];
  otherItems: ResourcePlanItem[];
  stage?: ProcessStage | null;
  profilesById: Record<string, UserProfile>;
  resourceProfilesById: Record<string, UserResourceProfile>;
  dictionaryItems: DictionaryItem[];
  limit?: number;
}): ResourcePlanCandidate[] {
  const {
    input,
    editingId,
    candidateUserIds,
    otherItems,
    stage,
    profilesById,
    resourceProfilesById,
    dictionaryItems,
    limit = 10,
  } = params;

  const others = otherItems.filter((item) => item.id !== editingId);
  const itemHours = input.plannedHours ?? hoursBetween(input.startAt, input.endAt);
  const effectiveCompetencies = resolveEffectiveCompetencyRequirements({
    itemRequirements: input.requiredCompetencies ?? [],
    stage,
    dictionaryItems,
  });

  const candidates: ResourcePlanCandidate[] = candidateUserIds
    .filter((userId, index, arr) => arr.indexOf(userId) === index)
    .map((userId) => {
      const profile = profilesById[userId];
      const resourceProfile = resourceProfilesById[userId];
      const name = profile ? getUserDisplayName(profile) : "Nieznana osoba";
      const reasons: string[] = [];
      let score = 100;

      const matchedRoleNames: string[] = [];
      const missingRoleNames: string[] = [];
      (stage?.requiredRoles ?? []).forEach((requirement) => {
        const role = dictionaryItems.find((d) => d.id === requirement.roleItemId);
        const has = resourceProfile?.roleItemIds.includes(requirement.roleItemId) ?? false;
        if (has) {
          matchedRoleNames.push(role?.name ?? "—");
        } else {
          missingRoleNames.push(role?.name ?? "—");
          score -= 35;
        }
      });

      const matchedCompetencyNames: string[] = [];
      const missingCompetencyNames: string[] = [];
      const competencyMatch = scoreUserCompetencyMatch({
        requirements: effectiveCompetencies,
        resourceProfile,
        dictionaryItems,
        stageAllowsTrainee: stage?.allowsTrainee ?? false,
      });
      score -= competencyMatch.scorePenalty;
      matchedCompetencyNames.push(...competencyMatch.matchedNames);
      missingCompetencyNames.push(...competencyMatch.missingNames);
      reasons.push(...competencyMatch.reasons);

      const isAvailableForPlanning = profile?.isAvailableForPlanning ?? true;
      if (!isAvailableForPlanning) {
        score -= 50;
        reasons.push("Osoba oznaczona jako niedostępna do planowania.");
      }

      const isOnLeave = (resourceProfile?.absences ?? []).some(
        (absence) =>
          absence.status !== "cancelled" &&
          rangesOverlap(input.startAt, input.endAt, `${absence.startDate}T00:00:00`, `${absence.endDate}T23:59:59`),
      );
      if (isOnLeave) {
        score -= 60;
        reasons.push("Zgłoszona nieobecność w tym terminie.");
      }

      const conflicts = others.filter(
        (other) =>
          rangesOverlap(input.startAt, input.endAt, other.startAt, other.endAt) &&
          (other.assigneeId === userId || other.participants.some((p) => p.userId === userId)),
      );
      if (conflicts.length > 0) {
        score -= Math.min(40, conflicts.length * 20);
        reasons.push(`${conflicts.length} nakładające się zadanie(a) w tym terminie.`);
      }

      // Godziny ważone % zaangażowania (patrz participant-contribution.ts) — jeśli kandydat
      // jest w innym elemencie tylko np. 30% zaangażowany, wlicza się 30% jego godzin, nie 100%.
      const sameDayHours = others
        .filter(
          (other) =>
            sameDay(other.startAt, input.startAt) &&
            (other.assigneeId === userId || other.participants.some((p) => p.userId === userId)),
        )
        .reduce((sum, other) => sum + userHoursInItem(other, userId), itemHours);
      const exceedsDailyLimit = profile?.dailyHoursLimit != null && sameDayHours > profile.dailyHoursLimit;
      if (exceedsDailyLimit) {
        score -= 15;
        reasons.push(`Przekroczy dzienny limit godzin (${sameDayHours.toFixed(1)}h / ${profile?.dailyHoursLimit}h).`);
      }

      const sameWeekHours = others
        .filter(
          (other) =>
            sameWeek(other.startAt, input.startAt) &&
            (other.assigneeId === userId || other.participants.some((p) => p.userId === userId)),
        )
        .reduce((sum, other) => sum + userHoursInItem(other, userId), itemHours);
      const exceedsWeeklyLimit = profile?.weeklyHoursLimit != null && sameWeekHours > profile.weeklyHoursLimit;
      if (exceedsWeeklyLimit) {
        score -= 10;
        reasons.push(`Przekroczy tygodniowy limit godzin (${sameWeekHours.toFixed(1)}h / ${profile?.weeklyHoursLimit}h).`);
      }

      if (input.teamItemId && resourceProfile?.teams.some((t) => t.teamItemId === input.teamItemId)) {
        score += 5;
        reasons.push("Członek wybranego zespołu.");
      }

      if (reasons.length === 0) {
        reasons.push("Spełnia wszystkie wymagane kompetencje, brak konfliktów i przekroczeń limitów.");
      }

      return {
        userId,
        name,
        score: Math.max(0, Math.min(100, Math.round(score))),
        matchedRoleNames,
        missingRoleNames,
        matchedCompetencyNames,
        missingCompetencyNames,
        conflictCount: conflicts.length,
        isOnLeave,
        isAvailableForPlanning,
        exceedsDailyLimit,
        exceedsWeeklyLimit,
        sameDayHours,
        reasons,
      };
    });

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}
