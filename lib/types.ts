export const projectTypes = ["Dom", "Sklep", "Serwis", "Inne"] as const;
export type ProjectType = (typeof projectTypes)[number];

export const flowStatuses = [
  "Aktywny",
  "Oczekuje na budowę",
  "Oczekuje na klienta",
  "Oczekuje na inną branżę",
  "Oczekuje na materiały",
  "Wdrożenie i przekazanie",
  "Poprawki",
  "Gotowy do odbioru",
  "Zamknięty",
] as const;
export type FlowStatus = (typeof flowStatuses)[number];

export const implementationStages = [
  "Projektowanie",
  "Przygotowanie produkcji",
  "Produkcja",
  "Dostarczenie rozdzielni",
  "Montaż",
  "Oczekiwanie po instalacji",
  "Wdrożenie i przekazanie",
] as const;
export type ImplementationStage = (typeof implementationStages)[number];

export const priorities = ["Niski", "Normalny", "Wysoki", "Krytyczny"] as const;
export type Priority = (typeof priorities)[number];

export const nextStepOwners = [
  "Łukasz",
  "Koordynator techniczny",
  "Lider operacyjny",
  "Programista",
  "Monter",
  "Klient",
  "Inna branża",
] as const;
export type NextStepOwner = (typeof nextStepOwners)[number];

export const blockerReasons = [
  "Tynki",
  "Wylewki",
  "Klient",
  "Elektryk",
  "HVAC",
  "Internet",
  "Brak materiału",
  "Programowanie",
  "Poprawki po naszej stronie",
  "Odbiór klienta",
  "Brak decyzji klienta",
  "Inna branża",
  "Inne",
] as const;
export type BlockerReason = (typeof blockerReasons)[number];

export const people = [
  "Łukasz",
  "Koordynator techniczny",
  "Lider operacyjny",
] as const;
export type Person = (typeof people)[number];

export const interruptionTypes = [
  "Telefon klienta",
  "Telefon ekipy",
  "Pytanie techniczne",
  "Zmiana projektu",
  "Problem materiałowy",
  "Serwis",
  "Reklamacja",
  "Spotkanie",
  "Inne",
] as const;
export type InterruptionType = (typeof interruptionTypes)[number];

export type Project = {
  id: string;
  name: string;
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
