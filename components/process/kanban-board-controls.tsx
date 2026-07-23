"use client";

import { Eye, EyeOff } from "lucide-react";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  countActiveKanbanBoardFilters,
  DEFAULT_KANBAN_BOARD_FILTERS,
  persistKanbanHideClosed,
  type KanbanBoardFilters,
  type KanbanColumnSortMode,
} from "@/lib/process/kanban-task-meta";
import {
  KANBAN_PRIORITY_LABELS,
  KANBAN_PRIORITIES,
} from "@/lib/process/kanban-types";

export function KanbanBoardControls({
  filters,
  sortMode,
  assigneeOptions,
  assigneeFilterOptions,
  projectOptions = [],
  onFiltersChange,
  onSortModeChange,
}: {
  filters: KanbanBoardFilters;
  sortMode: KanbanColumnSortMode;
  assigneeOptions?: string[];
  assigneeFilterOptions?: Array<{ value: string; label: string }>;
  projectOptions?: Array<{ id: string; name: string }>;
  onFiltersChange: (filters: KanbanBoardFilters) => void;
  onSortModeChange: (sortMode: KanbanColumnSortMode) => void;
}) {
  const activeCount = countActiveKanbanBoardFilters(filters);
  const showProjectFilter = projectOptions.length > 0;
  const assigneeChoices =
    assigneeFilterOptions ??
    (assigneeOptions ?? []).map((option) => ({ value: option, label: option }));
  const hideClosed = Boolean(filters.hideClosed);

  function toggleHideClosed() {
    const next = !hideClosed;
    persistKanbanHideClosed(next);
    onFiltersChange({ ...filters, hideClosed: next });
  }

  return (
    <div className="flex shrink-0 min-w-0 w-full max-w-full flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={toggleHideClosed}>
        {hideClosed ? <Eye className="mr-2 h-4 w-4 shrink-0" /> : <EyeOff className="mr-2 h-4 w-4 shrink-0" />}
        {hideClosed ? "Pokaż zamknięte" : "Ukryj zamknięte"}
      </Button>
      <MobileFiltersPanel
        activeCount={activeCount}
        onClear={() => onFiltersChange({ ...DEFAULT_KANBAN_BOARD_FILTERS, hideClosed: filters.hideClosed })}
        className="min-w-0 flex-1"
        panelClassName="rounded-xl border border-border/70 bg-surface/40 p-3"
      >
      <div
        className={cn(
          "grid gap-2",
          showProjectFilter ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {showProjectFilter ? (
          <Field label="Projekt">
            <Select
              value={filters.projectId ?? "all"}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  projectId: event.target.value,
                })
              }
            >
              <option value="all">Wszystkie projekty</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
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
            {assigneeChoices.map((assignee) => (
              <option key={assignee.value} value={assignee.value}>
                {assignee.label}
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
      </MobileFiltersPanel>
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
