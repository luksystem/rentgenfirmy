import {
  DEFAULT_FIELD_OPTIONS,
  type FieldOptions,
} from "@/lib/field-options";

export type { FieldOptions };

export const projectTypes = DEFAULT_FIELD_OPTIONS.projectTypes;
export const flowStatuses = DEFAULT_FIELD_OPTIONS.flowStatuses;
export const implementationStages = DEFAULT_FIELD_OPTIONS.implementationStages;
export const nextStepOwners = DEFAULT_FIELD_OPTIONS.nextStepOwners;
export const blockerReasons = DEFAULT_FIELD_OPTIONS.blockerReasons;
export const interruptionTypes = DEFAULT_FIELD_OPTIONS.interruptionTypes;

export type ProjectType = string;
export type FlowStatus = string;
export type ImplementationStage = string;
export type NextStepOwner = string;
export type BlockerReason = string;
export type InterruptionType = string;

export const priorities = ["Niski", "Normalny", "Wysoki", "Krytyczny"] as const;
export type Priority = (typeof priorities)[number];

export const people = [
  "Łukasz",
  "Koordynator techniczny",
  "Lider operacyjny",
] as const;
export type Person = (typeof people)[number];

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
};

export type WeeklyReport = {
  activeProjects: number;
  waitingProjects: number;
  closedProjects: number;
  mostCommonBlocker: string;
  interruptionsCount: number;
  mostCommonInterruptionSource: string;
  criticalProjects: Project[];
};
