"use client";

import { Field, Select } from "@/components/ui/input";
import {
  KANBAN_PRIORITY_LABELS,
  KANBAN_PRIORITIES,
} from "@/lib/process/kanban-types";
import type { KanbanBoardFilters, KanbanColumnSortMode } from "@/lib/process/kanban-task-meta";

export function KanbanBoardControls({
  filters,
  sortMode,
  assigneeOptions,
  onFiltersChange,
  onSortModeChange,
}: {
  filters: KanbanBoardFilters;
  sortMode: KanbanColumnSortMode;
  assigneeOptions: string[];
  onFiltersChange: (filters: KanbanBoardFilters) => void;
  onSortModeChange: (sortMode: KanbanColumnSortMode) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-border/70 bg-surface/40 p-3 sm:grid-cols-3">
      <Field label="Priorytet">
        <Select
          value={filters.priority}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              priority: event.target.value as KanbanBoardFilters["priority"],
            })
          }
        >
          <option value="all">Wszystkie</option>
          {KANBAN_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {KANBAN_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Odpowiedzialny">
        <Select
          value={filters.assignee}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              assignee: event.target.value,
            })
          }
        >
          <option value="all">Wszyscy</option>
          <option value="unassigned">Nieprzypisane</option>
          {assigneeOptions.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Sortowanie kolumn">
        <Select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as KanbanColumnSortMode)}
        >
          <option value="position">Kolejność ręczna</option>
          <option value="priority">Priorytet (pilne na górze)</option>
          <option value="dueDate">Termin (najbliższe na górze)</option>
        </Select>
      </Field>
    </div>
  );
}

export function KanbanAssigneePicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value.trim() ? event.target.value : null)}
    >
      <option value="">Nieprzypisane</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
