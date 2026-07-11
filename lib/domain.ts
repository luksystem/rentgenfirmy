import { countBy, daysBetween } from "@/lib/utils";
import type { FieldOptions } from "@/lib/field-options";
import {
  isClosedFlowStatus,
  isInProgressFlowStatus,
  isWaitingFlowStatus,
  isWaitingWithExternalBlocker,
  isWaitingWithInternalBlocker,
} from "@/lib/field-options";
import {
  generateQuickWins,
  interruptionTrends,
} from "@/lib/report-insights";
import {
  createWeeklyPeriod,
  filterInterruptionsByPeriod,
  formatPeriodLabel,
  type ReportPeriod,
} from "@/lib/report-period";
import type {
  Interruption,
  Priority,
  Project,
  WeeklyReport,
} from "@/lib/types";

export function statusTone(
  status: string,
  priority?: Priority,
  isActive?: boolean,
  options?: FieldOptions,
) {
  if (priority === "Krytyczny") {
    return "critical";
  }

  if (isActive) {
    return "active";
  }

  if (options) {
    if (isClosedFlowStatus(status, options)) {
      return "closed";
    }

    if (isWaitingFlowStatus(status, options)) {
      return "waiting";
    }

    if (isInProgressFlowStatus(status, options)) {
      return "blue";
    }
  } else if (status === "Zamknięty") {
    return "closed";
  }

  return "waiting";
}

export function priorityWeight(priority: Priority) {
  return {
    Krytyczny: 4,
    Wysoki: 3,
    Normalny: 2,
    Niski: 1,
  }[priority];
}

export function isWithoutContact(project: Project, options: FieldOptions) {
  const today = new Date();
  return (
    new Date(project.nextContactDate) < today &&
    daysBetween(project.lastContactDate) > 14 &&
    !isClosedFlowStatus(project.flowStatus, options)
  );
}

export function projectMetrics(
  projects: Project[],
  options: FieldOptions,
  projectClosingFlags?: Map<string, boolean>,
) {
  return {
    all: projects.length,
    active: projects.filter((project) => project.isActive).length,
    inactive: projects.filter((project) => !project.isActive).length,
    waiting: projects.filter((project) => isWaitingFlowStatus(project.flowStatus, options))
      .length,
    waitingInternal: projects.filter((project) =>
      isWaitingWithInternalBlocker(project, options),
    ).length,
    waitingExternal: projects.filter((project) =>
      isWaitingWithExternalBlocker(project, options),
    ).length,
    closing: projects.filter((project) => projectClosingFlags?.get(project.id) ?? false).length,
    noContact: projects.filter((project) => isWithoutContact(project, options)).length,
    critical: projects.filter((project) => project.priority === "Krytyczny").length,
  };
}

export function projectsByStatus(projects: Project[]) {
  return countBy(projects.map((project) => project.flowStatus));
}

export function projectsByBlocker(projects: Project[]) {
  return countBy(
    projects
      .map((project) => project.blockerReason)
      .filter(Boolean) as string[],
  );
}

export function projectsByType(projects: Project[]) {
  return countBy(projects.map((project) => project.type));
}

export function interruptionsOnly(interruptions: Interruption[]) {
  return interruptions.filter((item) => item.kind !== "focus");
}

export function focusBlocksOnly(interruptions: Interruption[]) {
  return interruptions.filter((item) => item.kind === "focus");
}

export function sumDurationMinutes(interruptions: Interruption[]) {
  return interruptions.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);
}

export function interruptionsByType(interruptions: Interruption[]) {
  return countBy(
    interruptionsOnly(interruptions)
      .map((item) => item.type)
      .filter(Boolean),
  );
}

export function interruptionsPerDay(interruptions: Interruption[]) {
  return countBy(interruptionsOnly(interruptions).map((item) => item.date)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function interruptionWeekKey(date: string) {
  const value = new Date(date);
  const firstDay = new Date(value.getFullYear(), 0, 1);
  const days = Math.floor(
    (value.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24),
  );
  return `T${String(Math.ceil((days + firstDay.getDay() + 1) / 7)).padStart(2, "0")}`;
}

export function interruptionsPerWeek(interruptions: Interruption[]) {
  return countBy(
    interruptionsOnly(interruptions).map((item) => interruptionWeekKey(item.date)),
  );
}

export function topInterruptionProjects(
  interruptions: Interruption[],
  projects: Project[],
) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return countBy(
    interruptionsOnly(interruptions).map(
      (item) => (item.projectId ? projectNames.get(item.projectId) : null) ?? "Bez projektu",
    ),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function generateReport(
  projects: Project[],
  interruptions: Interruption[],
  options: FieldOptions,
  period: ReportPeriod = createWeeklyPeriod(),
  projectClosingFlags?: Map<string, boolean>,
): WeeklyReport {
  const periodInterruptions = filterInterruptionsByPeriod(interruptions, period);
  const periodInterruptionItems = interruptionsOnly(periodInterruptions);
  const periodFocusItems = focusBlocksOnly(periodInterruptions);
  const metrics = projectMetrics(projects, options, projectClosingFlags);
  const blockers = projectsByBlocker(projects).sort((a, b) => b.value - a.value);
  const sources = interruptionsByType(periodInterruptions).sort((a, b) => b.value - a.value);
  const sortByPriority = (a: Project, b: Project) =>
    priorityWeight(b.priority) - priorityWeight(a.priority);

  const baseReport = {
    period,
    periodLabel: formatPeriodLabel(period),
    activeProjects: metrics.active,
    waitingProjects: metrics.waiting,
    waitingInternalProjects: metrics.waitingInternal,
    waitingExternalProjects: metrics.waitingExternal,
    closedProjects: projects.filter((project) =>
      isClosedFlowStatus(project.flowStatus, options),
    ).length,
    closingProjects: metrics.closing,
    noContactProjects: metrics.noContact,
    mostCommonBlocker: blockers[0]?.name ?? "Brak",
    interruptionsCount: periodInterruptionItems.length,
    interruptionMinutesTotal: sumDurationMinutes(periodInterruptionItems),
    focusCount: periodFocusItems.length,
    focusMinutesTotal: sumDurationMinutes(periodFocusItems),
    mostCommonInterruptionSource: sources[0]?.name ?? "Brak",
    interruptionTrends: interruptionTrends(interruptionsOnly(interruptions), period),
    criticalProjects: projects
      .filter((project) => project.priority === "Krytyczny")
      .sort(sortByPriority),
    waitingProjectsList: projects
      .filter((project) => isWaitingFlowStatus(project.flowStatus, options))
      .sort(sortByPriority),
    closingProjectsList: projects
      .filter((project) => projectClosingFlags?.get(project.id) ?? false)
      .sort(sortByPriority),
    blockersByReason: blockers,
    interruptionsByTypeChart: sources,
  };

  return {
    ...baseReport,
    quickWins: generateQuickWins(
      projects,
      periodInterruptionItems,
      options,
      baseReport,
      projectClosingFlags,
    ),
  };
}

export function generateWeeklyReport(
  projects: Project[],
  interruptions: Interruption[],
  options: FieldOptions,
  projectClosingFlags?: Map<string, boolean>,
): WeeklyReport {
  return generateReport(
    projects,
    interruptions,
    options,
    createWeeklyPeriod(),
    projectClosingFlags,
  );
}
