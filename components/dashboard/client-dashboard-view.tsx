"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GitBranch, LayoutGrid } from "lucide-react";
import { ProjectAgreementsPanel } from "@/components/dashboard/project-agreements-panel";
import { ProjectSpecificationPanel } from "@/components/dashboard/project-specification-panel";
import { ClientInfoCard } from "@/components/dashboard/client-info-card";
import { DashboardPublicLinkPanel } from "@/components/dashboard/dashboard-public-link-panel";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENT_DASHBOARD_SECTIONS } from "@/lib/dashboard/types";
import { getProcessProgress } from "@/lib/process/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const FALLBACK_SECTION = {
  title: "Sekcja",
  description: "",
  status: "active" as const,
};

export function ClientDashboardView({
  client,
  projects,
  selectedProjectId,
  onProjectChange,
  clientSpace,
  process,
  template,
  showPublicLink = true,
  readOnly = false,
  clientAuthorName = "Klient",
  teamAuthorName = "Zespół",
  enableAgreements = true,
  enableSpecification = true,
}: {
  client: Client;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange?: (projectId: string) => void;
  clientSpace: DashboardSpace | null;
  process: ProjectProcess | null;
  template: ProcessTemplate | null;
  showPublicLink?: boolean;
  readOnly?: boolean;
  clientAuthorName?: string;
  teamAuthorName?: string;
  enableAgreements?: boolean;
  enableSpecification?: boolean;
}) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const activeSections = CLIENT_DASHBOARD_SECTIONS.filter((section) => section.status === "active");
  const plannedSections = CLIENT_DASHBOARD_SECTIONS.filter((section) => section.status === "planned");

  const projectSection = activeSections.find((section) => section.id === "project") ?? FALLBACK_SECTION;
  const processSection = activeSections.find((section) => section.id === "process") ?? FALLBACK_SECTION;
  const agreementsSection =
    activeSections.find((section) => section.id === "agreements") ?? FALLBACK_SECTION;
  const specificationSection =
    activeSections.find((section) => section.id === "specification") ?? FALLBACK_SECTION;

  const progress = useMemo(() => {
    if (!process || !template) {
      return null;
    }
    return getProcessProgress(template, process);
  }, [process, template]);

  if (!selectedProject) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Ten klient nie ma przypisanych projektów. Przypisz projekt w module Projektów.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="grid gap-4 self-start">
        <ClientInfoCard client={client} />

        {projects.length > 1 && onProjectChange ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Projekty klienta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onProjectChange(project.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm transition",
                    project.id === selectedProjectId
                      ? "border-accent/50 bg-accent/10 text-foreground"
                      : "border-border/70 bg-surface-muted/20 text-muted hover:border-accent/30 hover:text-foreground",
                  )}
                >
                  <p className="font-medium">{project.name}</p>
                  <p className="text-xs text-muted">
                    {project.type} · {project.stage}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {showPublicLink && clientSpace && !readOnly ? (
          <DashboardPublicLinkPanel space={clientSpace} />
        ) : null}
      </div>

      <div className="grid gap-4">
        <DashboardSectionCard section={projectSection}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Projekt</p>
              <p className="font-medium text-foreground">{selectedProject.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Typ</p>
              <p className="text-foreground">{selectedProject.type}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Etap</p>
              <p className="text-foreground">{selectedProject.stage}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Status przepływu</p>
              <p className="text-foreground">{selectedProject.flowStatus}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Priorytet</p>
              <p className="text-foreground">{selectedProject.priority}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Kolejny krok</p>
              <p className="text-foreground">{selectedProject.nextStepOwner}</p>
            </div>
          </div>
          {selectedProject.notes ? (
            <p className="mt-3 rounded-xl border border-border/60 bg-surface-muted/20 px-3 py-2 text-sm text-muted">
              {selectedProject.notes}
            </p>
          ) : null}
        </DashboardSectionCard>

        <DashboardSectionCard section={processSection}>
          {progress ? (
            <div className="grid gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted">Postęp procesu wdrożenia</span>
                  <span className="font-medium text-foreground">{progress.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {progress.completed} / {progress.total} elementów ukończonych
                </p>
              </div>

              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projekty/${selectedProject.id}/proces`}>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Otwórz proces projektu
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tablice-wdrozen/${client.id}`}>
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      Tablice Kanban klienta
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Proces wdrożenia nie został jeszcze uruchomiony dla tego projektu.
            </p>
          )}
        </DashboardSectionCard>

        {enableAgreements ? (
          <DashboardSectionCard section={agreementsSection}>
            <ProjectAgreementsPanel
              projectId={selectedProject.id}
              mode={readOnly ? "client" : "team"}
              authorName={readOnly ? clientAuthorName : teamAuthorName}
            />
          </DashboardSectionCard>
        ) : null}

        {enableSpecification ? (
          <DashboardSectionCard section={specificationSection}>
            <ProjectSpecificationPanel projectId={selectedProject.id} readOnly={readOnly} />
          </DashboardSectionCard>
        ) : null}

        {plannedSections.map((section) => (
          <DashboardSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
