"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientDashboardView } from "@/components/dashboard/client-dashboard-view";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSpace } from "@/lib/dashboard/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

type PublicDashboardPayload = {
  space: DashboardSpace;
  client: Client;
  projects: Project[];
  initialProjectId: string;
  process: ProjectProcess | null;
  template: ProcessTemplate | null;
  features: {
    agreements: boolean;
    specification: boolean;
  };
};

async function fetchPublicDashboard(token: string, projectId?: string) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const response = await fetch(`/api/przestrzen/${encodeURIComponent(token)}${query}`);
  const payload = (await response.json()) as PublicDashboardPayload & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Nie udało się załadować dashboardu.");
  }

  return payload;
}

export default function PublicDashboardPage() {
  const params = useParams();
  const token = String(params.token);
  const [space, setSpace] = useState<DashboardSpace | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [process, setProcess] = useState<ProjectProcess | null>(null);
  const [template, setTemplate] = useState<ProcessTemplate | null>(null);
  const [features, setFeatures] = useState({ agreements: true, specification: true });
  const [loading, setLoading] = useState(true);
  const [switchingProject, setSwitchingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const applyPayload = useCallback((payload: PublicDashboardPayload) => {
    setSpace(payload.space);
    setClient(payload.client);
    setProjects(payload.projects);
    setProcess(payload.process);
    setTemplate(payload.template);
    setFeatures(payload.features);
    setSelectedProjectId(payload.initialProjectId);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        applyPayload(await fetchPublicDashboard(token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania dashboardu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [applyPayload, token]);

  const handleProjectChange = useCallback(
    (projectId: string) => {
      if (projectId === selectedProjectId) {
        return;
      }

      void (async () => {
        setSwitchingProject(true);
        setError(null);
        try {
          applyPayload(await fetchPublicDashboard(token, projectId));
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : "Błąd ładowania projektu.");
        } finally {
          setSwitchingProject(false);
        }
      })();
    },
    [applyPayload, selectedProjectId, token],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-sm text-muted">Ładowanie dashboardu…</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardContent className="py-8 text-sm text-rose-200">
              {error ?? "Nie udało się załadować dashboardu klienta."}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Dashboard klienta
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{client.fullName}</h1>
          <p className="mt-1 text-sm text-muted">Wspólna przestrzeń projektu — widok publiczny.</p>
        </div>

        {switchingProject ? (
          <p className="mb-4 text-sm text-muted">Ładowanie danych projektu…</p>
        ) : null}

        <ClientDashboardView
          client={client}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={handleProjectChange}
          clientSpace={space}
          process={process}
          template={template}
          showPublicLink={false}
          readOnly
          clientAuthorName={client.fullName}
          enableAgreements={features.agreements}
          enableSpecification={features.specification}
        />
      </div>
    </div>
  );
}
