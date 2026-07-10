// Etap 6 modułu Plan Zasobów — agregaty dla dashboardu, liczone po stronie klienta z danych już
// wczytanych przez `useResourcePlanStore().ensureRange` (analogicznie do `lib/domain.ts` — bez
// osobnego repozytorium/zapytań SQL, bo skala danych MVP nie wymaga agregacji na poziomie bazy;
// jeśli w przyszłości liczba elementów planu znacząco wzrośnie, warto przenieść to na SQL, wzorem
// zaplanowanego dla modułu Celów `goal-history-repository.ts`).

import { getUserDisplayName } from "@/lib/auth/types";
import type { UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import { userHoursInItem } from "@/lib/resource-plan/participant-contribution";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import { resourcePlanItemToInput } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import { validateResourcePlanItem, type ResourcePlanWarning } from "@/lib/resource-plan/validations";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function itemHours(item: ResourcePlanItem): number {
  if (item.plannedHours != null) return item.plannedHours;
  return Math.max(0, (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 3_600_000);
}

export type ResourcePlanConflictRow = { item: ResourcePlanItem; warnings: ResourcePlanWarning[] };

export type ResourcePlanWorkloadRow = {
  userId: string;
  name: string;
  hours: number;
  weeklyHoursLimit: number | null;
  /** Szacowana zdolność w oknie czasowym = limit tygodniowy × liczba tygodni okna (przybliżenie, nie uwzględnia nieobecności). */
  estimatedCapacity: number | null;
  overloaded: boolean;
};

export type ResourcePlanDashboardMetrics = {
  totalItems: number;
  totalPlannedHours: number;
  totalLaborBudget: number;
  totalMaterialBudget: number;
  totalTravelBudget: number;
  unassignedItems: ResourcePlanItem[];
  conflictRows: ResourcePlanConflictRow[];
  totalWarningCount: number;
  statusChartData: { name: string; value: number }[];
  workloadByPerson: ResourcePlanWorkloadRow[];
  workloadChartData: { name: string; value: number }[];
};

export function computeResourcePlanDashboardMetrics(params: {
  /** Elementy planu widoczne w oknie (nakładające się z [from, to)) — jak w Gantcie/liście. */
  items: ResourcePlanItem[];
  from: string;
  to: string;
  profilesById: Record<string, UserProfile>;
  resourceProfilesById: Record<string, UserResourceProfile>;
  dictionaryItems: DictionaryItem[];
}): ResourcePlanDashboardMetrics {
  const { items, from, to, profilesById, resourceProfilesById, dictionaryItems } = params;

  const totalPlannedHours = items.reduce((sum, item) => sum + itemHours(item), 0);
  const totalLaborBudget = items.reduce((sum, item) => sum + (item.laborBudget ?? 0), 0);
  const totalMaterialBudget = items.reduce((sum, item) => sum + (item.materialBudget ?? 0), 0);
  const totalTravelBudget = items.reduce((sum, item) => sum + (item.travelBudget ?? 0), 0);

  const unassignedItems = items.filter((item) => !item.assigneeId && item.participants.length === 0);

  // Ta sama walidacja co w panelu edycji/Gantcie/liście — jedno źródło prawdy o tym, co jest
  // "konfliktem" (severity: danger), bez duplikowania reguł na potrzeby dashboardu.
  const conflictRows: ResourcePlanConflictRow[] = [];
  let totalWarningCount = 0;
  items.forEach((item) => {
    const warnings = validateResourcePlanItem({
      input: resourcePlanItemToInput(item),
      editingId: item.id,
      otherItems: items,
      stage: null,
      profilesById,
      resourceProfilesById,
      dictionaryItems,
    });
    totalWarningCount += warnings.length;
    if (warnings.some((warning) => warning.severity === "danger")) {
      conflictRows.push({ item, warnings });
    }
  });

  const statusCounts = new Map<string, { name: string; count: number }>();
  items.forEach((item) => {
    const status = dictionaryItems.find((d) => d.id === item.statusItemId);
    const key = status?.id ?? "none";
    const entry = statusCounts.get(key) ?? { name: status?.name ?? "Bez statusu", count: 0 };
    entry.count += 1;
    statusCounts.set(key, entry);
  });
  const statusChartData = [...statusCounts.values()]
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({ name: entry.name, value: entry.count }));

  // Godziny ważone % zaangażowania — osoba odpowiedzialna liczy się pełnymi godzinami
  // elementu, osoba zaangażowana godzinami wynikającymi z jej % (patrz participant-contribution.ts),
  // żeby obłożenie na dashboardzie odpowiadało realnemu obciążeniu, nie sumie pełnych godzin
  // każdego elementu, w którym dana osoba w ogóle występuje.
  const hoursByUser = new Map<string, number>();
  items.forEach((item) => {
    const involved = new Set<string>();
    if (item.assigneeId) involved.add(item.assigneeId);
    item.participants.forEach((participant) => involved.add(participant.userId));
    involved.forEach((userId) => {
      hoursByUser.set(userId, (hoursByUser.get(userId) ?? 0) + userHoursInItem(item, userId));
    });
  });

  const windowDays = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY));
  const windowWeeks = windowDays / 7;

  const workloadByPerson: ResourcePlanWorkloadRow[] = [...hoursByUser.entries()]
    .map(([userId, hours]) => {
      const profile = profilesById[userId];
      const weeklyHoursLimit = profile?.weeklyHoursLimit ?? null;
      const estimatedCapacity = weeklyHoursLimit != null ? weeklyHoursLimit * windowWeeks : null;
      return {
        userId,
        name: profile ? getUserDisplayName(profile) : "Nieznana osoba",
        hours,
        weeklyHoursLimit,
        estimatedCapacity,
        overloaded: estimatedCapacity != null && hours > estimatedCapacity,
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const workloadChartData = workloadByPerson
    .slice(0, 8)
    .map((entry) => ({ name: entry.name, value: Math.round(entry.hours * 10) / 10 }));

  return {
    totalItems: items.length,
    totalPlannedHours,
    totalLaborBudget,
    totalMaterialBudget,
    totalTravelBudget,
    unassignedItems,
    conflictRows,
    totalWarningCount,
    statusChartData,
    workloadByPerson,
    workloadChartData,
  };
}
