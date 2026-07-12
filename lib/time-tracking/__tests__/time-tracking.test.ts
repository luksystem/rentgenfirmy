import { describe, expect, it } from "vitest";
import { formatDurationMinutes, parseDurationInput } from "@/lib/time-tracking/format";
import { findOverlapMessage, rangesOverlap } from "@/lib/time-tracking/overlap";
import { buildWeekTimeReport } from "@/lib/time-tracking/reports";
import { validateTimeEntryInput } from "@/lib/time-tracking/validation";
import type { TimeCategory, TimeEntryType, TimeEntryView } from "@/lib/time-tracking/types";

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

describe("time overlap", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap({ startMinutes: 60, endMinutes: 120 }, { startMinutes: 90, endMinutes: 150 })).toBe(
      true,
    );
    expect(rangesOverlap({ startMinutes: 60, endMinutes: 120 }, { startMinutes: 120, endMinutes: 180 })).toBe(
      false,
    );
  });

  it("returns overlap message for conflicting entries", () => {
    const message = findOverlapMessage(
      { startMinutes: 540, endMinutes: 600 },
      [{ id: "a", startTime: "08:00:00", endTime: "09:30:00" }],
    );
    expect(message).toMatch(/nakłada/i);
  });
});

describe("week report", () => {
  it("aggregates minutes by category", () => {
    const entries = [
      {
        id: "1",
        durationMinutes: 120,
        categoryId: "c1",
        categoryName: "Projekt",
        categoryColor: "#000",
        entryTypeId: "t1",
        entryTypeName: "Praca",
        billable: true,
      },
    ] as TimeEntryView[];

    const report = buildWeekTimeReport(entries, [
      { id: "t1", name: "Praca", countsAsWork: true, countsAsAbsence: false },
    ]);

    expect(report.totalMinutes).toBe(120);
    expect(report.workMinutes).toBe(120);
    expect(report.billableMinutes).toBe(120);
    expect(report.byCategory[0]?.categoryName).toBe("Projekt");
  });
});
