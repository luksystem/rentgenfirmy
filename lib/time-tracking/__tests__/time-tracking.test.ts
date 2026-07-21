import { describe, expect, it } from "vitest";
import { formatDurationHm, formatDurationMinutes, parseDurationInput } from "@/lib/time-tracking/format";
import { findOverlapMessage, rangesOverlap } from "@/lib/time-tracking/overlap";
import { buildWeekTimeReport } from "@/lib/time-tracking/reports";
import { resolveTimesheetPeriod, shiftTimesheetPeriod } from "@/lib/time-tracking/timesheet-period";
import { buildTimesheetSummary } from "@/lib/time-tracking/timesheet-summary";
import {
  buildProjectBreakdownForEntries,
  buildTeamPeriodDetail,
} from "@/lib/time-tracking/team-period-detail";
import { buildWorkPeriodBalance } from "@/lib/time-tracking/period-balance";
import {
  resolveLeaveEntryTypeCode,
  shouldSyncLeaveToTimeEntries,
} from "@/lib/time-tracking/leave-type-mapping";
import {
  buildExpectedWorkMinutes,
  countWorkingDaysInRange,
} from "@/lib/time-tracking/work-schedule";
import {
  buildMatrixDateMeta,
  resolveLeaveForUserOnDate,
} from "@/lib/time-tracking/calendar-day-markers";
import {
  buildPlanTimeSuggestionDrafts,
  distributeMinutesAcrossWorkingDays,
} from "@/lib/time-tracking/plan-suggestions";
import { buildProjectHourBudget } from "@/lib/time-tracking/project-hour-budget";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import {
  canApproveTimesheetStatus,
  canSubmitTimesheetStatus,
  collectTimesheetSubmitIssues,
} from "@/lib/time-tracking/timesheet-validation";
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

  it("formats minutes as h:mm for timesheets", () => {
    expect(formatDurationHm(90)).toBe("1:30");
    expect(formatDurationHm(480)).toBe("8:00");
    expect(formatDurationHm(0)).toBe("0:00");
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

describe("timesheet period", () => {
  it("resolves week range from monday to sunday", () => {
    const range = resolveTimesheetPeriod("week", new Date("2026-07-15T12:00:00"));
    expect(range.dateFrom).toBe("2026-07-13");
    expect(range.dateTo).toBe("2026-07-19");
  });

  it("resolves month range", () => {
    const range = resolveTimesheetPeriod("month", new Date("2026-07-15T12:00:00"));
    expect(range.dateFrom).toBe("2026-07-01");
    expect(range.dateTo).toBe("2026-07-31");
  });

  it("shifts week and month periods", () => {
    const week = resolveTimesheetPeriod("week", new Date("2026-07-15T12:00:00"));
    expect(shiftTimesheetPeriod(week, 1).dateFrom).toBe("2026-07-20");

    const month = resolveTimesheetPeriod("month", new Date("2026-07-15T12:00:00"));
    expect(shiftTimesheetPeriod(month, 1).dateFrom).toBe("2026-08-01");
    expect(shiftTimesheetPeriod(month, -1).dateFrom).toBe("2026-06-01");
  });
});

describe("timesheet summary", () => {
  it("builds daily breakdown for each day in range", () => {
    const entries = [
      {
        id: "1",
        date: "2026-07-14",
        durationMinutes: 480,
        categoryId: "c1",
        categoryName: "Projekt",
        categoryColor: "#000",
        entryTypeId: "t1",
        entryTypeName: "Praca",
        billable: true,
      },
      {
        id: "2",
        date: "2026-07-15",
        durationMinutes: 60,
        categoryId: "c1",
        categoryName: "Projekt",
        categoryColor: "#000",
        entryTypeId: "t2",
        entryTypeName: "Urlop",
        billable: false,
      },
    ] as TimeEntryView[];

    const summary = buildTimesheetSummary(
      null,
      entries,
      "2026-07-13",
      "2026-07-15",
      [
        { id: "t1", name: "Praca", countsAsWork: true, countsAsAbsence: false },
        { id: "t2", name: "Urlop", countsAsWork: false, countsAsAbsence: true },
      ],
    );

    expect(summary.dailyBreakdown).toHaveLength(3);
    expect(summary.dailyBreakdown[0]?.totalMinutes).toBe(0);
    expect(summary.dailyBreakdown[1]?.workMinutes).toBe(480);
    expect(summary.dailyBreakdown[2]?.absenceMinutes).toBe(60);
    expect(summary.report.totalMinutes).toBe(540);
    expect(summary.balance.actualWorkMinutes).toBe(480);
  });
});

describe("work schedule", () => {
  it("counts working days excluding weekends", () => {
    expect(countWorkingDaysInRange("2026-07-13", "2026-07-19")).toBe(5);
  });

  it("builds expected minutes from daily norm", () => {
    const result = buildExpectedWorkMinutes("2026-07-13", "2026-07-19", 8);
    expect(result.workingDays).toBe(5);
    expect(result.expectedWorkMinutes).toBe(5 * 480);
  });
});

describe("period balance", () => {
  it("computes balance against expected work", () => {
    const balance = buildWorkPeriodBalance(
      {
        workMinutes: 2400,
        absenceMinutes: 480,
        totalMinutes: 2880,
        byType: [],
      },
      "2026-07-13",
      "2026-07-19",
      8,
    );
    expect(balance.expectedWorkMinutes).toBe(2400);
    expect(balance.balanceMinutes).toBe(0);
  });
});

describe("calendar day markers", () => {
  it("marks weekends and holidays as day off", () => {
    const saturday = buildMatrixDateMeta("2026-07-18");
    expect(saturday.isWeekend).toBe(true);
    expect(saturday.isDayOff).toBe(true);

    const holiday = buildMatrixDateMeta("2026-11-11");
    expect(holiday.holidayName).toBeTruthy();
    expect(holiday.isDayOff).toBe(true);
  });

  it("prefers approved leave over pending on the same day", () => {
    const leaves = [
      {
        id: "l1",
        profileId: "u1",
        leaveTypeItemId: "t1",
        startDate: "2026-07-14",
        endDate: "2026-07-16",
        status: "pending",
      },
      {
        id: "l2",
        profileId: "u1",
        leaveTypeItemId: "t2",
        startDate: "2026-07-15",
        endDate: "2026-07-15",
        status: "approved",
      },
    ] as import("@/lib/leave/types").LeaveRequest[];

    const meta = resolveLeaveForUserOnDate("u1", "2026-07-15", leaves, () => "Urlop");
    expect(meta?.status).toBe("approved");
  });
});

describe("plan time suggestions", () => {
  it("distributes minutes evenly across working days", () => {
    const map = distributeMinutesAcrossWorkingDays(480, "2026-07-13", "2026-07-17");
    expect(map.size).toBe(5);
    expect([...map.values()].reduce((sum, value) => sum + value, 0)).toBe(480);
  });

  it("builds drafts for assignee and skips covered days", () => {
    const item = {
      id: "plan-1",
      projectId: "p1",
      clientId: null,
      processStageId: null,
      taskId: null,
      serviceIntakeRequestId: null,
      workTypeItemId: null,
      title: "Montaż rozdzielni",
      startAt: "2026-07-14T08:00:00.000Z",
      endAt: "2026-07-16T16:00:00.000Z",
      plannedHours: 24,
      actualHours: null,
      assigneeId: "u1",
      teamItemId: null,
      statusItemId: null,
      riskItemId: null,
      riskNote: "",
      laborBudget: null,
      materialBudget: null,
      travelBudget: null,
      notes: "",
      acceptedRisk: false,
      createdBy: null,
      linkedGroupId: null,
      shiftWithLinkedGroup: false,
      participants: [],
      requiredCompetencies: [],
      createdAt: "",
      updatedAt: "",
    } satisfies ResourcePlanItem;

    const drafts = buildPlanTimeSuggestionDrafts({
      items: [item],
      userId: "u1",
      dateFrom: "2026-07-14",
      dateTo: "2026-07-16",
      existingEntries: [{ resourcePlanItemId: "plan-1", date: "2026-07-14" }],
    });

    expect(drafts.some((draft) => draft.date === "2026-07-14")).toBe(false);
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every((draft) => draft.categoryCode === "project")).toBe(true);
  });
});

describe("project hour budget", () => {
  it("computes utilization against hour quotas", () => {
    const budget = buildProjectHourBudget(
      [
        {
          id: "q1",
          projectId: "p1",
          label: "Programista",
          quantity: 40,
          unit: "hours",
          position: 0,
          notes: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
      30 * 60,
    );

    expect(budget?.totalBudgetMinutes).toBe(2400);
    expect(budget?.utilizationPercent).toBe(75);
    expect(budget?.overBudget).toBe(false);
    expect(budget?.usageOnly).toBe(false);
  });

  it("returns usage-only summary when hourly without quotas", () => {
    const budget = buildProjectHourBudget([], 90, { allowUsageOnly: true });
    expect(budget?.usageOnly).toBe(true);
    expect(budget?.totalUsedMinutes).toBe(90);
    expect(budget?.totalBudgetMinutes).toBe(0);
  });
});

describe("leave type mapping", () => {
  it("maps sick leave to sick entry type", () => {
    expect(resolveLeaveEntryTypeCode("Zwolnienie lekarskie")).toBe("sick");
  });

  it("skips business trips", () => {
    expect(shouldSyncLeaveToTimeEntries("Delegacja / wyjazd służbowy")).toBe(false);
  });
});

describe("team period detail", () => {
  it("builds project breakdown grouped by project with daily minutes", () => {
    const entries = [
      {
        id: "1",
        userId: "u1",
        date: "2026-07-14",
        durationMinutes: 240,
        categoryId: "c1",
        categoryName: "Projekt",
        categoryColor: "#000",
        entryTypeId: "t1",
        entryTypeName: "Praca",
        billable: true,
        projectId: "p1",
        projectName: "Alpha",
        serviceId: null,
        description: "Prace na budowie",
      },
      {
        id: "2",
        userId: "u1",
        date: "2026-07-15",
        durationMinutes: 120,
        categoryId: "c1",
        categoryName: "Projekt",
        categoryColor: "#000",
        entryTypeId: "t1",
        entryTypeName: "Praca",
        billable: false,
        projectId: "p1",
        projectName: "Alpha",
        serviceId: null,
        description: "",
      },
    ] as TimeEntryView[];

    const projects = buildProjectBreakdownForEntries(entries, "2026-07-13", "2026-07-15", [
      { id: "t1", countsAsWork: true, countsAsAbsence: false },
    ]);

    expect(projects).toHaveLength(1);
    expect(projects[0]?.projectLabel).toBe("Alpha");
    expect(projects[0]?.totalMinutes).toBe(360);
    expect(projects[0]?.minutesByDate["2026-07-14"]).toBe(240);
    expect(projects[0]?.entries).toHaveLength(2);
  });

  it("builds team matrix with daily totals per employee", () => {
    const detail = buildTeamPeriodDetail({
      dateFrom: "2026-07-14",
      dateTo: "2026-07-15",
      periodType: "week",
      entryTypeMeta: [{ id: "t1", countsAsWork: true, countsAsAbsence: false }],
      employees: [
        {
          userId: "u1",
          userDisplayName: "Anna",
          entries: [
            {
              id: "1",
              userId: "u1",
              date: "2026-07-14",
              durationMinutes: 480,
              categoryId: "c1",
              categoryName: "Projekt",
              categoryColor: "#000",
              entryTypeId: "t1",
              entryTypeName: "Praca",
              billable: true,
              projectId: "p1",
              projectName: "Alpha",
            },
          ] as TimeEntryView[],
        },
        {
          userId: "u2",
          userDisplayName: "Bartek",
          entries: [
            {
              id: "2",
              userId: "u2",
              date: "2026-07-15",
              durationMinutes: 60,
              categoryId: "c1",
              categoryName: "Projekt",
              categoryColor: "#000",
              entryTypeId: "t1",
              entryTypeName: "Praca",
              billable: false,
              projectId: null,
              projectName: null,
            },
          ] as TimeEntryView[],
        },
      ],
    });

    expect(detail.dates).toEqual(["2026-07-14", "2026-07-15"]);
    expect(detail.employees[0]?.minutesByDate["2026-07-14"]).toBe(480);
    expect(detail.totalsByDate["2026-07-15"]).toBe(60);
    expect(detail.totalMinutes).toBe(540);
  });
});

describe("timesheet validation", () => {
  it("allows submit only for draft or rejected", () => {
    expect(canSubmitTimesheetStatus("draft")).toBe(true);
    expect(canSubmitTimesheetStatus("rejected")).toBe(true);
    expect(canSubmitTimesheetStatus("submitted")).toBe(false);
    expect(canApproveTimesheetStatus("submitted")).toBe(true);
  });

  it("collects issues for invalid draft entries", () => {
    const entries = [
      {
        id: "e1",
        date: "2026-07-12",
        status: "draft",
        durationMinutes: 60,
        categoryId: projectCategory.id,
        entryTypeId: workType.id,
        categoryName: "Projekt",
        entryTypeName: "Praca",
        description: "",
        billable: false,
        projectId: null,
        clientId: null,
        workItemId: null,
        serviceId: null,
        remoteWork: false,
        delegation: false,
        breakMinutes: 0,
        startTime: null,
        endTime: null,
      },
    ] as TimeEntryView[];

    const issues = collectTimesheetSubmitIssues(entries, [projectCategory], [workType]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/projekt/i);
  });
});
