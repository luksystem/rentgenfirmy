import type { FieldOptions } from "@/lib/field-options";
import {
  isExternalBlockerReason,
  isInternalBlockerReason,
  isProjectClosed,
  isProjectForClosing,
  isProjectInProgress,
  isProjectWaiting,
} from "@/lib/field-options";
import { isWithoutContact } from "@/lib/domain";
import type { FlowStatus, NextStepOwner, Project, ProjectType } from "@/lib/types";

export const ALL_FILTER = "Wszystkie" as const;

export const PROJECT_CATEGORY_FILTERS = [
  { id: "active", label: "Aktywne" },
  { id: "inProgress", label: "W trakcie" },
  { id: "waiting", label: "Oczekujące" },
  { id: "closed", label: "Zamknięte" },
  { id: "forClosing", label: "Do zamknięcia" },
  { id: "inactive", label: "Nieaktywne" },
  { id: "critical", label: "Krytyczne" },
  { id: "noContact", label: "Bez kontaktu" },
] as const;

export type ProjectCategoryFilterId = (typeof PROJECT_CATEGORY_FILTERS)[number]["id"];

export const PROJECT_BLOCKER_FAULT_FILTERS = [
  { id: "internal", label: "Blokada: nasza" },
  { id: "external", label: "Blokada: zewnętrzna" },
] as const;

export type ProjectBlockerFaultFilterId =
  (typeof PROJECT_BLOCKER_FAULT_FILTERS)[number]["id"];

export type ProjectsViewFilters = {
  typeFilter: ProjectType | typeof ALL_FILTER;
  flowStatusFilter: FlowStatus | typeof ALL_FILTER;
  ownerFilter: NextStepOwner | typeof ALL_FILTER;
  nameQuery: string;
  categories: ProjectCategoryFilterId[];
  blockerFaults: ProjectBlockerFaultFilterId[];
};

export const DEFAULT_PROJECTS_VIEW_FILTERS: ProjectsViewFilters = {
  typeFilter: ALL_FILTER,
  flowStatusFilter: ALL_FILTER,
  ownerFilter: ALL_FILTER,
  nameQuery: "",
  categories: [],
  blockerFaults: [],
};

function normalizeNameQuery(query: string) {
  return query.trim().toLocaleLowerCase("pl");
}

export function projectMatchesNameQuery(project: Project, nameQuery: string) {
  const normalized = normalizeNameQuery(nameQuery);
  if (!normalized) {
    return true;
  }

  return project.name.toLocaleLowerCase("pl").includes(normalized);
}

const LEGACY_STORAGE_KEY = "rentgen-projects-view-filters";

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
    case "inactive":
      return !project.isActive;
    case "critical":
      return project.priority === "Krytyczny";
    case "noContact":
      return isWithoutContact(project, options);
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
      filters.typeFilter === ALL_FILTER || project.type === filters.typeFilter;
    const matchesFlowStatus =
      filters.flowStatusFilter === ALL_FILTER ||
      project.flowStatus === filters.flowStatusFilter;
    const matchesOwner =
      filters.ownerFilter === ALL_FILTER ||
      project.nextStepOwner === filters.ownerFilter;
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
    const matchesName = projectMatchesNameQuery(project, filters.nameQuery);

    return (
      matchesType &&
      matchesFlowStatus &&
      matchesOwner &&
      matchesCategories &&
      matchesBlockerFaults &&
      matchesName
    );
  });
}

export function normalizeProjectsViewFilters(
  parsed: Partial<ProjectsViewFilters>,
): ProjectsViewFilters {
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.filter(isCategoryFilterId)
    : [];
  const blockerFaults = Array.isArray(parsed.blockerFaults)
    ? parsed.blockerFaults.filter(isBlockerFaultFilterId)
    : [];

  return {
    typeFilter:
      typeof parsed.typeFilter === "string" ? parsed.typeFilter : ALL_FILTER,
    flowStatusFilter:
      typeof parsed.flowStatusFilter === "string"
        ? parsed.flowStatusFilter
        : ALL_FILTER,
    ownerFilter:
      typeof parsed.ownerFilter === "string" ? parsed.ownerFilter : ALL_FILTER,
    nameQuery: typeof parsed.nameQuery === "string" ? parsed.nameQuery : "",
    categories,
    blockerFaults,
  };
}

/** Jednorazowa migracja z localStorage (przed Supabase). */
export function migrateProjectsViewFiltersFromLocalStorage(): ProjectsViewFilters {
  if (typeof window === "undefined") {
    return DEFAULT_PROJECTS_VIEW_FILTERS;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROJECTS_VIEW_FILTERS;
    }

    return normalizeProjectsViewFilters(JSON.parse(raw) as Partial<ProjectsViewFilters>);
  } catch {
    return DEFAULT_PROJECTS_VIEW_FILTERS;
  }
}

export function isDefaultProjectsViewFilters(filters: ProjectsViewFilters) {
  return countActiveProjectsViewFilters(filters) === 0;
}

export function countActiveProjectsViewFilters(filters: ProjectsViewFilters) {
  let count = 0;

  if (filters.typeFilter !== DEFAULT_PROJECTS_VIEW_FILTERS.typeFilter) {
    count += 1;
  }
  if (filters.flowStatusFilter !== DEFAULT_PROJECTS_VIEW_FILTERS.flowStatusFilter) {
    count += 1;
  }
  if (filters.ownerFilter !== DEFAULT_PROJECTS_VIEW_FILTERS.ownerFilter) {
    count += 1;
  }
  if (filters.nameQuery.trim()) {
    count += 1;
  }

  count += filters.categories.length;
  count += filters.blockerFaults.length;

  return count;
}
