"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  VIZ_DASHBOARD_STATUSES,
  VIZ_DASHBOARD_STATUS_LABELS,
  VIZ_SERVICE_CONTRACT_STATUS_LABELS,
  type VizDashboard,
  type VizDashboardProject,
  type VizDashboardProjectInput,
} from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";
import { useAppStore } from "@/store/app-store";

type VizDashboardConfigFormProps = {
  dashboard: VizDashboard;
};

export function VizDashboardConfigForm({ dashboard }: VizDashboardConfigFormProps) {
  const updateDashboard = useVizStore((s) => s.updateDashboard);
  const clients = useAppStore((s) => s.clients);
  const projects = useAppStore((s) => s.projects);

  const [name, setName] = useState(dashboard.name);
  const [description, setDescription] = useState(dashboard.description ?? "");
  const [status, setStatus] = useState(dashboard.status);
  const [clientId, setClientId] = useState(dashboard.clientId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientProjects = useMemo(
    () =>
      clientId
        ? projects.filter((p) => p.clientId === clientId && p.isActive !== false)
        : [],
    [clientId, projects],
  );

  useEffect(() => {
    setName(dashboard.name);
    setDescription(dashboard.description ?? "");
    setStatus(dashboard.status);
    setClientId(dashboard.clientId ?? "");
  }, [dashboard]);

  async function handleSaveMeta(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateDashboard(dashboard.id, {
        name: name.trim(),
        description: description.trim() || null,
        status,
        clientId: clientId || null,
      });
      setMessage("Zapisano ustawienia dashboardu.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Ustawienia ogólne</h2>
        <form onSubmit={(e) => void handleSaveMeta(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Nazwa</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Opis</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              {VIZ_DASHBOARD_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {VIZ_DASHBOARD_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Klient</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— wybierz —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {[client.firstName, client.lastName].filter(Boolean).join(" ") ||
                    client.location}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapisywanie…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Zapisz
                </>
              )}
            </Button>
            {message ? <span className="text-sm text-emerald-300">{message}</span> : null}
            {error ? <span className="text-sm text-rose-300">{error}</span> : null}
          </div>
        </form>
      </Card>

      <VizDashboardProjectsConfig
        dashboardId={dashboard.id}
        clientId={clientId}
        clientProjects={clientProjects}
      />
    </div>
  );
}

function VizDashboardProjectsConfig({
  dashboardId,
  clientId,
  clientProjects,
}: {
  dashboardId: string;
  clientId: string;
  clientProjects: ReturnType<typeof useAppStore.getState>["projects"];
}) {
  const [assigned, setAssigned] = useState<VizDashboardProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config?section=projects`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Błąd pobierania projektów.");
      }
      const data = (await response.json()) as { projects: VizDashboardProject[] };
      setAssigned(data.projects);
      setSelectedIds(new Set(data.projects.map((p) => p.projectId)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function toggleProject(projectId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  async function handleSaveProjects() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const existingByProjectId = new Map(assigned.map((p) => [p.projectId, p]));
    const payload: VizDashboardProjectInput[] = [...selectedIds].map((projectId, index) => {
      const existing = existingByProjectId.get(projectId);
      const project = clientProjects.find((p) => p.id === projectId);
      return {
        projectId,
        displayName: existing?.displayName ?? project?.name ?? null,
        bmsCommissionedAt: existing?.bmsCommissionedAt ?? null,
        isActiveInDashboard: existing?.isActiveInDashboard ?? true,
        sortOrder: index,
        serviceContractStatus: existing?.serviceContractStatus ?? "none",
      };
    });

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "projects", projects: payload }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Błąd zapisu projektów.");
      }
      const data = (await response.json()) as { projects: VizDashboardProject[] };
      setAssigned(data.projects);
      setMessage("Zapisano przypisane projekty.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold">Projekty dashboardu</h2>
      <p className="mb-4 text-sm text-muted">
        Lokalizacja sklepu pochodzi z klienta projektu. Tutaj wybierasz, które projekty należą do
        dashboardu.
      </p>

      {!clientId ? (
        <p className="text-sm text-amber-300">Wybierz klienta w ustawieniach ogólnych.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 py-8 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ładowanie projektów…
        </div>
      ) : clientProjects.length === 0 ? (
        <p className="text-sm text-muted">Brak aktywnych projektów dla wybranego klienta.</p>
      ) : (
        <div className="space-y-2">
          {clientProjects.map((project) => {
            const assignment = assigned.find((a) => a.projectId === project.id);
            return (
              <label
                key={project.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-muted/50 p-3"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(project.id)}
                  onChange={() => toggleProject(project.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{project.name}</p>
                  {assignment?.clientAddress ? (
                    <p className="text-sm text-muted">{assignment.clientAddress}</p>
                  ) : null}
                  {assignment ? (
                    <p className="mt-1 text-xs text-muted">
                      Umowa: {VIZ_SERVICE_CONTRACT_STATUS_LABELS[assignment.serviceContractStatus]}
                    </p>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!clientId || isSaving}
          onClick={() => void handleSaveProjects()}
        >
          {isSaving ? "Zapisywanie…" : "Zapisz projekty"}
        </Button>
        {message ? <span className="text-sm text-emerald-300">{message}</span> : null}
        {error ? <span className="text-sm text-rose-300">{error}</span> : null}
      </div>
    </Card>
  );
}
