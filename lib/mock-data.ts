import { addDays, toISODate } from "@/lib/utils";
import type {
  BlockerReason,
  FlowStatus,
  ImplementationStage,
  Interruption,
  InterruptionType,
  NextStepOwner,
  Person,
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
  "Aktywny",
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
const owners: NextStepOwner[] = [
  "Łukasz",
  "Koordynator techniczny",
  "Lider operacyjny",
  "Programista",
  "Monter",
  "Klient",
  "Inna branża",
];
const blockers: BlockerReason[] = [
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
];
const people: Person[] = ["Łukasz", "Koordynator techniczny", "Lider operacyjny"];
const interruptionTypes: InterruptionType[] = [
  "Telefon klienta",
  "Telefon ekipy",
  "Pytanie techniczne",
  "Zmiana projektu",
  "Problem materiałowy",
  "Serwis",
  "Reklamacja",
  "Spotkanie",
  "Inne",
];

export const mockProjects: Project[] = projectNames.map((name, index) => {
  const flowStatus = statuses[index % statuses.length];
  const isActive = flowStatus === "Aktywny";
  const isClosing =
    flowStatus === "Wdrożenie i przekazanie" ||
    flowStatus === "Poprawki" ||
    flowStatus === "Gotowy do odbioru";

  return {
    id: `project-${index + 1}`,
    name,
    type: types[index],
    flowStatus,
    stage: stages[index % stages.length],
    priority: priorities[(index + 1) % priorities.length],
    nextStepOwner: owners[index % owners.length],
    nextContactDate: toISODate(addDays(today, index % 5 === 0 ? -index - 2 : index + 1)),
    blockerReason: isActive ? undefined : blockers[index % blockers.length],
    notes: `Notatka operacyjna dla projektu ${name}.`,
    lastChangedBy: people[index % people.length],
    lastChangedAt: addDays(today, -index).toISOString(),
    lastContactDate: toISODate(addDays(today, index % 4 === 0 ? -18 - index : -index)),
    closeBlocker: isClosing ? blockers[(index + 3) % blockers.length] : undefined,
    remainingHours: isClosing ? 4 + ((index * 3) % 18) : undefined,
    nextAction: isClosing ? "Ustalić termin odbioru i listę poprawek" : undefined,
    closeDeadline: isClosing ? toISODate(addDays(today, 3 + index)) : undefined,
  };
});

export const mockInterruptions: Interruption[] = Array.from({ length: 100 }).map(
  (_, index) => {
    const project = mockProjects[(index * 7) % mockProjects.length];

    return {
      id: `interruption-${index + 1}`,
      date: toISODate(addDays(today, -(index % 28))),
      person: people[index % people.length],
      type: interruptionTypes[(index * 5) % interruptionTypes.length],
      projectId: project.id,
      description: `Przerwanie dotyczące: ${project.name}. Wymaga szybkiej decyzji lub informacji zwrotnej.`,
    };
  },
);
