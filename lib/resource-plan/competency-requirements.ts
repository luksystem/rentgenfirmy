import type { ProcessStage } from "@/lib/process/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { ResourcePlanCompetencyRequirement } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";

export type ResolvedCompetencyRequirement = ResourcePlanCompetencyRequirement & {
  /** Wymaganie z etapu procesu — może być łagodzone przez `allowsTrainee`. */
  fromStage: boolean;
};

function levelSortOrder(dictionaryItems: DictionaryItem[], levelItemId: string | null): number | null {
  if (!levelItemId) return null;
  return dictionaryItems.find((item) => item.id === levelItemId)?.sortOrder ?? null;
}

/** Wybiera wyższy (bardziej restrykcyjny) poziom z dwóch — po `sortOrder` słownika `competency_level`. */
export function stricterMinLevelItemId(
  a: string | null,
  b: string | null,
  dictionaryItems: DictionaryItem[],
): string | null {
  if (!a) return b;
  if (!b) return a;
  const orderA = levelSortOrder(dictionaryItems, a) ?? 0;
  const orderB = levelSortOrder(dictionaryItems, b) ?? 0;
  return orderA >= orderB ? a : b;
}

/**
 * Łączy wymagania kompetencji z etapu procesu i z samego elementu planu.
 * Element planu może doprecyzować min. poziom lub dodać kompetencje spoza etapu.
 */
export function resolveEffectiveCompetencyRequirements(params: {
  itemRequirements: ResourcePlanCompetencyRequirement[];
  stage?: ProcessStage | null;
  dictionaryItems: DictionaryItem[];
}): ResolvedCompetencyRequirement[] {
  const { itemRequirements, stage, dictionaryItems } = params;
  const map = new Map<string, ResolvedCompetencyRequirement>();

  (stage?.requiredCompetencies ?? []).forEach((requirement) => {
    map.set(requirement.competencyItemId, {
      competencyItemId: requirement.competencyItemId,
      minLevelItemId: requirement.minLevelItemId,
      fromStage: true,
    });
  });

  itemRequirements.forEach((requirement) => {
    const existing = map.get(requirement.competencyItemId);
    if (existing) {
      map.set(requirement.competencyItemId, {
        competencyItemId: requirement.competencyItemId,
        minLevelItemId: stricterMinLevelItemId(
          existing.minLevelItemId,
          requirement.minLevelItemId,
          dictionaryItems,
        ),
        fromStage: existing.fromStage,
      });
      return;
    }
    map.set(requirement.competencyItemId, {
      ...requirement,
      fromStage: false,
    });
  });

  return Array.from(map.values());
}

export type CompetencyMatchResult = {
  matchedNames: string[];
  missingNames: string[];
  /** Kara punktowa dla sugestii (0 = pełne dopasowanie). */
  scorePenalty: number;
  reasons: string[];
};

/** Porównuje kompetencje użytkownika z listą wymagań — używane w sugestiach i walidacji osoby. */
export function scoreUserCompetencyMatch(params: {
  requirements: ResolvedCompetencyRequirement[];
  resourceProfile: UserResourceProfile | undefined;
  dictionaryItems: DictionaryItem[];
  stageAllowsTrainee?: boolean;
}): CompetencyMatchResult {
  const { requirements, resourceProfile, dictionaryItems, stageAllowsTrainee = false } = params;
  const matchedNames: string[] = [];
  const missingNames: string[] = [];
  const reasons: string[] = [];
  let scorePenalty = 0;

  requirements.forEach((requirement) => {
    const competency = dictionaryItems.find((item) => item.id === requirement.competencyItemId);
    const competencyName = competency?.name ?? "—";
    const owned = resourceProfile?.competencies.find(
      (entry) => entry.competencyItemId === requirement.competencyItemId,
    );

    if (!owned) {
      missingNames.push(competencyName);
      const traineeBypass = requirement.fromStage && stageAllowsTrainee;
      scorePenalty += traineeBypass ? 8 : 25;
      if (traineeBypass) {
        reasons.push(`Brak kompetencji „${competencyName}” — etap dopuszcza ucznia.`);
      }
      return;
    }

    const requiredLevel = levelSortOrder(dictionaryItems, requirement.minLevelItemId);
    const ownedLevel = levelSortOrder(dictionaryItems, owned.levelItemId);
    if (requiredLevel !== null && (ownedLevel === null || ownedLevel < requiredLevel)) {
      missingNames.push(`${competencyName} (niższy poziom)`);
      scorePenalty += 15;
      reasons.push(`Kompetencja „${competencyName}” na niższym poziomie niż wymagany.`);
      return;
    }

    matchedNames.push(competencyName);
  });

  return { matchedNames, missingNames, scorePenalty, reasons };
}
