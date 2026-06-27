"use client";

import { useMemo } from "react";
import Link from "next/link";
import { stageNames, type FieldOptions } from "@/lib/field-options";
import type { Project } from "@/lib/types";
import { ClickableProjectCard } from "@/components/project-edit-provider";
import { filterProjectsByView, type ProjectsViewFilters } from "@/lib/projects-view-filters";
import { cn } from "@/lib/utils";

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
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="mt-1 text-xs text-muted">{project.flowStatus}</p>
                    <p className="mt-1 text-xs text-muted">{project.nextStepOwner}</p>
                    <Link
                      href={`/projekty/${project.id}`}
                      className="mt-2 inline-block text-xs text-accent hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Otwórz projekt
                    </Link>
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
