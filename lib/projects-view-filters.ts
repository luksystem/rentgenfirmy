import type { FieldOptions } from "@/lib/field-options";
import {
  isExternalBlockerReason,
  isInternalBlockerReason,
  isProjectClosed,
  isProjectForClosing,
  isProjectInProgress,
  isProjectWaiting,
} from "@/lib/field-options";
import type { FlowStatus, Project, ProjectType } from "@/lib/types";

export const PROJECT_CATEGORY_FILTERS = [
  { id: "active", label: "Aktywne" },
  { id: "inProgress", label: "W trakcie" },
  { id: "waiting", label: "Oczekujące" },
  { id: "closed", label: "Zamknięte" },
  { id: "forClosing", label: "Do zamknięcia" },
] as const;

export type ProjectCategoryFilterId = (typeof PROJECT_CATEGORY_FILTERS)[number]["id"];

export const PROJECT_BLOCKER_FAULT_FILTERS = [
  { id: "internal", label: "Blokada: nasza" },
  { id: "external", label: "Blokada: zewnętrzna" },
] as const;

export type ProjectBlockerFaultFilterId =
  (typeof PROJECT_BLOCKER_FAULT_FILTERS)[number]["id"];

export type ProjectsViewFilters = {
  typeFilter: ProjectType | "Wszystkie";
  flowStatusFilter: FlowStatus | "Wszystkie";
  categories: ProjectCategoryFilterId[];
  blockerFaults: ProjectBlockerFaultFilterId[];
};

export const DEFAULT_PROJECTS_VIEW_FILTERS: ProjectsViewFilters = {
  typeFilter: "Wszystkie",
  flowStatusFilter: "Wszystkie",
  categories: [],
  blockerFaults: [],
};

const STORAGE_KEY = "rentgen-projects-view-filters";

function isCategoryFilterId(value: unknown): value is ProjectCategoryFilterId {
  return PROJECT_CATEGORY_FILTERS.some((item) => item.id === value);
}

function isBlockerFaultFilterId(value: unknown): value is ProjectBlockerFaultFilterId {
  return PROJECT_BLOCKER_FAULT_FILTERS.some((item) => item.id === value);
}

export function matchesProjectCategory(
  project: Project,
  category: ProjectCategoryFilterId,
  options: FieldOptions,
) {
  switch (category) {
    case "active":
      return project.isActive;
    case "inProgress":
      return isProjectInProgress(project, options);
    case "waiting":
      return isProjectWaiting(project, options);
    case "closed":
      return isProjectClosed(project, options);
    case "forClosing":
      return isProjectForClosing(project, options);
    default:
      return false;
  }
}

export function matchesProjectBlockerFault(
  project: Project,
  fault: ProjectBlockerFaultFilterId,
  options: FieldOptions,
) {
  if (!isProjectWaiting(project, options) || !project.blockerReason) {
    return false;
  }

  if (fault === "internal") {
    return isInternalBlockerReason(project.blockerReason, options);
  }

  return isExternalBlockerReason(project.blockerReason, options);
}

export function filterProjectsByView(
  projects: Project[],
  filters: ProjectsViewFilters,
  options: FieldOptions,
) {
  return projects.filter((project) => {
    const matchesType =
      filters.typeFilter === "Wszystkie" || project.type === filters.typeFilter;
    const matchesFlowStatus =
      filters.flowStatusFilter === "Wszystkie" ||
      project.flowStatus === filters.flowStatusFilter;
    const matchesCategories =
      filters.categories.length === 0 ||
      filters.categories.some((category) =>
        matchesProjectCategory(project, category, options),
      );
    const matchesBlockerFaults =
      filters.blockerFaults.length === 0 ||
      filters.blockerFaults.some((fault) =>
        matchesProjectBlockerFault(project, fault, options),
      );

    return matchesType && matchesFlowStatus && matchesCategories && matchesBlockerFaults;
  });
}

export function loadProjectsViewFilters(): ProjectsViewFilters {
  if (typeof window === "undefined") {
    return DEFAULT_PROJECTS_VIEW_FILTERS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROJECTS_VIEW_FILTERS;
    }

    const parsed = JSON.parse(raw) as Partial<ProjectsViewFilters>;
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.filter(isCategoryFilterId)
      : [];
    const blockerFaults = Array.isArray(parsed.blockerFaults)
      ? parsed.blockerFaults.filter(isBlockerFaultFilterId)
      : [];

    return {
      typeFilter:
        typeof parsed.typeFilter === "string" ? parsed.typeFilter : "Wszystkie",
      flowStatusFilter:
        typeof parsed.flowStatusFilter === "string"
          ? parsed.flowStatusFilter
          : "Wszystkie",
      categories,
      blockerFaults,
    };
  } catch {
    return DEFAULT_PROJECTS_VIEW_FILTERS;
  }
}

export function saveProjectsViewFilters(filters: ProjectsViewFilters) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function isDefaultProjectsViewFilters(filters: ProjectsViewFilters) {
  return (
    filters.typeFilter === DEFAULT_PROJECTS_VIEW_FILTERS.typeFilter &&
    filters.flowStatusFilter === DEFAULT_PROJECTS_VIEW_FILTERS.flowStatusFilter &&
    filters.categories.length === 0 &&
    filters.blockerFaults.length === 0
  );
}
