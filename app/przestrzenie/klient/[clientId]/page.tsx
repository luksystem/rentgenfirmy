"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  return (
    <Suspense
      fallback={
        <DashboardSpaceShell kind="client" title="Dashboard klienta">
          <p className="text-sm text-muted">Ładowanie dashboardu klienta…</p>
        </DashboardSpaceShell>
      }
    >
      <ClientDashboardPageContent />
    </Suspense>
  );
}

function ClientDashboardPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = String(params.clientId);

  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const hydrateDashboard = useDashboardStore((state) => state.hydrate);
  const spaces = useDashboardStore((state) => state.spaces);
  const hydrateProcess = useProcessStore((state) => state.hydrate);
  const getProjectProcess = useProcessStore((state) => state.getProjectProcess);
  const templates = useProcessStore((state) => state.templates);
  const processHydrated = useProcessStore((state) => state.hydrated);
  const displayName = useAuthStore((state) => state.displayName);
  const updateProjectWarrantySettings = useAppStore((state) => state.updateProjectWarrantySettings);
  const patchProjectFields = useAppStore((state) => state.patchProjectFields);

  const client = clients.find((entry) => entry.id === clientId) ?? null;
  const clientProjects = useMemo(
    () =>
      projects
        .filter((project) => project.clientId === clientId)
        .sort((a, b) => a.name.localeCompare(b.name, "pl")),
    [clientId, projects],
  );

  const projectFromQuery = searchParams.get("project");
  const activeKanbanToken = searchParams.get("kanban");
  const tabFromQuery = searchParams.get("tab");
  const agreementFromQuery = searchParams.get("agreement");
  const initialTab =
    tabFromQuery === "agreements" ||
    tabFromQuery === "home" ||
    tabFromQuery === "project" ||
    tabFromQuery === "overview" ||
    tabFromQuery === "process" ||
    tabFromQuery === "specification" ||
    tabFromQuery === "trades" ||
    tabFromQuery === "satisfaction" ||
    tabFromQuery === "credentials" ||
    tabFromQuery === "links"
      ? tabFromQuery
      : undefined;
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

  const handleKanbanTokenChange = useCallback(
    (kanbanToken: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (kanbanToken) {
        nextParams.set("kanban", kanbanToken);
      } else {
        nextParams.delete("kanban");
      }
      if (selectedProjectId) {
        nextParams.set("project", selectedProjectId);
      }
      const query = nextParams.toString();
      router.replace(
        query ? `/przestrzenie/klient/${clientId}?${query}` : `/przestrzenie/klient/${clientId}`,
        { scroll: false },
      );
    },
    [clientId, router, searchParams, selectedProjectId],
  );

  const selectedProject = clientProjects.find((project) => project.id === selectedProjectId);
  const clientSpace = useMemo(
    () =>
      selectedProjectId
        ? (spaces.find(
            (space) => space.projectId === selectedProjectId && space.kind === "client",
          ) ?? null)
        : null,
    [selectedProjectId, spaces],
  );
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
      compactMobile
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
        activeKanbanToken={activeKanbanToken}
        onKanbanTokenChange={handleKanbanTokenChange}
        initialTab={initialTab}
        focusAgreementId={agreementFromQuery ?? undefined}
        onProjectPatch={(projectId, patch) => {
          const project = clientProjects.find((entry) => entry.id === projectId);
          if ("systemHandoverAt" in patch || "warrantyDurationMonths" in patch) {
            void updateProjectWarrantySettings(projectId, {
              systemHandoverAt:
                "systemHandoverAt" in patch
                  ? (patch.systemHandoverAt ?? null)
                  : (project?.systemHandoverAt ?? null),
              warrantyDurationMonths:
                "warrantyDurationMonths" in patch
                  ? (patch.warrantyDurationMonths ?? null)
                  : (project?.warrantyDurationMonths ?? null),
            });
            return;
          }
          if ("warrantyEndsAt" in patch) {
            patchProjectFields(projectId, { warrantyEndsAt: patch.warrantyEndsAt });
            return;
          }
          patchProjectFields(projectId, patch);
        }}
      />
    </DashboardSpaceShell>
  );
}
