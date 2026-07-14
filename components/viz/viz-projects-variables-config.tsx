"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VizDashboardProject, VizVariableMapping, VizVariableRole } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";

type IntegrationVariableOption = {
  id: string;
  integrationId: string;
  projectId: string;
  name: string;
  sourceKey: string;
  locationLabel: string | null;
  isActive: boolean;
};

type VizProjectsVariablesConfigProps = {
  dashboardId: string;
};

export function VizProjectsVariablesConfig({ dashboardId }: VizProjectsVariablesConfigProps) {
  const variableRoles = useVizStore((s) => s.variableRoles);
  const [projects, setProjects] = useState<VizDashboardProject[]>([]);
  const [variables, setVariables] = useState<IntegrationVariableOption[]>([]);
  const [mappings, setMappings] = useState<VizVariableMapping[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectsRes, mappingsRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=projects`),
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=mappings`),
      ]);

      if (!projectsRes.ok || !mappingsRes.ok) {
        throw new Error("Błąd pobierania danych konfiguracji.");
      }

      const projectsData = (await projectsRes.json()) as {
        projects: VizDashboardProject[];
        variables: IntegrationVariableOption[];
      };
      const mappingsData = (await mappingsRes.json()) as { mappings: VizVariableMapping[] };

      setProjects(projectsData.projects);
      setVariables(projectsData.variables);
      setMappings(mappingsData.mappings);

      setSelectedProjectId((current) => {
        if (current && projectsData.projects.some((p) => p.projectId === current)) {
          return current;
        }
        return projectsData.projects[0]?.projectId ?? "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const projectMappings = mappings.filter((m) => m.projectId === selectedProjectId);
  const projectVariables = variables.filter((v) => v.projectId === selectedProjectId);
  const selectedProject = projects.find((p) => p.projectId === selectedProjectId);

  async function saveMapping(role: VizVariableRole, integrationVariableId: string | null) {
    if (!selectedProjectId || !integrationVariableId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const variable = projectVariables.find((v) => v.id === integrationVariableId);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "mapping",
          mapping: {
            projectId: selectedProjectId,
            integrationVariableId,
            roleCode: role.code,
            displayName: role.name,
            unit: role.defaultUnit,
            writable: role.code === "store_setpoint",
          },
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Błąd zapisu mapowania.");
      }

      const data = (await response.json()) as { mapping: VizVariableMapping };
      setMappings((prev) => {
        const filtered = prev.filter(
          (m) => !(m.projectId === data.mapping.projectId && m.roleCode === data.mapping.roleCode),
        );
        return [...filtered, data.mapping];
      });
      setMessage(`Zapisano: ${role.name} → ${variable?.sourceKey ?? integrationVariableId}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMapping(mappingId: string) {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=mapping&id=${mappingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Błąd usuwania mapowania.");
      }
      setMappings((prev) => prev.filter((m) => m.id !== mappingId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie konfiguracji…
      </div>
    );
  }

  if (!projects.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Brak przypisanych projektów.{" "}
        <Link href={`/wizualizacje/${dashboardId}/konfiguracja`} className="text-accent hover:underline">
          Dodaj projekty w konfiguracji dashboardu
        </Link>
        .
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1.5 block text-sm font-medium">Sklep / projekt</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.displayName ?? project.projectName ?? project.projectId}
                </option>
              ))}
            </select>
          </div>
          {selectedProject ? (
            <div className="text-sm text-muted">
              <p>{selectedProject.clientAddress ?? "Brak adresu klienta projektu"}</p>
              <p className="text-xs">
                Lokalizacja pochodzi z klienta przypisanego do projektu (jeden klient = jeden adres
                obiektu).
              </p>
              <Link
                href={`/wizualizacje/${dashboardId}/sklep/${selectedProject.projectId}`}
                className="text-accent hover:underline"
              >
                Szczegóły sklepu
              </Link>
            </div>
          ) : null}
        </div>

        {projectVariables.length === 0 ? (
          <p className="text-sm text-amber-300">
            Brak zmiennych Loxone w projekcie. Dodaj je w edycji projektu → Integracje → Zmienne
            Loxone.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Dostępne zmienne:{" "}
            {projectVariables.map((v) => `${v.name} (${v.sourceKey})`).join(", ")}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Mapowanie ról semantycznych</h2>
        <div className="space-y-3">
          {variableRoles.map((role) => {
            const mapping = projectMappings.find((m) => m.roleCode === role.code);
            return (
              <div
                key={role.code}
                className="grid gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <p className="font-medium">{role.name}</p>
                  <p className="text-xs text-muted">{role.code}</p>
                </div>
                <select
                  className="h-10 rounded-xl border border-border bg-surface-muted px-3 text-sm"
                  value={mapping?.integrationVariableId ?? ""}
                  disabled={isSaving || projectVariables.length === 0}
                  onChange={(e) => void saveMapping(role, e.target.value || null)}
                >
                  <option value="">— brak mapowania —</option>
                  {projectVariables.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.name} → {variable.sourceKey}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  {mapping?.integrationVariableId ? (
                    <>
                      <span className="text-xs text-emerald-300">Skonfigurowane</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => void deleteMapping(mapping.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted">Nieskonfigurowane</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Zapisywanie…
            </>
          ) : null}
          {message ? <span className="text-emerald-300">{message}</span> : null}
          {error ? <span className="text-rose-300">{error}</span> : null}
          <Button type="button" size="sm" variant="secondary" onClick={() => void loadData()}>
            <Save className="h-3.5 w-3.5" />
            Odśwież
          </Button>
        </div>
      </Card>
    </div>
  );
}
