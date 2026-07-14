import { describe, expect, it } from "vitest";
import {
  checklistPayloadFromTexts,
  emptyChecklistPayload,
  getChecklistLineAssignee,
  projectChecklistPayloadFromTemplate,
} from "@/lib/process/item-payload";

describe("projectChecklistPayloadFromTemplate", () => {
  it("kopiuje punkty z formatu sections do instancji projektu", () => {
    const template = checklistPayloadFromTexts(["Punkt A", "Punkt B"], "Lista startowa");
    const project = projectChecklistPayloadFromTemplate(template);

    expect(project.sections).toHaveLength(1);
    expect(project.sections[0].name).toBe("Lista startowa");
    expect(project.sections[0].lines).toHaveLength(2);
    expect(project.sections[0].lines[0].text).toBe("Punkt A");
    expect(project.sections[0].lines[0].checked).toBe(false);
    expect(project.sections[0].lines[0].status).toBe("NOT_STARTED");
  });

  it("zwraca pusty payload gdy szablon nie ma punktów", () => {
    expect(projectChecklistPayloadFromTemplate(emptyChecklistPayload())).toEqual({
      sections: [],
    });
  });
});

describe("getChecklistLineAssignee", () => {
  it("dziedziczy osobę z całej checklisty gdy punkt nie ma własnego przypisania", () => {
    const line = checklistPayloadFromTexts(["Punkt"]).sections[0].lines[0];
    const result = getChecklistLineAssignee(line, {
      assigneeId: "user-1",
      assigneeName: "Jan Kowalski",
    });
    expect(result).toEqual({
      assigneeId: "user-1",
      assigneeName: "Jan Kowalski",
      inherited: true,
    });
  });

  it("preferuje przypisanie na punkcie nad domyślnym z checklisty", () => {
    const line = {
      ...checklistPayloadFromTexts(["Punkt"]).sections[0].lines[0],
      assigneeId: "user-2",
      assigneeName: "Anna Nowak",
    };
    const result = getChecklistLineAssignee(line, {
      assigneeId: "user-1",
      assigneeName: "Jan Kowalski",
    });
    expect(result).toEqual({
      assigneeId: "user-2",
      assigneeName: "Anna Nowak",
      inherited: false,
    });
  });
});
