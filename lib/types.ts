import {
  DEFAULT_FIELD_OPTIONS,
  type FieldOptions,
} from "@/lib/field-options";

import type { ReportPeriod } from "@/lib/report-period";

export type { FieldOptions };

export const projectTypes = DEFAULT_FIELD_OPTIONS.projectTypes;
export const flowStatuses = DEFAULT_FIELD_OPTIONS.flowStatuses.map((status) => status.name);
export const implementationStages = DEFAULT_FIELD_OPTIONS.implementationStages.map(
  (stage) => stage.name,
);
export const nextStepOwners = DEFAULT_FIELD_OPTIONS.nextStepOwners;
export const blockerReasons = DEFAULT_FIELD_OPTIONS.blockerReasons;
export const interruptionTypes = DEFAULT_FIELD_OPTIONS.interruptionTypes.map(
  (item) => item.name,
);

export type ProjectType = string;
export type FlowStatus = string;
export type ImplementationStage = string;
export type NextStepOwner = string;
export type BlockerReason = string;
export type InterruptionType = string;

export const priorities = ["Niski", "Normalny", "Wysoki", "Krytyczny"] as const;
export type Priority = (typeof priorities)[number];

/** Osoba przy przerwaniu / autor zmiany — wartości z ustawień (właściciel kolejnego kroku). */
export type Person = string;

export type Project = {
  id: string;
  name: string;
  isActive: boolean;
  type: ProjectType;
  flowStatus: FlowStatus;
  stage: ImplementationStage;
  priority: Priority;
  nextStepOwner: NextStepOwner;
  nextContactDate: string;
  blockerReason?: BlockerReason;
  notes?: string;
  lastChangedBy: Person;
  lastChangedAt: string;
  lastContactDate: string;
  closeBlocker?: string;
  remainingHours?: number;
  nextAction?: string;
  closeDeadline?: string;
  waitingDependsOnUs?: boolean;
  waitingIncreasesCostLater?: boolean;
  waitingBlocksSettlement?: boolean;
};

export type ProjectInput = Omit<
  Project,
  "id" | "lastChangedBy" | "lastChangedAt" | "lastContactDate"
> & {
  lastContactDate?: string;
};

export type Interruption = {
  id: string;
  date: string;
  person: Person;
  type: InterruptionType;
  projectId: string;
  description: string;
  wasNecessary: boolean;
  isRecurring: boolean;
};

export type TrendComparison = {
  current: number;
  previous: number;
  delta: number;
  direction: "up" | "down" | "same";
  percentChange: number | null;
};

export type QuickWin = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  action: string;
};

export type WeeklyReport = {
  period: ReportPeriod;
  periodLabel: string;
  activeProjects: number;
  waitingProjects: number;
  closedProjects: number;
  closingProjects: number;
  noContactProjects: number;
  mostCommonBlocker: string;
  interruptionsCount: number;
  mostCommonInterruptionSource: string;
  interruptionTrends: {
    daily: TrendComparison;
    weekly: TrendComparison;
    previousPeriodLabel: string;
  };
  criticalProjects: Project[];
  waitingProjectsList: Project[];
  closingProjectsList: Project[];
  blockersByReason: Array<{ name: string; value: number }>;
  interruptionsByTypeChart: Array<{ name: string; value: number }>;
  quickWins: QuickWin[];
};
