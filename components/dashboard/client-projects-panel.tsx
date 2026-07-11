"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderPlus, Link2, Plus } from "lucide-react";
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
import { Field } from "@/components/ui/input";
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
  const updateProject = useAppStore((state) => state.updateProject);
  const addProject = useAppStore((state) => state.addProject);
  const isSaving = useAppStore((state) => state.isSaving);

  const [assignProjectId, setAssignProjectId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unassignedProjects = useMemo(
    () =>
      allProjects
        .filter((project) => !project.clientId)
        .sort((left, right) => left.name.localeCompare(right.name, "pl")),
    [allProjects],
  );

  async function handleAssignProject() {
    if (!assignProjectId) {
      return;
    }

    const existing = allProjects.find((project) => project.id === assignProjectId);
    if (!existing) {
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      await updateProject(assignProjectId, {
        ...projectToInput(existing),
        clientId: client.id,
      });
      setAssignProjectId("");
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
            Ten klient nie ma jeszcze przypisanych projektów. Utwórz nowy lub przypisz istniejący
            bez klienta.
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

        {unassignedProjects.length > 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface-muted/10 p-3">
            <p className="mb-2 text-sm font-medium text-foreground">Przypisz istniejący projekt</p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Projekt bez klienta" className="min-w-[220px] flex-1">
                <select
                  value={assignProjectId}
                  onChange={(event) => setAssignProjectId(event.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                >
                  <option value="">Wybierz projekt…</option>
                  {unassignedProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} · {project.type}
                    </option>
                  ))}
                </select>
              </Field>
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
          </div>
        ) : null}

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
            isSaving={isSaving}
            onSubmit={(input) => void handleCreateProject(input)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
