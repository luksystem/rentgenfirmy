// Etap 5 modułu Plan Zasobów — walidacje ostrzegawcze (NIE blokujące zapisu).
// Koordynator widzi ostrzeżenia i może świadomie zatwierdzić wyjątek (accepted_risk).

import type { ProcessStage } from "@/lib/process/types";
import type { ResourcePlanItem, ResourcePlanItemInput } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import type { UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import {
  resolveEffectiveCompetencyRequirements,
  scoreUserCompetencyMatch,
} from "@/lib/resource-plan/competency-requirements";
import { userEffectiveRangeInItem, userHoursInItem } from "@/lib/resource-plan/participant-contribution";

export type ResourcePlanWarning = {
  code: string;
  message: string;
  severity: "warning" | "danger";
};

// Eksportowane, żeby `lib/resource-plan/suggestions.ts` (Etap 7) mógł reużyć te same reguły
// nakładania się terminów/godzin bez duplikowania logiki.
export function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

export function hoursBetween(startAt: string, endAt: string) {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3_600_000);
}

function involvedUserIds(input: ResourcePlanItemInput | ResourcePlanItem): string[] {
  const ids = new Set<string>();
  if (input.assigneeId) ids.add(input.assigneeId);
  input.participants.forEach((p) => ids.add(p.userId));
  return [...ids];
}

