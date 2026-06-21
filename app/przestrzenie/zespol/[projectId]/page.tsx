"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardSpaceShell } from "@/components/dashboard/dashboard-space-shell";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { TEAM_DASHBOARD_SECTIONS } from "@/lib/dashboard/types";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { useDashboardStore } from "@/store/dashboard-store";

export default function TeamDashboardPage() {
  const params = useParams();
  const projectId = String(params.projectId);
  const projects = useAppStore((state) => state.projects);
  const getSpaceByProject = useDashboardStore((state) => state.getSpaceByProject);

  const project = projects.find((entry) => entry.id === projectId);
  const teamSpace = getSpaceByProject(projectId, "team");

  if (!project) {
    return (
      <DashboardSpaceShell kind="team" title="Nie znaleziono projektu">
        <Card>
          <CardContent className="py-6 text-sm text-rose-200">Projekt nie istnieje.</CardContent>
        </Card>
      </DashboardSpaceShell>
    );
  }

  return (
    <DashboardSpaceShell
      kind="team"
      title={project.name}
      description="Wewnętrzna przestrzeń zespołu — koordynacja, podwykonawcy firmy, pliki i notatki."
      backHref="/przestrzenie"
    >
      <div className="mb-4 grid gap-3">
        {TEAM_DASHBOARD_SECTIONS.map((section) => (
          <DashboardSectionCard key={section.id} section={section}>
            {section.id === "subcontractors" ? (
              <p className="text-sm text-muted">
                Moduł dla <strong className="font-medium text-foreground">naszych podwykonawców</strong>{" "}
                (nie firm u klienta): zlecenia, oferty, zapytania ofertowe, rozliczenia i status
                współpracy. W przygotowaniu.
              </p>
            ) : undefined}
          </DashboardSectionCard>
        ))}
      </div>

      {project.clientId ? (
        <p className="text-sm">
          <Link
            href={`/przestrzenie/klient/${project.clientId}?project=${project.id}`}
            className="text-accent hover:underline"
          >
            Przejdź do dashboardu klienta →
          </Link>
        </p>
      ) : null}

      {teamSpace ? (
        <p className="mt-2 text-xs text-muted">Przestrzeń zespołu: {teamSpace.id.slice(0, 8)}…</p>
      ) : null}
    </DashboardSpaceShell>
  );
}
