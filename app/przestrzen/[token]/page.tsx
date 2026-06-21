"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClientDashboardView } from "@/components/dashboard/client-dashboard-view";
import { Card, CardContent } from "@/components/ui/card";
import { fetchDashboardSpaceByToken } from "@/lib/supabase/dashboard-repository";
import { fetchProjectProcess } from "@/lib/supabase/process-repository";
import { fetchProcessTemplates } from "@/lib/supabase/process-repository";
import { fetchClients } from "@/lib/supabase/client-repository";
import { fetchProjects } from "@/lib/supabase/repository";
import type { DashboardSpace } from "@/lib/dashboard/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

export default function PublicDashboardPage() {
  const params = useParams();
  const token = String(params.token);
  const [space, setSpace] = useState<DashboardSpace | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [process, setProcess] = useState<ProjectProcess | null>(null);
  const [template, setTemplate] = useState<ProcessTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const loadedSpace = await fetchDashboardSpaceByToken(token);
        if (!loadedSpace || !loadedSpace.publicEnabled) {
          setError("Link jest nieaktywny lub nie istnieje.");
          return;
        }
        if (loadedSpace.kind !== "client" || !loadedSpace.clientId) {
          setError("Ten link nie prowadzi do dashboardu klienta.");
          return;
        }

        setSpace(loadedSpace);

        const [clients, allProjects, templates] = await Promise.all([
          fetchClients(),
          fetchProjects(),
          fetchProcessTemplates(),
        ]);

        const matchedClient = clients.find((entry) => entry.id === loadedSpace.clientId) ?? null;
        if (!matchedClient) {
          setError("Nie znaleziono klienta.");
          return;
        }

        const clientProjects = allProjects
          .filter((project) => project.clientId === matchedClient.id)
          .sort((a, b) => a.name.localeCompare(b.name, "pl"));

        const initialProjectId =
          loadedSpace.projectId &&
          clientProjects.some((project) => project.id === loadedSpace.projectId)
            ? loadedSpace.projectId
            : (clientProjects[0]?.id ?? "");

        setClient(matchedClient);
        setProjects(clientProjects);
        setSelectedProjectId(initialProjectId);

        if (initialProjectId) {
          const selected = clientProjects.find((project) => project.id === initialProjectId);
          const loadedProcess = await fetchProjectProcess(initialProjectId);
          setProcess(loadedProcess);
          setTemplate(templates.find((entry) => entry.projectType === selected?.type) ?? null);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania dashboardu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    void (async () => {
      const selected = projects.find((project) => project.id === selectedProjectId);
      const [loadedProcess, templates] = await Promise.all([
        fetchProjectProcess(selectedProjectId),
        fetchProcessTemplates(),
      ]);
      setProcess(loadedProcess);
      setTemplate(templates.find((entry) => entry.projectType === selected?.type) ?? null);
    })();
  }, [projects, selectedProjectId]);

  const clientSpace = useMemo(() => space, [space]);

  if (loading) {
    return <p className="p-6 text-sm text-muted">Ładowanie dashboardu…</p>;
  }

  if (error || !client) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card>
          <CardContent className="py-8 text-sm text-rose-200">{error ?? "Błąd"}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Dashboard klienta</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{client.fullName}</h1>
        <p className="mt-1 text-sm text-muted">Wspólna przestrzeń projektu — widok publiczny.</p>
      </div>

      <ClientDashboardView
        client={client}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        clientSpace={clientSpace}
        process={process}
        template={template}
        showPublicLink={false}
        readOnly
        clientAuthorName={client.fullName}
      />
    </div>
  );
}
