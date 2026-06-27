"use client";

import { useMemo } from "react";
import {
  ActiveBadge,
  PriorityBadge,
  ProjectStatusBadge,
} from "@/components/project-status-badge";
import { Badge } from "@/components/ui/badge";
import { ClickableProjectCard } from "@/components/project-edit-provider";
import { isWithoutContact } from "@/lib/domain";
import {
  isProjectForClosing,
  isProjectWaiting,
  stageNames,
  type FieldOptions,
} from "@/lib/field-options";
import { filterProjectsByView, type ProjectsViewFilters } from "@/lib/projects-view-filters";
import type { Project } from "@/lib/types";

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

export function ProjectsStageKanban({
  projects,
  fieldOptions,
  filters,
}: {
  projects: Project[];
  fieldOptions: FieldOptions;
  filters: ProjectsViewFilters;
}) {
  const stages = stageNames(fieldOptions);
  const filtered = useMemo(
    () => filterProjectsByView(projects, filters, fieldOptions),
    [fieldOptions, filters, projects],
  );

  const byStage = useMemo(() => {
    const grouped = new Map<string, Project[]>();
    for (const stage of stages) {
      grouped.set(stage, []);
    }
    grouped.set("Inne", []);

    for (const project of filtered) {
      const bucket = grouped.has(project.stage) ? project.stage : "Inne";
      grouped.get(bucket)?.push(project);
    }

    return grouped;
  }, [filtered, stages]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {[...stages, "Inne"].map((stage) => {
        const items = byStage.get(stage) ?? [];
        return (
          <div
            key={stage}
            className="flex w-[min(88vw,300px)] shrink-0 flex-col rounded-2xl border border-border/80 bg-surface-muted/20"
          >
            <div className="border-b border-border/60 px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">{stage}</p>
              <p className="text-xs text-muted">{items.length} projektów</p>
            </div>
            <div className="flex max-h-[min(70vh,720px)] flex-col gap-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted">Brak projektów</p>
              ) : (
                items.map((project) => (
                  <ClickableProjectCard
                    key={project.id}
                    project={project}
                    className="rounded-xl border border-border/70 bg-surface p-3 transition hover:border-accent/30"
                  >
                    <p className="font-medium leading-snug text-foreground">{project.name}</p>
                    {project.nextStepOwner ? (
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-medium text-foreground/80">Odpowiedzialny:</span>{" "}
                        {project.nextStepOwner}
                      </p>
                    ) : null}
                    <ProjectKanbanHighlights project={project} fieldOptions={fieldOptions} />
                  </ClickableProjectCard>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
