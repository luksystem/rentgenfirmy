// Etap 4 modułu Plan Zasobów — element planu (Gantt/RTM, kalendarz, lista, dashboard).

export type ResourcePlanParticipant = {
  userId: string;
  roleItemId: string | null;
  isLead: boolean;
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
  participants: ResourcePlanParticipant[];
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
  participants: ResourcePlanParticipant[];
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
    participants: item.participants,
  };
}
