"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderPlus, Link2, Plus } from "lucide-react";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { ProjectForm } from "@/components/project-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { projectToInput } from "@/lib/supabase/mappers";
import { formatPartyName } from "@/lib/party/display-name";
import type { Client } from "@/lib/service/types";
import type { Project, ProjectInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function ClientProjectsPanel({
  client,
  projects,
  selectedProjectId,
  onProjectChange,
  teamSpaceHref,
}: {
  client: Client;
  projects: Project[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
  teamSpaceHref?: (projectId: string) => string;
}) {
  const allProjects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const updateProject = useAppStore((state) => state.updateProject);
  const addProject = useAppStore((state) => state.addProject);
  const isSaving = useAppStore((state) => state.isSaving);

  const [assignProjectId, setAssignProjectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableProjects = useMemo(
    () => allProjects.filter((project) => project.clientId !== client.id),
    [allProjects, client.id],
  );

  const selectedAssignable = useMemo(
    () => assignableProjects.find((project) => project.id === assignProjectId) ?? null,
    [assignableProjects, assignProjectId],
  );

  async function handleAssignProject() {
    if (!assignProjectId) {
      return;
    }

    const existing = allProjects.find((project) => project.id === assignProjectId);
    if (!existing) {
      return;
    }

    if (existing.clientId && existing.clientId !== client.id) {
      const otherClient = clients.find((entry) => entry.id === existing.clientId);
      const otherName = otherClient ? formatPartyName(otherClient) : "innego klienta";
      const confirmed = window.confirm(
        `Projekt „${existing.name}” jest przypisany do ${otherName}. Przypisać go do ${formatPartyName(client)}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setAssigning(true);
    setError(null);
    try {
      await updateProject(assignProjectId, {
        ...projectToInput(existing),
        clientId: client.id,
      });
      setAssignProjectId(null);
      onProjectChange?.(assignProjectId);
    } catch {
      setError("Nie udało się przypisać projektu.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleCreateProject(input: ProjectInput) {
    const beforeIds = new Set(useAppStore.getState().projects.map((entry) => entry.id));
    await addProject({ ...input, clientId: client.id });
    const created = useAppStore
      .getState()
      .projects.find((entry) => !beforeIds.has(entry.id) && entry.clientId === client.id);
    setCreateOpen(false);
    if (created) {
      onProjectChange?.(created.id);
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Projekty klienta</CardTitle>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nowy projekt
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted">
            Ten klient nie ma jeszcze przypisanych projektów. Wyszukaj i przypisz istniejący albo
            utwórz nowy.
          </p>
        ) : (
          <div className="grid gap-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2",
                  project.id === selectedProjectId
                    ? "border-accent/40 bg-accent/10"
                    : "border-border/70 bg-surface-muted/20",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onProjectChange?.(project.id)}
                >
                  <p className="font-medium text-foreground">{project.name}</p>
                  <p className="text-xs text-muted">
                    {project.type} · {project.stage}
                  </p>
                </button>
                {teamSpaceHref ? (
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={teamSpaceHref(project.id)}>
                      <Link2 className="mr-1.5 h-3.5 w-3.5" />
                      Otwórz
                    </Link>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border/80 bg-surface-muted/10 p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Przypisz istniejący projekt</p>
          <p className="mb-3 text-xs text-muted">
            Lista posortowana alfabetycznie po nazwisku klienta. Wpisz nazwę, żeby wyszukać.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <ProjectSelectSearchable
              projects={assignableProjects}
              clients={clients}
              value={assignProjectId}
              onChange={setAssignProjectId}
              emptyLabel="Wyszukaj projekt…"
              label="Projekt"
              usePortal={false}
              className="min-w-[220px] flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!assignProjectId || assigning}
              onClick={() => void handleAssignProject()}
            >
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
              Przypisz
            </Button>
          </div>
          {selectedAssignable?.clientId ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Ten projekt jest już przypisany do innego klienta — przypisanie przeniesie go tutaj.
            </p>
          ) : null}
          {assignableProjects.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              Brak innych projektów do przypisania. Utwórz nowy projekt dla tego klienta.
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nowy projekt dla {formatPartyName(client)}</DialogTitle>
            <DialogDescription>
              Projekt zostanie utworzony i automatycznie przypisany do tego klienta.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            defaultClientId={client.id}
            variant="client-dashboard"
            isSaving={isSaving}
            onSubmit={(input) => void handleCreateProject(input)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
