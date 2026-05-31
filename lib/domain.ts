import { countBy, daysBetween } from "@/lib/utils";
import type { FieldOptions } from "@/lib/field-options";
import { isClosedFlowStatus, isProjectForClosing, isWaitingFlowStatus } from "@/lib/field-options";
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

  if (options ? isClosedFlowStatus(status, options) : status === "Zamknięty") {
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

export function projectMetrics(projects: Project[], options: FieldOptions) {
  return {
    all: projects.length,
    active: projects.filter((project) => project.isActive).length,
    waiting: projects.filter((project) => isWaitingFlowStatus(project.flowStatus, options))
      .length,
    closing: projects.filter((project) => isProjectForClosing(project, options)).length,
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

export function interruptionsByType(interruptions: Interruption[]) {
  return countBy(interruptions.map((item) => item.type));
}

export function interruptionsPerDay(interruptions: Interruption[]) {
  return countBy(interruptions.map((item) => item.date)).sort((a, b) =>
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
  return countBy(interruptions.map((item) => interruptionWeekKey(item.date)));
}

export function topInterruptionProjects(
  interruptions: Interruption[],
  projects: Project[],
) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return countBy(
    interruptions.map((item) => projectNames.get(item.projectId) ?? "Bez projektu"),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function generateWeeklyReport(
  projects: Project[],
  interruptions: Interruption[],
  options: FieldOptions,
): WeeklyReport {
  const blockers = projectsByBlocker(projects).sort((a, b) => b.value - a.value);
  const sources = interruptionsByType(interruptions).sort((a, b) => b.value - a.value);

  return {
    activeProjects: projectMetrics(projects, options).active,
    waitingProjects: projectMetrics(projects, options).waiting,
    closedProjects: projects.filter((project) => isClosedFlowStatus(project.flowStatus, options))
      .length,
    mostCommonBlocker: blockers[0]?.name ?? "Brak",
    interruptionsCount: interruptions.length,
    mostCommonInterruptionSource: sources[0]?.name ?? "Brak",
    criticalProjects: projects
      .filter((project) => project.priority === "Krytyczny")
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)),
  };
}
