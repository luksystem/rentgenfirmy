import { describe, expect, it } from "vitest";
import { cloneProcessTemplate, parseProcessTemplateSnapshot } from "@/lib/process/anchored-template";
import type { ProcessTemplate } from "@/lib/process/types";

/**
 * Test round-trip: pełny szablon (wszystkie pola, łącznie z atrybutami standardu firmy
 * dodanymi w fazie 1 — /docs/08 D1) przez cloneProcessTemplate -> zapis jako jsonb ->
 * parseProcessTemplateSnapshot, z asercją braku utraty pól.
 *
 * Powód istnienia tego testu (docs/08, dopisek do zakresu fazy 1): parseProcessTemplateSnapshot
 * wymienia pola jawnie przy odczycie z JSON. Każdy przyszły atrybut szablonu wymaga dotknięcia
 * TEGO pliku testowego (dodania pola do fixture'a poniżej) i parsera — inaczej ten test czerwienieje,
 * zamiast ciche zgubienie pola ujawnić się dopiero w produkcji.
 *
 * Ograniczenie: ta lista jest utrzymywana ręcznie, nie czyta schematu z żywej bazy (brak połączenia
 * z DB w testach jednostkowych). Jeśli ktoś doda kolumnę do process_stages w migracji SQL, ale nie
 * doda jej tutaj i do parsera — ten test tego nie złapie. Złapie tylko sytuację odwrotną: pole jest
 * w fixture, ale parser je gubi.
 */

const FULL_STAGE_FIELDS: Array<keyof ProcessTemplate["stages"][number]> = [
  "id",
  "templateId",
  "title",
  "description",
  "forClosing",
  "position",
  "milestones",
  "minPeopleCount",
  "optimalPeopleCount",
  "estimatedDurationDays",
  "estimatedLaborHours",
  "defaultLaborBudget",
  "defaultMaterialBudget",
  "defaultRiskItemId",
  "canRunInParallel",
  "requiresLeader",
  "allowsTrainee",
  "requiredRoles",
  "requiredCompetencies",
  "dependsOnStageIds",
  "baseCommunicationPhase",
  "weightComm",
  "weightCoord",
  "slaDays",
  "requiresProjectStageLead",
  "roleResponsibility",
  "code",
];

function buildFullTemplate(): ProcessTemplate {
  return {
    id: "template-1",
    projectType: "dom_jednorodzinny",
    name: "Standard realizacji",
    description: "Opis szablonu",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    stages: [
      {
        id: "stage-8",
        templateId: "template-1",
        title: "Montaże urządzeń",
        description: "Etap montażowy",
        forClosing: false,
        position: 8,
        minPeopleCount: 2,
        optimalPeopleCount: 3,
        estimatedDurationDays: 30,
        estimatedLaborHours: 200,
        defaultLaborBudget: 15000,
        defaultMaterialBudget: 5000,
        defaultRiskItemId: "risk-1",
        canRunInParallel: false,
        requiresLeader: true,
        allowsTrainee: true,
        requiredRoles: [{ roleItemId: "role-item-1", minCount: 2 }],
        requiredCompetencies: [{ competencyItemId: "comp-1", minLevelItemId: "level-3" }],
        dependsOnStageIds: ["stage-7"],
        baseCommunicationPhase: "INTENSYWNA",
        weightComm: null,
        weightCoord: null,
        slaDays: {},
        requiresProjectStageLead: true,
        code: "etap_08",
        roleResponsibility: [
          { roleCode: "koordynator_techniczny", isGlowny: true, isWspiera: false, isKomunikuje: false },
          { roleCode: "opiekun_projektu", isGlowny: false, isWspiera: false, isKomunikuje: true },
          { roleCode: "projektant", isGlowny: true, isWspiera: false, isKomunikuje: true },
        ],
        milestones: [
          {
            id: "milestone-1",
            stageId: "stage-8",
            title: "Gotowość do uruchomienia",
            position: 0,
            items: [
              {
                id: "item-1",
                milestoneId: "milestone-1",
                elementId: "element-1",
                kind: "checklist",
                title: "Checklista montażowa",
                position: 0,
                defaultPayload: { sections: [] },
                isInternalAcceptance: false,
                startsWarranty: false,
                leadDays: 5,
                effortDays: 2,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("round-trip szablonu procesu (klon + zapis jako snapshot + parser)", () => {
  it("nie gubi żadnego pola etapu przy clone -> jsonb -> parse", () => {
    const template = buildFullTemplate();

    const cloned = cloneProcessTemplate(template);
    // Symulacja przejścia przez kolumnę jsonb (tak jak project_processes.template_snapshot).
    const asJsonb = JSON.parse(JSON.stringify(cloned));
    const parsed = parseProcessTemplateSnapshot(asJsonb);

    expect(parsed).not.toBeNull();
    expect(parsed).toEqual(template);
  });

  it("fixture testowa pokrywa wszystkie znane pola ProcessStage — jeśli to się wywali, dopisz pole do FULL_STAGE_FIELDS i do fixture'a", () => {
    const template = buildFullTemplate();
    const stageKeys = Object.keys(template.stages[0]).sort();
    expect(stageKeys).toEqual([...FULL_STAGE_FIELDS].sort());
  });
});
