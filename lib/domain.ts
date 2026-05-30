import { countBy, daysBetween } from "@/lib/utils";
import type {
  BlockerReason,
  FlowStatus,
  Interruption,
  InterruptionType,
  Priority,
  Project,
  ProjectType,
  WeeklyReport,
} from "@/lib/types";

export const waitingStatuses: FlowStatus[] = [
  "Oczekuje na budowę",
  "Oczekuje na klienta",
  "Oczekuje na inną branżę",
  "Oczekuje na materiały",
];

export const closingStatuses: FlowStatus[] = [
  "Wdrożenie i przekazanie",
  "Poprawki",
  "Gotowy do odbioru",
];

export function statusTone(status: FlowStatus, priority?: Priority) {
  if (priority === "Krytyczny") {
    return "critical";
  }

  if (status === "Aktywny") {
    return "active";
  }

  if (status === "Zamknięty") {
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

export function isWithoutContact(project: Project) {
  const today = new Date();
  return (
    new Date(project.nextContactDate) < today &&
    daysBetween(project.lastContactDate) > 14 &&
    project.flowStatus !== "Zamknięty"
  );
}

export function projectMetrics(projects: Project[]) {
  return {
    all: projects.length,
    active: projects.filter((project) => project.flowStatus === "Aktywny").length,
    waiting: projects.filter((project) => waitingStatuses.includes(project.flowStatus))
      .length,
    waitingClient: projects.filter(
      (project) => project.flowStatus === "Oczekuje na klienta",
    ).length,
    waitingBuild: projects.filter(
      (project) => project.flowStatus === "Oczekuje na budowę",
    ).length,
    closing: projects.filter((project) => closingStatuses.includes(project.flowStatus))
      .length,
    noContact: projects.filter(isWithoutContact).length,
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
      .filter(Boolean) as BlockerReason[],
  );
}

export function projectsByType(projects: Project[]) {
  return countBy(projects.map((project) => project.type as ProjectType));
}

export function interruptionsByType(interruptions: Interruption[]) {
  return countBy(interruptions.map((item) => item.type as InterruptionType));
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
): WeeklyReport {
  const blockers = projectsByBlocker(projects).sort((a, b) => b.value - a.value);
  const sources = interruptionsByType(interruptions).sort((a, b) => b.value - a.value);

  return {
    activeProjects: projectMetrics(projects).active,
    waitingProjects: projectMetrics(projects).waiting,
    closedProjects: projects.filter((project) => project.flowStatus === "Zamknięty")
      .length,
    mostCommonBlocker: blockers[0]?.name ?? "Brak",
    interruptionsCount: interruptions.length,
    mostCommonInterruptionSource: sources[0]?.name ?? "Brak",
    criticalProjects: projects
      .filter((project) => project.priority === "Krytyczny")
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)),
  };
}
