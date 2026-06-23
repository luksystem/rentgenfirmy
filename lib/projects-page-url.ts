import {
  DEFAULT_PROJECTS_VIEW_FILTERS,
  normalizeProjectsViewFilters,
  type ProjectBlockerFaultFilterId,
  type ProjectCategoryFilterId,
  type ProjectsViewFilters,
} from "@/lib/projects-view-filters";

function parseCategoryParam(value: string | null): ProjectCategoryFilterId[] {
  if (!value?.trim()) {
    return [];
  }
  const allowed = new Set<ProjectCategoryFilterId>([
    "active",
    "inProgress",
    "waiting",
    "closed",
    "forClosing",
    "inactive",
    "critical",
    "noContact",
  ]);
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is ProjectCategoryFilterId =>
      allowed.has(entry as ProjectCategoryFilterId),
    );
}

function parseBlockerParam(value: string | null): ProjectBlockerFaultFilterId[] {
  if (!value?.trim()) {
    return [];
  }
  const allowed = new Set<ProjectBlockerFaultFilterId>(["internal", "external"]);
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is ProjectBlockerFaultFilterId =>
      allowed.has(entry as ProjectBlockerFaultFilterId),
    );
}

export function parseProjectsPageSearchParams(
  params: Pick<URLSearchParams, "get">,
): ProjectsViewFilters | null {
  const category = params.get("category");
  const blocker = params.get("blocker");

  if (!category && !blocker) {
    return null;
  }

  return normalizeProjectsViewFilters({
    ...DEFAULT_PROJECTS_VIEW_FILTERS,
    categories: parseCategoryParam(category),
    blockerFaults: parseBlockerParam(blocker),
  });
}

export function buildProjectsPageUrl(options: {
  categories?: ProjectCategoryFilterId[];
  blockerFaults?: ProjectBlockerFaultFilterId[];
}) {
  const search = new URLSearchParams();
  if (options.categories?.length) {
    search.set("category", options.categories.join(","));
  }
  if (options.blockerFaults?.length) {
    search.set("blocker", options.blockerFaults.join(","));
  }
  const query = search.toString();
  return query ? `/projekty?${query}` : "/projekty";
}
