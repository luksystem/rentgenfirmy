import { DEFAULT_FIELD_OPTIONS } from "@/lib/field-options";
import { addDays, toISODate } from "@/lib/utils";
import { applyWaitingPriority } from "@/lib/waiting-priority";
import type {
  FlowStatus,
  ImplementationStage,
  Interruption,
  Priority,
  Project,
  ProjectType,
} from "@/lib/types";

const today = new Date();

const projectNames = [
  "Dom Wilanów",
  "Dom Konstancin",
  "Dom Izabelin",
  "Dom Wawer",
  "Dom Józefów",
  "Dom Łomianki",
  "Dom Zalesie",
  "Dom Kabaty",
  "Sklep Galeria Północna",
  "Sklep Mokotów",
  "Sklep Wrocław",
  "Sklep Poznań",
  "Sklep Katowice",
  "Serwis Apartament 12",
  "Serwis Rezydencja Park",
  "Serwis Biuro Centrum",
  "Serwis Magazyn Łódź",
  "Automatyka Hotel",
  "BMS Biurowiec Alfa",
  "Inne Showroom",
];

const types: ProjectType[] = [
  "Dom",
  "Dom",
  "Dom",
  "Dom",
  "Dom",
  "Dom",
  "Dom",
  "Dom",
  "Sklep",
  "Sklep",
  "Sklep",
  "Sklep",
  "Sklep",
  "Serwis",
  "Serwis",
  "Serwis",
  "Serwis",
  "Inne",
  "Inne",
  "Inne",
];

const statuses: FlowStatus[] = [
  "Oczekuje na budowę",
  "Oczekuje na klienta",
  "Oczekuje na inną branżę",
  "Oczekuje na materiały",
  "Wdrożenie i przekazanie",
  "Poprawki",
  "Gotowy do odbioru",
  "Zamknięty",
];

const stages: ImplementationStage[] = [
  "Projektowanie",
  "Przygotowanie produkcji",
  "Produkcja",
  "Dostarczenie rozdzielni",
  "Montaż",
  "Oczekiwanie po instalacji",
  "Wdrożenie i przekazanie",
];

const priorities: Priority[] = ["Niski", "Normalny", "Wysoki", "Krytyczny"];
const owners = DEFAULT_FIELD_OPTIONS.nextStepOwners;
const blockers = DEFAULT_FIELD_OPTIONS.blockerReasons;
const interruptionTypeNamesList = DEFAULT_FIELD_OPTIONS.interruptionTypes.map(
  (item) => item.name,
);

export const mockProjects: Project[] = projectNames.map((name, index) => {
  const flowStatus = statuses[index % statuses.length];
  const isActive = index % statuses.length === 0;
  const isClosing =
    flowStatus === "Wdrożenie i przekazanie" ||
    flowStatus === "Poprawki" ||
    flowStatus === "Gotowy do odbioru";
  const stage = stages[index % stages.length];
  const isClosingStage = stage === "Wdrożenie i przekazanie" && isClosing;

  const isWaitingStatus = flowStatus.startsWith("Oczekuje");
  const waitingFlags =
    isWaitingStatus && index % 3 === 0
      ? {
          waitingDependsOnUs: index % 2 === 0,
          waitingIncreasesCostLater: index % 4 === 0,
          waitingBlocksSettlement: index % 5 === 0,
        }
      : {};

  const base = {
    id: `project-${index + 1}`,
    name,
    isActive,
    type: types[index],
    flowStatus,
    stage,
    priority: priorities[(index + 1) % priorities.length],
    nextStepOwner: owners[index % owners.length],
    nextContactDate: toISODate(addDays(today, index % 5 === 0 ? -index - 2 : index + 1)),
    blockerReason: isActive ? undefined : blockers[index % blockers.length],
    notes: `Notatka operacyjna dla projektu ${name}.`,
    lastChangedBy: owners[index % owners.length],
    lastChangedAt: addDays(today, -index).toISOString(),
    lastContactDate: toISODate(addDays(today, index % 4 === 0 ? -18 - index : -index)),
    closeBlocker: isClosingStage ? blockers[(index + 3) % blockers.length] : undefined,
    remainingHours: isClosingStage ? 4 + ((index * 3) % 18) : undefined,
    nextAction: isClosingStage ? "Ustalić termin odbioru i listę poprawek" : undefined,
    closeDeadline: isClosingStage ? toISODate(addDays(today, 3 + index)) : undefined,
    ...waitingFlags,
  };

  return applyWaitingPriority(base, isWaitingStatus);
});

export const mockInterruptions: Interruption[] = Array.from({ length: 100 }).map(
  (_, index) => {
    const project = mockProjects[(index * 7) % mockProjects.length];

    return {
      id: `interruption-${index + 1}`,
      date: toISODate(addDays(today, -(index % 28))),
      person: owners[index % owners.length],
      type: interruptionTypeNamesList[(index * 5) % interruptionTypeNamesList.length],
      projectId: project.id,
      description: `Przerwanie dotyczące: ${project.name}. Wymaga szybkiej decyzji lub informacji zwrotnej.`,
      wasNecessary: index % 3 === 0,
      isRecurring: index % 5 === 0,
    };
  },
);
