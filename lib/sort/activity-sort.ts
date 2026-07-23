import {
  isProjectClosed,
  isProjectInProgress,
  isProjectWaiting,
  type FieldOptions,
} from "@/lib/field-options";
import { getClientLastViewedAt } from "@/lib/clients/client-recent-views";
import type { Client } from "@/lib/service/types";
import type { ClientRecentView } from "@/lib/supabase/client-recent-views-repository";
import type { Project } from "@/lib/types";

const collator = new Intl.Collator("pl", { sensitivity: "base" });

/** Ostatnie 45 dni uznajemy za bieżącą aktywność na liście. */
const RECENT_ACTIVITY_MS = 45 * 24 * 60 * 60 * 1000;

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecentActivity(timestamp: number) {
  return timestamp > 0 && Date.now() - timestamp <= RECENT_ACTIVITY_MS;
}

/** Wyższy tier = więcej dzieje się na projekcie — wyżej na liście. */
export function getProjectActivityTier(project: Project, fieldOptions: FieldOptions) {
  if (!project.isActive || isProjectClosed(project, fieldOptions)) {
    return 0;
  }

  const changedAt = parseTimestamp(project.lastChangedAt);
  if (isRecentActivity(changedAt)) {
    return 3;
  }

  if (
    isProjectInProgress(project, fieldOptions) ||
    isProjectWaiting(project, fieldOptions) ||
    project.priority === "Krytyczny"
  ) {
    return 2;
  }

  return 1;
}

export function sortProjectsByActivity(projects: Project[], fieldOptions: FieldOptions) {
  return [...projects].sort((left, right) => {
    const tierDiff =
      getProjectActivityTier(right, fieldOptions) - getProjectActivityTier(left, fieldOptions);
    if (tierDiff !== 0) {
      return tierDiff;
    }

    const timeDiff = parseTimestamp(right.lastChangedAt) - parseTimestamp(left.lastChangedAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return collator.compare(left.name, right.name);
  });
}

export function getClientLastActivityAt(
  client: Client,
  projects: Project[],
  recentViews: ClientRecentView[] = [],
) {
  const clientTimestamp = parseTimestamp(client.updatedAt);
  const projectTimestamps = projects
    .filter((project) => project.clientId === client.id)
    .map((project) => parseTimestamp(project.lastChangedAt));
  const viewedTimestamp = getClientLastViewedAt(recentViews, client.id);

  return Math.max(clientTimestamp, ...projectTimestamps, viewedTimestamp, 0);
}

export function getClientActivityTier(
  client: Client,
  projects: Project[],
  fieldOptions: FieldOptions,
) {
  const clientProjects = projects.filter((project) => project.clientId === client.id);
  if (clientProjects.length === 0) {
    return isRecentActivity(parseTimestamp(client.updatedAt)) ? 1 : 0;
  }

  return Math.max(
    ...clientProjects.map((project) => getProjectActivityTier(project, fieldOptions)),
    0,
  );
}

export function sortClientsByActivity(
  clients: Client[],
  projects: Project[],
  recentViews: ClientRecentView[] = [],
) {
  return [...clients].sort((left, right) => {
    const timeDiff =
      getClientLastActivityAt(right, projects, recentViews) -
      getClientLastActivityAt(left, projects, recentViews);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return collator.compare(left.lastName, right.lastName);
  });
}
