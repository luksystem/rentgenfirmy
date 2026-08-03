import { describe, expect, it } from "vitest";
import { renderStageReportText } from "@/lib/stage-report/render";
import type { StageReportContent } from "@/lib/stage-report/types";

function baseContent(overrides: Partial<StageReportContent> = {}): StageReportContent {
  return {
    projectName: "Testowy",
    stageTitle: "Etap testowy",
    milestoneTitle: "Kamień testowy",
    milestoneReachedAt: "2026-01-01T00:00:00.000Z",
    completedItems: [],
    documents: [],
    changes: [],
    carriedOverItems: [],
    clientNeeds: [],
    nextStage: null,
    ...overrides,
  };
}

describe("renderStageReportText — sekcja CO ZOSTAŁO ZROBIONE", () => {
  it("pusta lista completedItems drukuje jawny placeholder, nie znika", () => {
    const text = renderStageReportText(baseContent(), "");
    expect(text).toContain("CO ZOSTAŁO ZROBIONE");
    expect(text).toContain("brak ukończonych pozycji");
  });

  it("element kanban z closedTaskCount pokazuje liczbę zamkniętych zadań", () => {
    const text = renderStageReportText(
      baseContent({
        completedItems: [
          { title: "Lista montażowa", kind: "kanban", completedAt: "2026-01-05T00:00:00.000Z", closedTaskCount: 14 },
        ],
      }),
      "",
    );
    expect(text).toContain("Lista montażowa (tablica kanban, 14 zadań zamkniętych)");
  });

  it("element kanban z jednym zadaniem używa liczby pojedynczej", () => {
    const text = renderStageReportText(
      baseContent({
        completedItems: [
          { title: "Board X", kind: "kanban", completedAt: null, closedTaskCount: 1 },
        ],
      }),
      "",
    );
    expect(text).toContain("Board X (tablica kanban, 1 zadanie zamkniętych)");
  });

  it("checklist i protocol nie pokazują liczby zadań (pole tylko dla kanban)", () => {
    const text = renderStageReportText(
      baseContent({
        completedItems: [
          { title: "Checklista wejściowa", kind: "checklist", completedAt: "2026-01-02T00:00:00.000Z" },
          { title: "Protokół odbioru", kind: "protocol", completedAt: "2026-01-03T00:00:00.000Z" },
        ],
      }),
      "",
    );
    expect(text).toContain("Checklista wejściowa (checklista)");
    expect(text).toContain("Protokół odbioru (protokół)");
  });

  it("kanban bez closedTaskCount (undefined) nie dopisuje licznika", () => {
    const text = renderStageReportText(
      baseContent({
        completedItems: [{ title: "Board Y", kind: "kanban", completedAt: null }],
      }),
      "",
    );
    expect(text).toContain("Board Y (tablica kanban)");
    expect(text).not.toContain("zamkniętych");
  });
});
