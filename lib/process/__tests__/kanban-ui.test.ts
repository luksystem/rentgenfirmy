import { describe, expect, it } from "vitest";
import { countOverdueKanbanTasks, getKanbanDueDateTextClasses } from "@/lib/process/kanban-ui";
import type { KanbanTask } from "@/lib/process/kanban-types";

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
  return {
    id: "task-1",
    columnId: "column-1",
    title: "Zadanie",
    description: "",
    priority: "normal",
    dueDate: null,
    position: 0,
    closedAt: null,
    assigneeName: null,
    assigneeId: null,
    roleItemId: null,
    createdBySide: "team",
    isNewForTeam: false,
    sourceAgreementId: null,
    sourceChangeRequestId: null,
    completionNote: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const PAST_DATE = "2000-01-01";

describe("countOverdueKanbanTasks", () => {
  it("liczy otwarte zadanie z terminem w przeszłości jako przeterminowane", () => {
    const tasks = [makeTask({ dueDate: PAST_DATE })];
    expect(countOverdueKanbanTasks(tasks)).toBe(1);
  });

  it("nie liczy zamkniętego zadania jako przeterminowanego", () => {
    const tasks = [makeTask({ dueDate: PAST_DATE, closedAt: "2020-01-02T00:00:00.000Z" })];
    expect(countOverdueKanbanTasks(tasks)).toBe(0);
  });

  it("nie liczy zadania jako przeterminowanego, gdy kolumna czeka na zewnętrzne", () => {
    const tasks = [makeTask({ dueDate: PAST_DATE })];
    expect(countOverdueKanbanTasks(tasks, "CZEKA_NA_ZEWNETRZNE")).toBe(0);
  });

  it("nadal liczy jako przeterminowane dla innych statusów ROT", () => {
    const tasks = [makeTask({ dueDate: PAST_DATE })];
    expect(countOverdueKanbanTasks(tasks, "W_TOKU")).toBe(1);
    expect(countOverdueKanbanTasks(tasks, null)).toBe(1);
  });

  it("z resolverem per zadanie liczy poprawnie mimo różnych źródłowych statusów ROT w tej samej scalonej kolumnie", () => {
    // Widok zbiorczy (Tablice wdrożeń) łączy kolumny o tej samej nazwie z różnych projektów —
    // jedno zadanie może pochodzić z kolumny "W_TOKU", drugie z "CZEKA_NA_ZEWNETRZNE".
    const tasks = [
      makeTask({ id: "task-a", dueDate: PAST_DATE }),
      makeTask({ id: "task-b", dueDate: PAST_DATE }),
    ];
    const rotStatusByTaskId: Record<string, "CZEKA_NA_ZEWNETRZNE" | "W_TOKU"> = {
      "task-a": "W_TOKU",
      "task-b": "CZEKA_NA_ZEWNETRZNE",
    };
    const resolver = (task: KanbanTask) => rotStatusByTaskId[task.id];
    expect(countOverdueKanbanTasks(tasks, resolver)).toBe(1);
  });
});

describe("getKanbanDueDateTextClasses", () => {
  it("zwraca kolor przeterminowany dla zwykłej kolumny", () => {
    expect(getKanbanDueDateTextClasses(PAST_DATE)).toBe("text-rose-300");
  });

  it("nie oznacza jako przeterminowane w kolumnie czekającej na zewnętrzne", () => {
    expect(getKanbanDueDateTextClasses(PAST_DATE, "CZEKA_NA_ZEWNETRZNE")).not.toBe("text-rose-300");
  });
});
