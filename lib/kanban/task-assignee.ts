import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import type { KanbanTask } from "@/lib/process/kanban-types";

export function filterTeamProfilesByOperationalRole(
  teamProfiles: UserProfile[],
  userResourcesByUserId: Record<string, UserResourceProfile>,
  roleItemId: string | null,
) {
  if (!roleItemId) {
    return teamProfiles;
  }
  return teamProfiles.filter((profile) =>
    userResourcesByUserId[profile.id]?.roleItemIds.includes(roleItemId),
  );
}

export function getOperationalRoleName(roleItemId: string | null, roleOptions: DictionaryItem[]) {
  if (!roleItemId) {
    return null;
  }
  return roleOptions.find((entry) => entry.id === roleItemId)?.name ?? null;
}

export function formatKanbanTaskAssigneeLabel(
  task: Pick<KanbanTask, "assigneeName" | "assigneeId" | "roleItemId">,
  roleOptions: DictionaryItem[],
  teamProfiles: UserProfile[] = [],
) {
  if (task.assigneeId) {
    const profile = teamProfiles.find((entry) => entry.id === task.assigneeId);
    if (profile) {
      return getUserDisplayName(profile);
    }
  }
  if (task.assigneeName?.trim()) {
    return task.assigneeName.trim();
  }
  return getOperationalRoleName(task.roleItemId, roleOptions);
}

export function collectKanbanAssigneeFilterOptions(
  tasks: KanbanTask[],
  teamProfiles: UserProfile[],
  roleOptions: DictionaryItem[],
) {
  const values = new Map<string, string>();

  function add(key: string, label: string) {
    if (!values.has(key)) {
      values.set(key, label);
    }
  }

  for (const profile of teamProfiles) {
    add(`user:${profile.id}`, getUserDisplayName(profile));
  }
  for (const role of roleOptions) {
    add(`role:${role.id}`, role.name);
  }
  for (const task of tasks) {
    const label = formatKanbanTaskAssigneeLabel(task, roleOptions, teamProfiles);
    if (!label) {
      continue;
    }
    if (task.assigneeId) {
      add(`user:${task.assigneeId}`, label);
    } else if (task.roleItemId) {
      add(`role:${task.roleItemId}`, label);
    } else {
      add(`name:${label}`, label);
    }
  }

  return [...values.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pl"));
}

export function matchesKanbanAssigneeFilter(
  task: KanbanTask,
  filterValue: string,
  roleOptions: DictionaryItem[],
  teamProfiles: UserProfile[],
) {
  if (filterValue === "unassigned") {
    return !task.assigneeId && !task.roleItemId && !task.assigneeName?.trim();
  }

  if (filterValue.startsWith("user:")) {
    return task.assigneeId === filterValue.slice(5);
  }
  if (filterValue.startsWith("role:")) {
    return task.roleItemId === filterValue.slice(5);
  }
  if (filterValue.startsWith("name:")) {
    const label = formatKanbanTaskAssigneeLabel(task, roleOptions, teamProfiles);
    return label === filterValue.slice(5);
  }

  return formatKanbanTaskAssigneeLabel(task, roleOptions, teamProfiles) === filterValue;
}
