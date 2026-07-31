"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClickableProjectCard } from "@/components/project-edit-provider";
import { useAppStore } from "@/store/app-store";

export function CriticalProjectsWidget() {
  const projects = useAppStore((state) => state.projects);
  const criticalProjects = useMemo(
    () => projects.filter((project) => project.priority === "Krytyczny").slice(0, 5),
    [projects],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Co wymaga uwagi</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {criticalProjects.length ? (
          criticalProjects.map((project) => (
            <ClickableProjectCard
              key={project.id}
              project={project}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{project.name}</p>
                <p className="text-sm text-muted">
                  {project.nextStepOwner} · {project.blockerReason ?? "Brak blokady"}
                </p>
              </div>
              <span className="w-fit rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                Krytyczny
              </span>
            </ClickableProjectCard>
          ))
        ) : (
          <p className="text-sm text-muted">Brak projektów krytycznych.</p>
        )}
      </CardContent>
    </Card>
  );
}
