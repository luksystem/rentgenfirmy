import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test round-trip ZAPISU (docs/08 D41) — drugi obok istniejącego `anchored-template-roundtrip`,
 * który sprawdza podróż przez SNAPSHOT (clone+parse). Ten sprawdza podróż przez BAZĘ:
 * co edytor wysyła do `saveProcessTemplate`, musi trafić do kolumn.
 *
 * Powód istnienia: `saveProcessTemplate` kasował etapy i wstawiał od nowa, a `insertTemplateStagesGraph`
 * nie zapisywał pięciu atrybutów etapu z fazy 1 ani macierzy odpowiedzialności. Efekt: pierwszy zapis
 * szablonu w edytorze cicho zerował konfigurację, o czym dowiedzieliśmy się po miesiącach i
 * przypadkiem. Ten test zamyka całą klasę — patrz asercja „kompletność mapowania" niżej.
 */

type RecordedWrite = { table: string; op: "upsert" | "insert" | "delete"; rows: unknown };

const writes: RecordedWrite[] = [];

function makeQuery(table: string) {
  const record = (op: RecordedWrite["op"], rows: unknown) => {
    writes.push({ table, op, rows });
    return Promise.resolve({ error: null });
  };

  return {
    upsert: (rows: unknown) => record("upsert", rows),
    insert: (rows: unknown) => record("insert", rows),
    delete: () => ({
      eq: () => record("delete", null),
    }),
  };
}

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ from: (table: string) => makeQuery(table) }),
}));

const { insertTemplateStagesGraph } = await import("@/lib/supabase/process-repository");

/**
 * Pola `ProcessStage`, które NIE trafiają do kolumn `process_stages` — bo są strukturą grafu,
 * nie atrybutem etapu. Wszystko inne MUSI mieć odwzorowanie w kolumnie.
 */
const STRUCTURAL_STAGE_FIELDS = new Set([
  "id",
  "templateId",
  "milestones",
  "requiredRoles",
  "requiredCompetencies",
  "dependsOnStageIds",
  "roleResponsibility",
]);

/** Odwzorowanie atrybutów etapu na kolumny. Dopisanie pola do `ProcessStage` bez dopisania go tutaj
 *  ORAZ do zapisu wywala test — o to chodzi. */
const STAGE_FIELD_TO_COLUMN: Record<string, string> = {
  title: "title",
  description: "description",
  forClosing: "for_closing",
  position: "position",
  minPeopleCount: "min_people_count",
  optimalPeopleCount: "optimal_people_count",
  estimatedDurationDays: "estimated_duration_days",
  estimatedLaborHours: "estimated_labor_hours",
  defaultLaborBudget: "default_labor_budget",
  defaultMaterialBudget: "default_material_budget",
  defaultRiskItemId: "default_risk_item_id",
  canRunInParallel: "can_run_in_parallel",
  requiresLeader: "requires_leader",
  allowsTrainee: "allows_trainee",
  code: "code",
  baseCommunicationPhase: "base_communication_phase",
  weightComm: "weight_comm",
  weightCoord: "weight_coord",
  slaDays: "sla_days",
  requiresProjectStageLead: "requires_project_stage_lead",
};

