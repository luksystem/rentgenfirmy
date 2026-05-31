"use client";

import { PageHeader } from "@/components/page-header";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { waitingStatuses } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function WaitingPage() {
  const projects = useAppStore((state) => state.projects);
  const waitingProjects = projects.filter((project) =>
    waitingStatuses.includes(project.flowStatus),
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
        description="Widok tematów oczekujących na budowę, klienta, inną branżę lub materiały, pogrupowany według powodu blokady."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {Object.entries(groups).map(([reason, items]) => (
          <Card key={reason}>
            <CardHeader>
              <CardTitle>
                {reason}{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({items?.length ?? 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {items?.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-medium">{project.name}</p>
                    <ProjectStatusBadge
                      status={project.flowStatus}
                      priority={project.priority}
                      isActive={project.isActive}
                    />
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
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
