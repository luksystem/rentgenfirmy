"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClientDashboardView } from "@/components/dashboard/client-dashboard-view";
import { DashboardSpaceShell } from "@/components/dashboard/dashboard-space-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { useProcessStore } from "@/store/process-store";

export default function ClientDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = String(params.clientId);

  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const hydrateDashboard = useDashboardStore((state) => state.hydrate);
  const getSpaceByProject = useDashboardStore((state) => state.getSpaceByProject);
  const hydrateProcess = useProcessStore((state) => state.hydrate);
  const getProjectProcess = useProcessStore((state) => state.getProjectProcess);
  const templates = useProcessStore((state) => state.templates);
  const processHydrated = useProcessStore((state) => state.hydrated);
  const displayName = useAuthStore((state) => state.displayName);

  const client = clients.find((entry) => entry.id === clientId) ?? null;
  const clientProjects = useMemo(
    () =>
      projects
        .filter((project) => project.clientId === clientId)
        .sort((a, b) => a.name.localeCompare(b.name, "pl")),
    [clientId, projects],
  );

  const projectFromQuery = searchParams.get("project");
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectFromQuery && clientProjects.some((project) => project.id === projectFromQuery)
      ? projectFromQuery
      : (clientProjects[0]?.id ?? ""),
  );

  useEffect(() => {
    void hydrateProcess(fieldOptions.projectTypes);
  }, [fieldOptions.projectTypes, hydrateProcess]);

  useEffect(() => {
    if (!clientProjects.length) {
      return;
    }
    void hydrateDashboard({
      projects: clientProjects.map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
      })),
    }).catch(() => undefined);
  }, [clientProjects, hydrateDashboard]);

  useEffect(() => {
    if (!selectedProjectId && clientProjects[0]) {
      setSelectedProjectId(clientProjects[0].id);
    }
  }, [clientProjects, selectedProjectId]);

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    router.replace(`/przestrzenie/klient/${clientId}?project=${projectId}`, { scroll: false });
  }

  const selectedProject = clientProjects.find((project) => project.id === selectedProjectId);
  const clientSpace = selectedProjectId
    ? getSpaceByProject(selectedProjectId, "client")
    : null;
  const process = selectedProjectId ? getProjectProcess(selectedProjectId) ?? null : null;
  const template = templates.find((entry) => entry.projectType === selectedProject?.type) ?? null;

  if (!client) {
    return (
      <DashboardSpaceShell kind="client" title="Nie znaleziono klienta">
        <Card>
          <CardContent className="py-6 text-sm text-rose-200">
            Klient nie istnieje lub nie został jeszcze załadowany.
            <div className="mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/klienci">Przejdź do listy klientów</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardSpaceShell>
    );
  }

  return (
    <DashboardSpaceShell
      kind="client"
      title={client.fullName}
      description={`Dashboard współpracy z klientem${clientProjects.length > 1 ? " — przełącz projekt w panelu bocznym" : ""}.`}
      backHref="/przestrzenie"
    >
      {!processHydrated ? (
        <p className="mb-4 text-sm text-muted">Ładowanie danych procesu…</p>
      ) : null}

      <ClientDashboardView
        client={client}
        projects={clientProjects}
        selectedProjectId={selectedProjectId}
        onProjectChange={handleProjectChange}
        clientSpace={clientSpace}
        process={process}
        template={template}
        teamAuthorName={displayName || "Zespół"}
      />
    </DashboardSpaceShell>
  );
}