function fullyPopulatedTemplate() {
  return {
    id: "tpl-1",
    projectType: "DOM",
    name: "Proces — DOM",
    description: "opis szablonu",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    stages: [
      {
        id: "stage-1",
        templateId: "tpl-1",
        title: "Dostawa i montaż rozdzielni",
        description: "opis etapu",
        forClosing: false,
        position: 6,
        minPeopleCount: 2,
        optimalPeopleCount: 3,
        estimatedDurationDays: 5,
        estimatedLaborHours: 40,
        defaultLaborBudget: 1000,
        defaultMaterialBudget: 2000,
        defaultRiskItemId: "risk-1",
        canRunInParallel: true,
        requiresLeader: true,
        allowsTrainee: false,
        code: "etap_07",
        baseCommunicationPhase: "INTENSYWNA" as const,
        weightComm: 1.5,
        weightCoord: 2.5,
        slaDays: { rozstrzygniecie: 7 },
        requiresProjectStageLead: true,
        roleResponsibility: [
          { roleCode: "koordynator_techniczny", isGlowny: true, isWspiera: false, isKomunikuje: true },
          { roleCode: "opiekun_projektu", isGlowny: false, isWspiera: false, isKomunikuje: true },
        ],
        requiredRoles: [],
        requiredCompetencies: [],
        dependsOnStageIds: [],
        milestones: [
          {
            id: "ms-1",
            stageId: "stage-1",
            title: "Rozdzielnia przekazana",
            position: 0,
            items: [
              {
                id: "item-1",
                milestoneId: "ms-1",
                elementId: "el-1",
                kind: "protocol" as const,
                title: "Protokół przekazania",
                position: 0,
                defaultPayload: { columns: [] },
                isInternalAcceptance: false,
                startsWarranty: true,
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

describe("round-trip zapisu szablonu do bazy", () => {
  beforeEach(() => {
    writes.length = 0;
  });

  it("kompletność mapowania: każdy atrybut etapu ma kolumnę i trafia do zapisu", async () => {
    const template = fullyPopulatedTemplate();
    const stage = template.stages[0];

    // 1. Żadne pole ProcessStage nie może wypaść poza świadomą klasyfikację.
    const unclassified = Object.keys(stage).filter(
      (key) => !STRUCTURAL_STAGE_FIELDS.has(key) && !(key in STAGE_FIELD_TO_COLUMN),
    );
    expect(
      unclassified,
      "Nowe pole etapu bez odwzorowania na kolumnę — dopisz je do STAGE_FIELD_TO_COLUMN i do zapisu",
    ).toEqual([]);

    // 2. Każda zmapowana kolumna faktycznie trafia do zapisu, z właściwą wartością.
    await insertTemplateStagesGraph(template as never);

    const stageWrite = writes.find((w) => w.table === "process_stages");
    expect(stageWrite, "brak zapisu do process_stages").toBeDefined();
    const row = stageWrite!.rows as Record<string, unknown>;

    for (const [field, column] of Object.entries(STAGE_FIELD_TO_COLUMN)) {
      expect(row, `kolumna ${column} (pole ${field}) nie trafia do zapisu`).toHaveProperty(column);
      expect(row[column], `kolumna ${column} zapisana z inną wartością niż w szablonie`).toEqual(
        stage[field as keyof typeof stage],
      );
    }
  });

  it("zapisuje macierz odpowiedzialności — to ona ginęła (D41)", async () => {
    await insertTemplateStagesGraph(fullyPopulatedTemplate() as never);

    const matrixWrite = writes.find(
      (w) => w.table === "process_stage_role_responsibility" && w.op === "insert",
    );
    expect(matrixWrite, "macierz odpowiedzialności nie jest zapisywana").toBeDefined();
    expect(matrixWrite!.rows).toEqual([
      {
        stage_id: "stage-1",
        role_code: "koordynator_techniczny",
        is_glowny: true,
        is_wspiera: false,
        is_komunikuje: true,
      },
      {
        stage_id: "stage-1",
        role_code: "opiekun_projektu",
        is_glowny: false,
        is_wspiera: false,
        is_komunikuje: true,
      },
    ]);
  });

  it("zapisuje atrybuty elementu (lead/effort/gwarancja/payload)", async () => {
    await insertTemplateStagesGraph(fullyPopulatedTemplate() as never);

    const itemsWrite = writes.find((w) => w.table === "process_items");
    expect(itemsWrite).toBeDefined();
    const rows = itemsWrite!.rows as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({
      lead_days: 5,
      effort_days: 2,
      starts_warranty: true,
      default_payload: { columns: [] },
      is_internal_acceptance: false,
    });
  });

  it("używa upsertu, nie insertu — inaczej kolumny spoza payloadu wracają do domyślnych", async () => {
    await insertTemplateStagesGraph(fullyPopulatedTemplate() as never);

    for (const table of ["process_stages", "process_milestones", "process_items"]) {
      const write = writes.find((w) => w.table === table);
      expect(write?.op, `${table} musi być zapisywane upsertem`).toBe("upsert");
    }
  });

  it("nie rusza list, których payload nie zna (undefined ≠ pusta lista)", async () => {
    const template = fullyPopulatedTemplate();
    // Szablon zbudowany z seeda nie niesie macierzy — zapis nie może jej wtedy wyczyścić.
    delete (template.stages[0] as { roleResponsibility?: unknown }).roleResponsibility;

    await insertTemplateStagesGraph(template as never);

    const touched = writes.some((w) => w.table === "process_stage_role_responsibility");
    expect(touched, "payload bez macierzy nie może jej kasować").toBe(false);
  });
});
