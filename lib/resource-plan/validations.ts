// Etap 5 modułu Plan Zasobów — walidacje ostrzegawcze (NIE blokujące zapisu).
// Koordynator widzi ostrzeżenia i może świadomie zatwierdzić wyjątek (accepted_risk).

import type { ProcessStage } from "@/lib/process/types";
import type { ResourcePlanItem, ResourcePlanItemInput } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import type { UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";

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

  // 1-2. Konflikt terminów — osoba / zespół.
  const conflictingByUser = new Map<string, ResourcePlanItem[]>();
  others.forEach((other) => {
    if (!rangesOverlap(input.startAt, input.endAt, other.startAt, other.endAt)) return;
    const otherUsers = involvedUserIds(other);
    involved.forEach((userId) => {
      if (otherUsers.includes(userId)) {
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

  // 3. Przekroczony limit godzin (dziennie/tygodniowo) — suma godzin planowanych w tym samym oknie.
  const itemHours = input.plannedHours ?? hoursBetween(input.startAt, input.endAt);
  involved.forEach((userId) => {
    const profile = profilesById[userId];
    if (!profile) return;
    const sameDayHours = others
      .filter((other) => involvedUserIds(other).includes(userId) && sameDay(other.startAt, input.startAt))
      .reduce((sum, other) => sum + (other.plannedHours ?? hoursBetween(other.startAt, other.endAt)), itemHours);

    if (profile.dailyHoursLimit != null && sameDayHours > profile.dailyHoursLimit) {
      warnings.push({
        code: "daily_hours_exceeded",
        severity: "warning",
        message: `${profile.firstName} ${profile.lastName} — przekroczony limit godzin dziennych (${sameDayHours.toFixed(1)}h / ${profile.dailyHoursLimit}h).`,
      });
    }

    const sameWeekHours = others
      .filter((other) => involvedUserIds(other).includes(userId) && sameWeek(other.startAt, input.startAt))
      .reduce((sum, other) => sum + (other.plannedHours ?? hoursBetween(other.startAt, other.endAt)), itemHours);

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

    // Etap dopuszczający ucznia/juniora (`allowsTrainee`) świadomie akceptuje brak wymaganej
    // kompetencji u przypisanych osób — to nie przeoczenie, a celowe przyuczanie, więc nie
    // ostrzegamy (w przeciwieństwie do wymaganych ról, które muszą być pokryte niezależnie).
    if (!stage.allowsTrainee) {
      (stage.requiredCompetencies ?? []).forEach((requirement) => {
        const hasCompetency = involved.some((userId) =>
          resourceProfilesById[userId]?.competencies.some((c) => c.competencyItemId === requirement.competencyItemId),
        );
        if (!hasCompetency) {
          const competency = dictionaryItems.find((d) => d.id === requirement.competencyItemId);
          warnings.push({
            code: "missing_competency",
            severity: "warning",
            message: `Brak osoby z wymaganą kompetencją „${competency?.name ?? "—"}”.`,
          });
        }
      });
    }

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

  // 7. Brak przypisanej osoby.
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
