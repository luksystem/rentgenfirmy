import { describe, expect, it } from "vitest";
import {
  checklistPayloadFromTexts,
  checklistProgress,
  emptyChecklistPayload,
  getChecklistLineAssignee,
  isChecklistLineDone,
  mergeChecklistPayloadWithTemplate,
  normalizeChecklistPayload,
  projectChecklistPayloadFromTemplate,
} from "@/lib/process/item-payload";
import type { ChecklistLine } from "@/lib/process/types";

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

  it("scala zamiast duplikować, gdy szablonowa sekcja ma tę samą nazwę co osierocona (niestabilne id)", () => {
    // Regresja: zastępczy payload liczony z tytułu elementu (gdy katalog nie ma zdefiniowanych
    // punktów) potrafił dostać niestabilne id przy każdej synchronizacji, przez co ta sama
    // koncepcyjnie lista "Checklista" dokładała się jako kolejna, odrębna sekcja zamiast się scalić.
    const projectInstance = {
      sections: [
        {
          id: "old-random-id",
          name: "Checklista",
          position: 0,
          lines: [
            { id: "old-line-id", text: "Tytuł elementu", checked: false, status: "NOT_STARTED" as const },
            { id: "custom-1", text: "punkt", checked: false, status: "NOT_STARTED" as const, isCustom: true },
          ],
        },
      ],
    };
    const freshTemplate = {
      sections: [
        {
          id: "new-random-id",
          name: "Checklista",
          position: 0,
          lines: [{ id: "new-line-id", text: "Tytuł elementu", checked: false, status: "NOT_STARTED" as const }],
        },
      ],
    };

    const merged = mergeChecklistPayloadWithTemplate(projectInstance, freshTemplate);

    expect(merged.sections).toHaveLength(1);
    expect(merged.sections[0].lines.map((line) => line.text).sort()).toEqual(
      ["Tytuł elementu", "punkt"].sort(),
    );
  });
});

describe("isChecklistLineDone", () => {
  function makeLine(overrides: Partial<ChecklistLine> = {}): ChecklistLine {
    return { id: "line-1", text: "Punkt", checked: false, status: "NOT_STARTED", ...overrides };
  }

  it("nie jest zrobiony gdy status nieukończony i nie ogarnięte", () => {
    expect(isChecklistLineDone(makeLine({ status: "FAILED" }))).toBe(false);
    expect(isChecklistLineDone(makeLine({ status: "IN_PROGRESS" }))).toBe(false);
  });

  it("jest zrobiony dla PASSED/NOT_APPLICABLE niezależnie od handledAt", () => {
    expect(isChecklistLineDone(makeLine({ status: "PASSED" }))).toBe(true);
    expect(isChecklistLineDone(makeLine({ status: "NOT_APPLICABLE" }))).toBe(true);
  });

  it("jest zrobiony gdy ogarnięte, mimo statusu FAILED — status linii zostaje bez zmian", () => {
    const line = makeLine({ status: "FAILED", handledAt: "2026-08-01T00:00:00Z" });
    expect(isChecklistLineDone(line)).toBe(true);
    expect(line.status).toBe("FAILED");
  });

  it("normalizeChecklistPayload zachowuje pola ogarnięte (regresja: persist() ucinał je przy każdym zapisie)", () => {
    const payload = {
      sections: [
        {
          id: "s1",
          name: "Sekcja",
          position: 0,
          lines: [
            {
              id: "a",
              text: "Punkt",
              checked: false,
              status: "FAILED",
              handledAt: "2026-08-01T00:00:00Z",
              handledByName: "Jan Kowalski",
              handledNote: "Przeniesione do ustaleń.",
            },
          ],
        },
      ],
    };
    const normalized = normalizeChecklistPayload(payload);
    const line = normalized.sections[0].lines[0];
    expect(line.handledAt).toBe("2026-08-01T00:00:00Z");
    expect(line.handledByName).toBe("Jan Kowalski");
    expect(line.handledNote).toBe("Przeniesione do ustaleń.");
  });

  it("checklistProgress liczy ogarnięte linie jako zrobione", () => {
    const payload = {
      sections: [
        {
          id: "s1",
          name: "Sekcja",
          position: 0,
          lines: [
            makeLine({ id: "a", status: "FAILED", handledAt: "2026-08-01T00:00:00Z" }),
            makeLine({ id: "b", status: "NOT_STARTED" }),
          ],
        },
      ],
    };
    expect(checklistProgress(payload)).toEqual({ total: 2, completed: 1 });
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
