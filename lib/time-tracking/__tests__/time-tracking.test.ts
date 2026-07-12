import { describe, expect, it } from "vitest";
import { formatDurationMinutes, parseDurationInput } from "@/lib/time-tracking/format";
import { validateTimeEntryInput } from "@/lib/time-tracking/validation";
import type { TimeCategory, TimeEntryType } from "@/lib/time-tracking/types";

const projectCategory: TimeCategory = {
  id: "cat-1",
  name: "Projekt",
  description: "",
  color: "#3b82f6",
  icon: "folder",
  isActive: true,
  sortOrder: 10,
  defaultBillable: false,
  requiresProject: true,
};

const workType: TimeEntryType = {
  id: "type-1",
  name: "Praca",
  countsAsWork: true,
  countsAsAbsence: false,
  allowsBillable: true,
  requiresDescription: false,
  requiresProject: false,
  isActive: true,
  sortOrder: 10,
};

describe("time-tracking format", () => {
  it("formats minutes as hours and minutes", () => {
    expect(formatDurationMinutes(90)).toBe("1 h 30 min");
    expect(formatDurationMinutes(120)).toBe("2 h");
    expect(formatDurationMinutes(45)).toBe("45 min");
  });

  it("parses duration input variants", () => {
    expect(parseDurationInput("2h")).toBe(120);
    expect(parseDurationInput("90m")).toBe(90);
    expect(parseDurationInput("1h 30m")).toBe(90);
    expect(parseDurationInput("1.5")).toBe(90);
  });
});

describe("time-tracking validation", () => {
  it("requires project for project category", () => {
    const error = validateTimeEntryInput(
      {
        date: "2026-07-12",
        durationMinutes: 60,
        categoryId: projectCategory.id,
        entryTypeId: workType.id,
      },
      projectCategory,
      workType,
    );
    expect(error).toMatch(/projekt/i);
  });

  it("accepts valid manual entry", () => {
    const error = validateTimeEntryInput(
      {
        date: "2026-07-12",
        durationMinutes: 60,
        categoryId: projectCategory.id,
        entryTypeId: workType.id,
        projectId: "project-1",
      },
      projectCategory,
      workType,
    );
    expect(error).toBeNull();
  });
});