export function validateResourcePlanItem(params: {
  input: ResourcePlanItemInput;
  editingId?: string | null;
  otherItems: ResourcePlanItem[];
  stage?: ProcessStage | null;
  profilesById: Record<string, UserProfile>;
  resourceProfilesById: Record<string, UserResourceProfile>;
  dictionaryItems: DictionaryItem[];
}): ResourcePlanWarning[] {
  const { input, editingId, otherItems, stage, profilesById, resourceProfilesById, dictionaryItems } = params;
  const warnings: ResourcePlanWarning[] = [];
  const involved = involvedUserIds(input);
  const others = otherItems.filter((item) => item.id !== editingId);

  // 1-2. Konflikt terminów — osoba / zespół. Dla osoby zaangażowanej liczymy nakładanie się
  // wg JEJ WŁASNEGO zakresu dat (może być węższy niż cały element — patrz participant-contribution.ts),
  // nie całego zakresu elementu, żeby nie zgłaszać fałszywych konfliktów, gdy dana osoba jest
  // zaangażowana tylko np. 2 dni z 5-dniowego zadania.
  const conflictingByUser = new Map<string, ResourcePlanItem[]>();
  involved.forEach((userId) => {
    const inputRange = userEffectiveRangeInItem(input, userId);
    if (!inputRange) return;
    others.forEach((other) => {
      const otherRange = userEffectiveRangeInItem(other, userId);
      if (!otherRange) return;
      if (rangesOverlap(inputRange.startAt, inputRange.endAt, otherRange.startAt, otherRange.endAt)) {
        const list = conflictingByUser.get(userId) ?? [];
        list.push(other);
        conflictingByUser.set(userId, list);
      }
    });
  });
  conflictingByUser.forEach((conflicts, userId) => {
    const name = profilesById[userId] ? `${profilesById[userId].firstName} ${profilesById[userId].lastName}`.trim() : "Osoba";
    warnings.push({
      code: "user_conflict",
      severity: "danger",
      message: `${name || "Wybrana osoba"} ma już ${conflicts.length} zaplanowane zadanie(a) w tym terminie.`,
    });
  });

  if (input.teamItemId) {
    const teamConflicts = others.filter(
      (other) => other.teamItemId === input.teamItemId && rangesOverlap(input.startAt, input.endAt, other.startAt, other.endAt),
    );
    if (teamConflicts.length > 0) {
      const team = dictionaryItems.find((d) => d.id === input.teamItemId);
      warnings.push({
        code: "team_conflict",
        severity: "warning",
        message: `Zespół „${team?.name ?? "—"}” ma ${teamConflicts.length} inne zadanie(a) w tym terminie.`,
      });
    }
  }

  // 3. Przekroczony limit godzin (dziennie/tygodniowo) — suma godzin w tym samym oknie, ważona
  // % zaangażowania: osoba odpowiedzialna liczy się pełnymi godzinami elementu, osoba
  // zaangażowana godzinami wynikającymi z jej % (patrz participant-contribution.ts).
  involved.forEach((userId) => {
    const profile = profilesById[userId];
    if (!profile) return;
    const inputRange = userEffectiveRangeInItem(input, userId);
    if (!inputRange) return;
    const inputHours = userHoursInItem(input, userId);

    const sameDayHours = others
      .filter((other) => {
        const otherRange = userEffectiveRangeInItem(other, userId);
        return Boolean(otherRange) && sameDay(otherRange!.startAt, inputRange.startAt);
      })
      .reduce((sum, other) => sum + userHoursInItem(other, userId), inputHours);

    if (profile.dailyHoursLimit != null && sameDayHours > profile.dailyHoursLimit) {
      warnings.push({
        code: "daily_hours_exceeded",
        severity: "warning",
        message: `${profile.firstName} ${profile.lastName} — przekroczony limit godzin dziennych (${sameDayHours.toFixed(1)}h / ${profile.dailyHoursLimit}h).`,
      });
    }

    const sameWeekHours = others
      .filter((other) => {
        const otherRange = userEffectiveRangeInItem(other, userId);
        return Boolean(otherRange) && sameWeek(otherRange!.startAt, inputRange.startAt);
      })
      .reduce((sum, other) => sum + userHoursInItem(other, userId), inputHours);

    if (profile.weeklyHoursLimit != null && sameWeekHours > profile.weeklyHoursLimit) {
      warnings.push({
        code: "weekly_hours_exceeded",
        severity: "warning",
        message: `${profile.firstName} ${profile.lastName} — przekroczony limit godzin tygodniowych (${sameWeekHours.toFixed(1)}h / ${profile.weeklyHoursLimit}h).`,
      });
    }
  });

  // 4-6. Wymagania etapu: role, kompetencje, lider.
  if (stage) {
    const involvedRoleIds = new Set(
      involved.flatMap((userId) => resourceProfilesById[userId]?.roleItemIds ?? []),
    );
    (stage.requiredRoles ?? []).forEach((requirement) => {
      if (!involvedRoleIds.has(requirement.roleItemId)) {
        const role = dictionaryItems.find((d) => d.id === requirement.roleItemId);
        warnings.push({
          code: "missing_role",
          severity: "warning",
          message: `Brak osoby z wymaganą rolą „${role?.name ?? "—"}”.`,
        });
      }
    });

    if (stage.requiresLeader) {
      const hasLeader = input.participants.some((p) => p.isLead);
      if (!hasLeader && !input.assigneeId) {
        warnings.push({
          code: "missing_leader",
          severity: "warning",
          message: "Etap wymaga lidera, a nikt nie jest oznaczony jako lider/osoba odpowiedzialna.",
        });
      }
    }
  }

  // 5. Wymagane kompetencje — z etapu procesu i/lub z samego elementu planu.
  const effectiveCompetencies = resolveEffectiveCompetencyRequirements({
    itemRequirements: input.requiredCompetencies ?? [],
    stage,
    dictionaryItems,
  });
  effectiveCompetencies.forEach((requirement) => {
    if (requirement.fromStage && stage?.allowsTrainee) return;

    const covered = involved.some((userId) => {
      const match = scoreUserCompetencyMatch({
        requirements: [requirement],
        resourceProfile: resourceProfilesById[userId],
        dictionaryItems,
        stageAllowsTrainee: stage?.allowsTrainee ?? false,
      });
      return match.missingNames.length === 0;
    });

    if (!covered) {
      const competency = dictionaryItems.find((d) => d.id === requirement.competencyItemId);
      const level = dictionaryItems.find((d) => d.id === requirement.minLevelItemId);
      warnings.push({
        code: "missing_competency",
        severity: "warning",
        message: level
          ? `Brak osoby z wymaganą kompetencją „${competency?.name ?? "—"}” (min. ${level.name}).`
          : `Brak osoby z wymaganą kompetencją „${competency?.name ?? "—"}”.`,
      });
    }
  });

  // 6. (poprzednio 7) Brak przypisanej osoby.
  if (!input.assigneeId && input.participants.length === 0) {
    warnings.push({
      code: "no_assignee",
      severity: "danger",
      message: "Nie przypisano żadnej osoby odpowiedzialnej ani zaangażowanej.",
    });
  }

  // 8. Nachodzenie na nieobecność.
  involved.forEach((userId) => {
    const absences = resourceProfilesById[userId]?.absences ?? [];
    const overlapping = absences.find(
      (absence) =>
        absence.status !== "cancelled" &&
        rangesOverlap(input.startAt, input.endAt, `${absence.startDate}T00:00:00`, `${absence.endDate}T23:59:59`),
    );
    if (overlapping) {
      const profile = profilesById[userId];
      warnings.push({
        code: "absence_overlap",
        severity: "danger",
        message: `${profile ? `${profile.firstName} ${profile.lastName}` : "Osoba"} ma zgłoszoną nieobecność w tym terminie.`,
      });
    }
  });

  // 9. Budżet nie został podany (a etap zakłada domyślny budżet > 0).
  if (stage) {
    if ((stage.defaultLaborBudget ?? 0) > 0 && !input.laborBudget) {
      warnings.push({
        code: "missing_labor_budget",
        severity: "warning",
        message: "Nie podano budżetu robocizny (etap ma zdefiniowany budżet domyślny).",
      });
    }
    if ((stage.defaultMaterialBudget ?? 0) > 0 && !input.materialBudget) {
      warnings.push({
        code: "missing_material_budget",
        severity: "warning",
        message: "Nie podano budżetu materiałów (etap ma zdefiniowany budżet domyślny).",
      });
    }
  }

  // 10. Etap ma wysokie ryzyko (najwyższy sort_order w słowniku poziomów ryzyka).
  const riskLevels = dictionaryItems.filter((d) => d.dictionaryKey === "risk_level" && d.isActive);
  const maxSortOrder = riskLevels.length ? Math.max(...riskLevels.map((r) => r.sortOrder)) : null;
  const effectiveRiskId = input.riskItemId ?? stage?.defaultRiskItemId ?? null;
  const effectiveRisk = riskLevels.find((r) => r.id === effectiveRiskId);
  if (effectiveRisk && maxSortOrder !== null && effectiveRisk.sortOrder === maxSortOrder) {
    warnings.push({
      code: "high_risk",
      severity: "warning",
      message: `Etap/element ma wysokie ryzyko („${effectiveRisk.name}”) — wymaga świadomej akceptacji koordynatora.`,
    });
  }

  return warnings;
}

export function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function startOfWeek(dateIso: string) {
  const date = new Date(dateIso);
  const day = (date.getDay() + 6) % 7; // poniedziałek = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function sameWeek(a: string, b: string) {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime();
}
