"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ActiveBadge,
  PriorityBadge,
  ProjectStatusBadge,
} from "@/components/project-status-badge";
import { useProjectEdit } from "@/components/project-edit-provider";
import { Badge } from "@/components/ui/badge";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { isWithoutContact } from "@/lib/domain";
import {
  isProjectForClosing,
  isProjectWaiting,
  stageNames,
  type FieldOptions,
} from "@/lib/field-options";
import { projectToInput } from "@/lib/supabase/mappers";
import { filterProjectsByView, type ProjectsViewFilters } from "@/lib/projects-view-filters";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const PROJECTS_KANBAN_DRAG_HINT =
  "Przesuń projekt na inny etap — etap w ustawieniach projektu zostanie zaktualizowany.";

function ProjectKanbanHighlights({
  project,
  fieldOptions,
}: {
  project: Project;
  fieldOptions: FieldOptions;
}) {
  const waiting = isProjectWaiting(project, fieldOptions);
  const forClosing = isProjectForClosing(project, fieldOptions);
  const noContact = isWithoutContact(project, fieldOptions);
  const critical = project.priority === "Krytyczny";

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <ProjectStatusBadge
        status={project.flowStatus}
        priority={project.priority}
        isActive={project.isActive}
      />
      {project.isActive ? <ActiveBadge /> : <Badge tone="neutral">Nieaktywny</Badge>}
      {critical ? <PriorityBadge priority={project.priority} /> : null}
      {forClosing ? <Badge tone="blue">Do zamknięcia</Badge> : null}
      {noContact ? <Badge tone="waiting">Bez kontaktu</Badge> : null}
      {waiting && project.blockerReason ? (
        <Badge tone="waiting" className="max-w-full">
          <span className="truncate">Blokada: {project.blockerReason}</span>
        </Badge>
      ) : null}
    </div>
  );
}

function ProjectKanbanCard({
  project,
  fieldOptions,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  project: Project;
  fieldOptions: FieldOptions;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", project.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-grab rounded-xl border border-border/70 bg-surface p-3 text-left transition hover:border-accent/30 active:cursor-grabbing",
        isDragging && "scale-[0.98] opacity-35 ring-2 ring-accent/30",
      )}
    >
      <p className="font-medium leading-snug text-foreground">{project.name}</p>
      {project.nextStepOwner ? (
        <p className="mt-1 text-xs text-muted">
          <span className="font-medium text-foreground/80">Odpowiedzialny:</span>{" "}
          {project.nextStepOwner}
        </p>
      ) : null}
      <ProjectKanbanHighlights project={project} fieldOptions={fieldOptions} />
    </div>
  );
}

function resolveProjectStageBucket(
  project: Project,
  stages: string[],
  pendingMove: { projectId: string; stage: string } | null,
): string {
  if (pendingMove?.projectId === project.id) {
    return pendingMove.stage;
  }

  return stages.includes(project.stage) ? project.stage : "Inne";
}

export function ProjectsStageKanban({
  projects,
  fieldOptions,
  filters,
}: {
  projects: Project[];
  fieldOptions: FieldOptions;
  filters: ProjectsViewFilters;
}) {
  const { openProjectEdit } = useProjectEdit();
  const updateProject = useAppStore((state) => state.updateProject);
  const patchProjectFields = useAppStore((state) => state.patchProjectFields);

  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ projectId: string; stage: string } | null>(null);

  const stages = stageNames(fieldOptions);
  const filtered = useMemo(
    () => filterProjectsByView(projects, filters, fieldOptions),
    [fieldOptions, filters, projects],
  );

  const columnKeys = useMemo(() => [...stages, "Inne"], [stages]);

  const byStage = useMemo(() => {
    const grouped = new Map<string, Project[]>();
    for (const stage of columnKeys) {
      grouped.set(stage, []);
    }

    for (const project of filtered) {
      const bucket = resolveProjectStageBucket(project, stages, pendingMove);
      grouped.get(bucket)?.push(project);
    }

    return grouped;
  }, [columnKeys, filtered, pendingMove, stages]);

  const dragProject = dragProjectId
    ? (filtered.find((project) => project.id === dragProjectId) ?? null)
    : null;

  const clearDragState = useCallback(() => {
    setDragProjectId(null);
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    async (targetStage: string) => {
      if (!dragProjectId || targetStage === "Inne") {
        clearDragState();
        return;
      }

      const project = filtered.find((entry) => entry.id === dragProjectId);
      if (!project) {
        clearDragState();
        return;
      }

      const currentStage = resolveProjectStageBucket(project, stages, null);
      if (currentStage === targetStage) {
        clearDragState();
        return;
      }

      const previousStage = project.stage;
      const projectId = project.id;

      setPendingMove({ projectId, stage: targetStage });
      clearDragState();
      patchProjectFields(projectId, { stage: targetStage });

      try {
        await updateProject(projectId, {
          ...projectToInput(project),
          stage: targetStage,
        });
      } catch {
        patchProjectFields(projectId, { stage: previousStage });
      } finally {
        setPendingMove(null);
      }
    },
    [clearDragState, dragProjectId, filtered, patchProjectFields, stages, updateProject],
  );

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">{PROJECTS_KANBAN_DRAG_HINT}</p>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columnKeys.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const isDropTarget = Boolean(
            dragProjectId && dragOverStage === stage && stage !== "Inne",
          );
          const canDrop = stage !== "Inne";

          return (
            <div
              key={stage}
              className={cn(
                "flex w-[min(88vw,300px)] shrink-0 flex-col rounded-2xl border border-border/80 bg-surface-muted/20",
                canDrop && getKanbanColumnDropTargetClasses(isDropTarget),
              )}
              onDragEnter={(event) => {
                if (!dragProjectId || !canDrop) {
                  return;
                }
                event.preventDefault();
                setDragOverStage(stage);
              }}
              onDragOver={(event) => {
                if (!dragProjectId || !canDrop) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverStage(stage);
              }}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(related)) {
                  setDragOverStage((current) => (current === stage ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleDrop(stage);
              }}
            >
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{stage}</p>
                <p className="text-xs text-muted">{items.length} projektów</p>
              </div>
              <div
                className={cn(
                  "flex max-h-[min(70vh,720px)] flex-col gap-2 overflow-y-auto p-2",
                  isDropTarget && "bg-accent/[0.03]",
                )}
              >
                {items.length === 0 && !isDropTarget ? (
                  <p className="px-2 py-4 text-center text-xs text-muted">Brak projektów</p>
                ) : (
                  items.map((project) => (
                    <ProjectKanbanCard
                      key={project.id}
                      project={project}
                      fieldOptions={fieldOptions}
                      isDragging={dragProjectId === project.id}
                      onDragStart={() => setDragProjectId(project.id)}
                      onDragEnd={clearDragState}
                      onOpen={() => openProjectEdit(project)}
                    />
                  ))
                )}

                {isDropTarget && dragProject ? (
                  <KanbanDropPlaceholder title={dragProject.name} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
