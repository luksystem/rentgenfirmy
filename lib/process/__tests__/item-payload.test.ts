import { describe, expect, it } from "vitest";
import {
  checklistPayloadFromTexts,
  emptyChecklistPayload,
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
