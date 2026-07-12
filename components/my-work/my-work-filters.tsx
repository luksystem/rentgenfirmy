"use client";

import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Field, Select } from "@/components/ui/input";
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_PRIORITY_LABELS,
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_LABELS,
  type WorkItemFilters,
} from "@/lib/my-work/types";
import { useAppStore } from "@/store/app-store";

export function MyWorkFilters({
  filters,
  onChange,
  showTeamFilter,
  teamOptions,
}: {
  filters: WorkItemFilters;
  onChange: (patch: Partial<WorkItemFilters>) => void;
  showTeamFilter?: boolean;
  teamOptions?: { id: string; label: string }[];
}) {
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const content = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Projekt">
        <Select
          value={filters.projectId ?? ""}
          onChange={(event) => onChange({ projectId: event.target.value || null })}
        >
          <option value="">Wszystkie</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Klient">
        <Select
          value={filters.clientId ?? ""}
          onChange={(event) => onChange({ clientId: event.target.value || null })}
        >
          <option value="">Wszyscy</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {[client.firstName, client.lastName].filter(Boolean).join(" ") || "Klient"}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Status">
        <Select
          value={filters.status ?? ""}
          onChange={(event) =>
            onChange({ status: (event.target.value || null) as WorkItemFilters["status"] })
          }
        >
          <option value="">Wszystkie</option>
          {WORK_ITEM_STATUSES.map((status) => (
            <option key={status} value={status}>
              {WORK_ITEM_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Priorytet">
        <Select
          value={filters.priority ?? ""}
          onChange={(event) =>
            onChange({ priority: (event.target.value || null) as WorkItemFilters["priority"] })
          }
        >
          <option value="">Wszystkie</option>
          {WORK_ITEM_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {WORK_ITEM_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </Field>

      {showTeamFilter && teamOptions?.length ? (
        <Field label="Pracownik">
          <Select
            value={filters.assignedUserId ?? ""}
            onChange={(event) => onChange({ assignedUserId: event.target.value || null })}
          >
            <option value="">Cały zespół</option>
            {teamOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.overdueOnly)}
            onChange={(event) => onChange({ overdueOnly: event.target.checked })}
          />
          Zaległe
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.needsReactionOnly)}
            onChange={(event) => onChange({ needsReactionOnly: event.target.checked })}
          />
          Wymagające reakcji
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.aiGeneratedOnly)}
            onChange={(event) => onChange({ aiGeneratedOnly: event.target.checked })}
          />
          Sugestie AI
        </label>
      </div>
    </div>
  );

  return (
    <MobileFiltersPanel title="Filtry zadań" activeCount={countActiveFilters(filters)}>
      {content}
    </MobileFiltersPanel>
  );
}

function countActiveFilters(filters: WorkItemFilters) {
  let count = 0;
  if (filters.projectId) count++;
  if (filters.clientId) count++;
  if (filters.status) count++;
  if (filters.priority) count++;
  if (filters.overdueOnly) count++;
  if (filters.needsReactionOnly) count++;
  if (filters.aiGeneratedOnly) count++;
  if (filters.assignedUserId) count++;
  return count;
}
