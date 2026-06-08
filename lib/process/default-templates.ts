import type { ProcessTemplate } from "@/lib/process/types";

type TemplateSeed = Omit<ProcessTemplate, "id" | "createdAt" | "updatedAt" | "stages"> & {
  stages: Array<{
    title: string;
    milestones: Array<{
      title: string;
      items: Array<{ kind: "checklist" | "protocol" | "settlement"; title: string }>;
    }>;
  }>;
};

function buildSeed(
  projectType: string,
  name: string,
  description: string,
  stages: TemplateSeed["stages"],
): TemplateSeed {
  return { projectType, name, description, stages };
}

export const DEFAULT_PROCESS_TEMPLATE_SEEDS: TemplateSeed[] = [
  buildSeed(
    "Dom",
    "Proces — Dom",
    "Standardowy pipeline realizacji instalacji Smart Home w domu jednorodzinnym.",
    [
      {
        title: "Analiza i projekt",
        milestones: [
          {
            title: "Brief i pomiary",
            items: [
              { kind: "checklist", title: "Wizyta na obiekcie" },
              { kind: "checklist", title: "Zebranie wymagań klienta" },
              { kind: "checklist", title: "Inwentaryzacja istniejącej instalacji" },
            ],
          },
          {
            title: "Projekt koncepcyjny",
            items: [
              { kind: "checklist", title: "Schemat funkcjonalny" },
              { kind: "checklist", title: "Lista urządzeń i stref" },
              { kind: "protocol", title: "Akceptacja koncepcji przez klienta" },
            ],
          },
        ],
      },
      {
        title: "Przygotowanie i produkcja",
        milestones: [
          {
            title: "Dokumentacja wykonawcza",
            items: [
              { kind: "checklist", title: "Rozdzielnice — schemat i BOM" },
              { kind: "checklist", title: "Okablowanie i trasy" },
              { kind: "checklist", title: "Zatwierdzenie dokumentacji" },
            ],
          },
          {
            title: "Produkcja rozdzielni",
            items: [
              { kind: "checklist", title: "Prefabricacja szaf" },
              { kind: "checklist", title: "Testy fabryczne" },
              { kind: "checklist", title: "Przygotowanie do wysyłki" },
            ],
          },
        ],
      },
      {
        title: "Montaż i wdrożenie",
        milestones: [
          {
            title: "Montaż na obiekcie",
            items: [
              { kind: "checklist", title: "Montaż rozdzielni i okablowania" },
              { kind: "checklist", title: "Montaż urządzeń końcowych" },
              { kind: "checklist", title: "Uruchomienie podstawowe" },
            ],
          },
          {
            title: "Programowanie i testy",
            items: [
              { kind: "checklist", title: "Konfiguracja automatyki" },
              { kind: "checklist", title: "Testy scen i integracji" },
              { kind: "protocol", title: "Protokół odbioru częściowy" },
            ],
          },
        ],
      },
      {
        title: "Przekazanie i rozliczenie",
        milestones: [
          {
            title: "Szkolenie klienta",
            items: [
              { kind: "checklist", title: "Instruktaż obsługi" },
              { kind: "checklist", title: "Przekazanie dokumentacji" },
              { kind: "protocol", title: "Protokół odbioru końcowy" },
            ],
          },
          {
            title: "Zamknięcie projektu",
            items: [
              { kind: "settlement", title: "Rozliczenie końcowe z klientem" },
              { kind: "checklist", title: "Archiwizacja projektu" },
            ],
          },
        ],
      },
    ],
  ),
  buildSeed(
    "Sklep",
    "Proces — Sklep",
    "Pipeline dla instalacji BMS / automatyki w obiekcie komercyjnym.",
    [
      {
        title: "Analiza obiektu",
        milestones: [
          {
            title: "Audyt techniczny",
            items: [
              { kind: "checklist", title: "Wizyta i pomiary obiektu" },
              { kind: "checklist", title: "Analiza wymagań inwestora" },
            ],
          },
        ],
      },
      {
        title: "Realizacja",
        milestones: [
          {
            title: "Instalacja",
            items: [
              { kind: "checklist", title: "Montaż i okablowanie" },
              { kind: "checklist", title: "Integracja z istniejącymi systemami" },
              { kind: "protocol", title: "Protokół odbioru instalacji" },
            ],
          },
        ],
      },
      {
        title: "Rozliczenie",
        milestones: [
          {
            title: "Zamknięcie",
            items: [
              { kind: "settlement", title: "Rozliczenie z inwestorem" },
              { kind: "checklist", title: "Przekazanie na serwis" },
            ],
          },
        ],
      },
    ],
  ),
  buildSeed(
    "Serwis",
    "Proces — Serwis",
    "Pipeline obsługi zlecenia serwisowego.",
    [
      {
        title: "Przyjęcie zgłoszenia",
        milestones: [
          {
            title: "Diagnostyka",
            items: [
              { kind: "checklist", title: "Analiza zgłoszenia" },
              { kind: "checklist", title: "Wizyta / zdalna diagnoza" },
            ],
          },
        ],
      },
      {
        title: "Realizacja serwisu",
        milestones: [
          {
            title: "Naprawa",
            items: [
              { kind: "checklist", title: "Wykonanie prac serwisowych" },
              { kind: "protocol", title: "Protokół wykonania usługi" },
            ],
          },
        ],
      },
      {
        title: "Rozliczenie",
        milestones: [
          {
            title: "Zamknięcie",
            items: [
              { kind: "settlement", title: "Rozliczenie serwisu" },
            ],
          },
        ],
      },
    ],
  ),
  buildSeed(
    "Inne",
    "Proces — Inne",
    "Ogólny pipeline projektu.",
    [
      {
        title: "Przygotowanie",
        milestones: [
          {
            title: "Start",
            items: [
              { kind: "checklist", title: "Ustalenie zakresu" },
              { kind: "checklist", title: "Plan działania" },
            ],
          },
        ],
      },
      {
        title: "Realizacja",
        milestones: [
          {
            title: "Wykonanie",
            items: [
              { kind: "checklist", title: "Realizacja prac" },
              { kind: "protocol", title: "Protokół odbioru" },
            ],
          },
        ],
      },
      {
        title: "Zamknięcie",
        milestones: [
          {
            title: "Rozliczenie",
            items: [{ kind: "settlement", title: "Rozliczenie projektu" }],
          },
        ],
      },
    ],
  ),
];

