// Etap 4 modułu Plan Zasobów — element planu (Gantt/RTM, kalendarz, lista, dashboard).

/** Wymagana kompetencja na elemencie planu lub w szablonie elementu planu. */
export type ResourcePlanCompetencyRequirement = {
  competencyItemId: string;
  minLevelItemId: string | null;
};

export type ResourcePlanParticipant = {
  userId: string;
  roleItemId: string | null;
  isLead: boolean;
  /** Procent godzin elementu przypisany tej osobie (1–100), np. 40h × 50% = 20h.
   *  Domyślnie 100 (pełne zaangażowanie). Patrz lib/resource-plan/participant-contribution.ts. */
  involvementPercent: number;
  /** Własny zakres dat uczestnika — podzbiór startAt/endAt elementu. `null` = cały zakres elementu. */
  startAt: string | null;
  endAt: string | null;
};

export type ResourcePlanItem = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  /** ID etapu procesu — bez twardego FK (etap żyje w zamrożonym snapshocie projektu). */
  processStageId: string | null;
  taskId: string | null;
  serviceIntakeRequestId: string | null;
  workTypeItemId: string | null;
  title: string;
  startAt: string;
  endAt: string;
  plannedHours: number | null;
  actualHours: number | null;
  assigneeId: string | null;
  teamItemId: string | null;
  statusItemId: string | null;
  riskItemId: string | null;
  riskNote: string;
  laborBudget: number | null;
  materialBudget: number | null;
  travelBudget: number | null;
  notes: string;
  /** Koordynator świadomie zatwierdził wyjątek/ostrzeżenie (Etap 5 — nie blokujemy zapisu). */
  acceptedRisk: boolean;
  createdBy: string | null;
  /** Elementy z tym samym linked_group_id to części jednego przydziału podzielonego w czasie
   *  (np. przerwa w środku) — patrz splitResourcePlanItem w resource-plan-repository.ts. */
  linkedGroupId: string | null;
  /** "Zależność pociętych" — gdy true, przesunięcie/rozciągnięcie w Gantcie przesuwa też kolejne
   *  części tej samej grupy (patrz setLinkedGroupShiftEnabled). Ustawiane naraz na całej grupie. */
  shiftWithLinkedGroup: boolean;
  participants: ResourcePlanParticipant[];
  /** Wymagane kompetencje tego przydziału (słownik `competency` + opcjonalny min. poziom). */
  requiredCompetencies: ResourcePlanCompetencyRequirement[];
  createdAt: string;
  updatedAt: string;
};

export type ResourcePlanItemInput = {
  projectId: string | null;
  clientId: string | null;
  processStageId: string | null;
  taskId: string | null;
  serviceIntakeRequestId: string | null;
  workTypeItemId: string | null;
  title: string;
  startAt: string;
  endAt: string;
  plannedHours: number | null;
  actualHours: number | null;
  assigneeId: string | null;
  teamItemId: string | null;
  statusItemId: string | null;
  riskItemId: string | null;
  riskNote: string;
  laborBudget: number | null;
  materialBudget: number | null;
  travelBudget: number | null;
  notes: string;
  acceptedRisk: boolean;
  linkedGroupId: string | null;
  shiftWithLinkedGroup: boolean;
  participants: ResourcePlanParticipant[];
  requiredCompetencies: ResourcePlanCompetencyRequirement[];
};

export type ResourcePlanFilters = {
  from: string;
  to: string;
  assigneeId?: string;
  teamItemId?: string;
  projectId?: string;
};

/** Wspólne mapowanie zapisanego elementu na formularz edycji — używane przez panel boczny i Gantt. */
export function resourcePlanItemToInput(item: ResourcePlanItem): ResourcePlanItemInput {
  return {
    projectId: item.projectId,
    clientId: item.clientId,
    processStageId: item.processStageId,
    taskId: item.taskId,
    serviceIntakeRequestId: item.serviceIntakeRequestId,
    workTypeItemId: item.workTypeItemId,
    title: item.title,
    startAt: item.startAt,
    endAt: item.endAt,
    plannedHours: item.plannedHours,
    actualHours: item.actualHours,
    assigneeId: item.assigneeId,
    teamItemId: item.teamItemId,
    statusItemId: item.statusItemId,
    riskItemId: item.riskItemId,
    riskNote: item.riskNote,
    laborBudget: item.laborBudget,
    materialBudget: item.materialBudget,
    travelBudget: item.travelBudget,
    notes: item.notes,
    acceptedRisk: item.acceptedRisk,
    linkedGroupId: item.linkedGroupId,
    shiftWithLinkedGroup: item.shiftWithLinkedGroup,
    participants: item.participants,
    requiredCompetencies: item.requiredCompetencies,
  };
}
