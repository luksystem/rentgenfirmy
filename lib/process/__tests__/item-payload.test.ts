import { describe, expect, it } from "vitest";
import {
  checklistPayloadFromTexts,
  emptyChecklistPayload,
  getChecklistLineAssignee,
  mergeChecklistPayloadWithTemplate,
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

describe("mergeChecklistPayloadWithTemplate", () => {
  it("aktualizuje treść punktu zachowując zaznaczenie klienta", () => {
    const template = checklistPayloadFromTexts(["Punkt A", "Punkt B"], "Lista startowa");
    const projectInstance = projectChecklistPayloadFromTemplate(template);
    projectInstance.sections[0].lines[0].checked = true;
    projectInstance.sections[0].lines[0].status = "PASSED";
    projectInstance.sections[0].lines[0].notes = "Zrobione na miejscu";

    const editedTemplate = {
      ...template,
      sections: [
        {
          ...template.sections[0],
          lines: [
            { ...template.sections[0].lines[0], text: "Punkt A (poprawiony)" },
            template.sections[0].lines[1],
          ],
        },
      ],
    };

    const merged = mergeChecklistPayloadWithTemplate(projectInstance, editedTemplate);

    expect(merged.sections[0].lines[0].text).toBe("Punkt A (poprawiony)");
    expect(merged.sections[0].lines[0].checked).toBe(true);
    expect(merged.sections[0].lines[0].status).toBe("PASSED");
    expect(merged.sections[0].lines[0].notes).toBe("Zrobione na miejscu");
    expect(merged.sections[0].lines[1].checked).toBe(false);
  });

  it("dokłada nowe punkty dodane w szablonie jako niewypełnione", () => {
    const template = checklistPayloadFromTexts(["Punkt A"], "Lista startowa");
    const projectInstance = projectChecklistPayloadFromTemplate(template);
    projectInstance.sections[0].lines[0].checked = true;
    projectInstance.sections[0].lines[0].status = "PASSED";

    const editedTemplate = {
      ...template,
      sections: [
        {
          ...template.sections[0],
          lines: [
            template.sections[0].lines[0],
            { id: "new-line", text: "Punkt B", checked: false, status: "NOT_STARTED" as const },
          ],
        },
      ],
    };

    const merged = mergeChecklistPayloadWithTemplate(projectInstance, editedTemplate);

    expect(merged.sections[0].lines).toHaveLength(2);
    expect(merged.sections[0].lines[0].checked).toBe(true);
    expect(merged.sections[0].lines[1].text).toBe("Punkt B");
    expect(merged.sections[0].lines[1].checked).toBe(false);
  });

  it("zachowuje punkt usunięty z szablonu, jeśli klient go już wypełnił", () => {
    const template = checklistPayloadFromTexts(["Punkt A", "Punkt B"], "Lista startowa");
    const projectInstance = projectChecklistPayloadFromTemplate(template);
    projectInstance.sections[0].lines[1].checked = true;
    projectInstance.sections[0].lines[1].status = "PASSED";

    const editedTemplate = {
      ...template,
      sections: [
        {
          ...template.sections[0],
          lines: [template.sections[0].lines[0]],
        },
      ],
    };

    const merged = mergeChecklistPayloadWithTemplate(projectInstance, editedTemplate);

    expect(merged.sections[0].lines).toHaveLength(2);
    const orphaned = merged.sections[0].lines.find((line) => line.text === "Punkt B");
    expect(orphaned?.checked).toBe(true);
  });

  it("nie zmienia instancji projektu gdy szablon nie ma punktów checklisty", () => {
    const projectInstance = projectChecklistPayloadFromTemplate(
      checklistPayloadFromTexts(["Punkt A"]),
    );
    const merged = mergeChecklistPayloadWithTemplate(projectInstance, emptyChecklistPayload());
    expect(merged).toEqual(projectInstance);
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