export function instantiateTemplateFromSeed(
  seed: TemplateSeed,
  ids: {
    templateId: string;
    stageIds: string[];
    milestoneIds: string[];
    itemIds: string[];
  },
): ProcessTemplate {
  const now = new Date().toISOString();
  let stageIdx = 0;
  let milestoneIdx = 0;
  let itemIdx = 0;

  return {
    id: ids.templateId,
    projectType: seed.projectType,
    name: seed.name,
    description: seed.description,
    createdAt: now,
    updatedAt: now,
    stages: seed.stages.map((stage, stagePosition) => {
      const stageId = ids.stageIds[stageIdx++];
      return {
        id: stageId,
        templateId: ids.templateId,
        title: stage.title,
        position: stagePosition,
        milestones: stage.milestones.map((milestone, milestonePosition) => {
          const milestoneId = ids.milestoneIds[milestoneIdx++];
          return {
            id: milestoneId,
            stageId,
            title: milestone.title,
            position: milestonePosition,
            plannedDate: null,
            items: milestone.items.map((item, itemPosition) => ({
              id: ids.itemIds[itemIdx++],
              milestoneId,
              kind: item.kind,
              title: item.title,
              position: itemPosition,
            })),
          };
        }),
      };
    }),
  };
}

export function countSeedIds(seed: TemplateSeed) {
  const stageCount = seed.stages.length;
  const milestoneCount = seed.stages.reduce((n, s) => n + s.milestones.length, 0);
  const itemCount = seed.stages.reduce(
    (n, s) => n + s.milestones.reduce((m, ms) => m + ms.items.length, 0),
    0,
  );
  return { stageCount, milestoneCount, itemCount };
}
