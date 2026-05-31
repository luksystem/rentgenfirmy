"use client";

import { PageHeader } from "@/components/page-header";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isWaitingFlowStatus } from "@/lib/field-options";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function WaitingPage() {
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const waitingProjects = projects.filter((project) =>
    isWaitingFlowStatus(project.flowStatus, fieldOptions),
  );
  const groups = Object.groupBy(
    waitingProjects,
    (project) => project.blockerReason ?? "Bez powodu",
  );

  return (
    <>
      <PageHeader
        eyebrow="Blokady"
        title="Projekty oczekujące"
        description="Projekty ze statusem przepływu oznaczonym jako oczekujące, pogrupowane według powodu blokady."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {Object.entries(groups).map(([reason, items]) => (
          <Card key={reason}>
            <CardHeader>
              <CardTitle>
                {reason}{" "}
                <span className="text-sm font-normal text-muted">
                  ({items?.length ?? 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {items?.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-border bg-surface-muted p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-medium">{project.name}</p>
                    <ProjectStatusBadge
                      status={project.flowStatus}
                      priority={project.priority}
                      isActive={project.isActive}
                    />
                  </div>
                  <div className="grid gap-2 text-sm text-muted md:grid-cols-3">
                    <span>Etap: {project.stage}</span>
                    <span>Krok: {project.nextStepOwner}</span>
                    <span>Kontakt: {formatDate(project.nextContactDate)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
