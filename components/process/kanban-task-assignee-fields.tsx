"use client";

import { useMemo } from "react";
import { Field, Select } from "@/components/ui/input";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import {
  filterTeamProfilesByOperationalRole,
  getOperationalRoleName,
} from "@/lib/kanban/task-assignee";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";

export type KanbanTaskAssigneeValue = {
  roleItemId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
};

export function KanbanTaskAssigneeFields({
  value,
  onChange,
  teamProfiles,
  userResourcesByUserId,
  roleOptions,
  disabled,
}: {
  value: KanbanTaskAssigneeValue;
  onChange: (next: KanbanTaskAssigneeValue) => void;
  teamProfiles: UserProfile[];
  userResourcesByUserId: Record<string, UserResourceProfile>;
  roleOptions: DictionaryItem[];
  disabled?: boolean;
}) {
  const personOptions = useMemo(
    () => filterTeamProfilesByOperationalRole(teamProfiles, userResourcesByUserId, value.roleItemId),
    [teamProfiles, userResourcesByUserId, value.roleItemId],
  );

  function handleRoleChange(roleItemId: string) {
    const nextRoleId = roleItemId || null;
    let nextAssigneeId = value.assigneeId;
    let nextAssigneeName = value.assigneeName;

    if (nextAssigneeId && nextRoleId) {
      const stillValid = personOptions.some((profile) => profile.id === nextAssigneeId);
      if (!stillValid) {
        nextAssigneeId = null;
        nextAssigneeName = null;
      }
    }

    onChange({
      roleItemId: nextRoleId,
      assigneeId: nextAssigneeId,
      assigneeName: nextAssigneeName,
    });
  }

  function handlePersonChange(assigneeId: string) {
    if (!assigneeId) {
      onChange({
        ...value,
        assigneeId: null,
        assigneeName: null,
      });
      return;
    }

    const profile = personOptions.find((entry) => entry.id === assigneeId) ?? null;
    onChange({
      ...value,
      assigneeId,
      assigneeName: profile ? getUserDisplayName(profile) : null,
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Rola operacyjna">
        <Select
          value={value.roleItemId ?? ""}
          disabled={disabled}
          onChange={(event) => handleRoleChange(event.target.value)}
        >
          <option value="">— brak —</option>
          {roleOptions.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Osoba">
        <Select
          value={value.assigneeId ?? ""}
          disabled={disabled}
          onChange={(event) => handlePersonChange(event.target.value)}
        >
          <option value="">
            {value.roleItemId
              ? personOptions.length === 0
                ? "Brak osób z tą rolą"
                : "— wybierz osobę —"
              : "— wybierz osobę —"}
          </option>
          {personOptions.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {getUserDisplayName(profile)}
            </option>
          ))}
        </Select>
        {value.roleItemId ? (
          <p className="text-xs font-normal text-muted">
            {personOptions.length > 0
              ? `Lista ograniczona do roli: ${getOperationalRoleName(value.roleItemId, roleOptions) ?? "—"}`
              : "Brak użytkowników z wybraną rolą — wybierz inną rolę lub wyczyść filtr roli."}
          </p>
        ) : (
          <p className="text-xs font-normal text-muted">Wszyscy użytkownicy zespołu.</p>
        )}
      </Field>
    </div>
  );
}
