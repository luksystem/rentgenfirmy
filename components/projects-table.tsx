"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { useProjectEdit } from "@/components/project-edit-provider";
import { ProjectForm } from "@/components/project-form";
import { ProjectViewFiltersBar } from "@/components/projects-view-filters";
import { PriorityBadge, ProjectStatusBadge } from "@/components/project-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { flowStatusNames } from "@/lib/field-options";
import {
  ALL_FILTER,
  DEFAULT_PROJECTS_VIEW_FILTERS,
  filterProjectsByView,
  isDefaultProjectsViewFilters,
  type ProjectCategoryFilterId,
  type ProjectsViewFilters,
} from "@/lib/projects-view-filters";
import { useAppStore } from "@/store/app-store";
import { formatDate } from "@/lib/utils";
import { type FlowStatus, type NextStepOwner, type ProjectInput, type ProjectType } from "@/lib/types";

type DialogMode = "create" | null;

export function ProjectsTable() {
  const {
    projects,
    addProject,
    deleteProject,
    isSaving,
    fieldOptions,
    projectsViewFilters,
    updateProjectsViewFilters,
    isInitialized,
  } = useAppStore();
  const { openProjectEdit } = useProjectEdit();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);

  const filteredProjects = useMemo(
    () => filterProjectsByView(projects, projectsViewFilters, fieldOptions),
    [projects, projectsViewFilters, fieldOptions],
  );

  function updateViewFilters(patch: Partial<ProjectsViewFilters>) {
    updateProjectsViewFilters({ ...projectsViewFilters, ...patch });
  }

  function resetViewFilters() {
    updateProjectsViewFilters(DEFAULT_PROJECTS_VIEW_FILTERS);
  }

  function openCreate() {
    setDialogMode("create");
  }

  function closeDialog() {
    setDialogMode(null);
  }

  async function handleSubmit(project: ProjectInput) {
    try {
      await addProject(project);
      closeDialog();
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Usunąć ten projekt?")) {
      return;
    }

    try {
      await deleteProject(id);
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-border/80 p-4 md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-foreground">Tabela projektów</p>
            <p className="text-sm text-muted">
              Kliknij wiersz lub ikonę edycji, aby zmienić wszystkie pola projektu.
              {isInitialized ? (
                <span className="mt-1 block text-foreground/80">
                  Widoczne: {filteredProjects.length} z {projects.length}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <Input
              type="search"
              value={projectsViewFilters.nameQuery}
              onChange={(event) => updateViewFilters({ nameQuery: event.target.value })}
              placeholder="Szukaj po nazwie..."
              className="w-full sm:min-w-[200px] sm:flex-1"
              aria-label="Szukaj projektu po nazwie"
            />
            <Select
              value={projectsViewFilters.typeFilter}
              onChange={(event) =>
                updateViewFilters({
                  typeFilter: event.target.value as ProjectType | typeof ALL_FILTER,
                })
              }
              className="w-full sm:w-44"
              aria-label="Filtr typu projektu"
            >
              <option value={ALL_FILTER}>Typ</option>
              {fieldOptions.projectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Select
              value={projectsViewFilters.flowStatusFilter}
              onChange={(event) =>
                updateViewFilters({
                  flowStatusFilter: event.target.value as FlowStatus | typeof ALL_FILTER,
                })
              }
              className="w-full sm:w-56"
              aria-label="Filtr statusu przepływu"
            >
              <option value={ALL_FILTER}>Status</option>
              {flowStatusNames(fieldOptions).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Select
              value={projectsViewFilters.ownerFilter}
              onChange={(event) =>
                updateViewFilters({
                  ownerFilter: event.target.value as NextStepOwner | typeof ALL_FILTER,
                })
              }
              className="w-full sm:w-48"
              aria-label="Filtr właściciela kolejnego kroku"
            >
              <option value={ALL_FILTER}>Właściciel</option>
              {fieldOptions.nextStepOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </Select>
            {!isDefaultProjectsViewFilters(projectsViewFilters) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={resetViewFilters}
                className="w-full sm:w-auto"
              >
                Domyślny widok
              </Button>
            ) : null}
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Dodaj projekt
            </Button>
          </div>
        </div>

        <div className="border-b border-border/80 px-4 pb-4">
          <ProjectViewFiltersBar
            categories={projectsViewFilters.categories}
            blockerFaults={projectsViewFilters.blockerFaults}
            onCategoriesChange={(categories: ProjectCategoryFilterId[]) =>
              updateViewFilters({ categories })
            }
            onBlockerFaultsChange={(blockerFaults) => updateViewFilters({ blockerFaults })}
          />
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {filteredProjects.map((project) => (
            <MobileListCard
              key={project.id}
              title={project.name}
              subtitle={project.type}
              onClick={() => openProjectEdit(project)}
              badges={
                <>
                  <ProjectStatusBadge
                    status={project.flowStatus}
                    priority={project.priority}
                    isActive={project.isActive}
                  />
                  <PriorityBadge priority={project.priority} />
                </>
              }
              footer={
                <div
                  className="flex gap-2"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => openProjectEdit(project)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edytuj
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(project.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            >
              <MobileField label="Etap" value={project.stage} />
              <MobileField label="Krok" value={project.nextStepOwner} />
              <MobileField label="Kontakt" value={formatDate(project.nextContactDate)} />
              <MobileField label="Blokada" value={project.blockerReason ?? "-"} />
            </MobileListCard>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Nazwa projektu</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Status przepływu</th>
                <th className="px-4 py-3">Etap realizacji</th>
                <th className="px-4 py-3">Priorytet</th>
                <th className="px-4 py-3">Właściciel kroku</th>
                <th className="px-4 py-3">Następny kontakt</th>
                <th className="px-4 py-3">Powód blokady</th>
                <th className="px-4 py-3">Ostatnio zmienił</th>
                <th className="px-4 py-3">Data zmiany</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer transition hover:bg-surface-muted/60"
                  onClick={() => openProjectEdit(project)}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{project.name}</td>
                  <td className="px-4 py-3">{project.type}</td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge
                      status={project.flowStatus}
                      priority={project.priority}
                      isActive={project.isActive}
                    />
                  </td>
                  <td className="px-4 py-3">{project.stage}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={project.priority} />
                  </td>
                  <td className="px-4 py-3">{project.nextStepOwner}</td>
                  <td className="px-4 py-3">{formatDate(project.nextContactDate)}</td>
                  <td className="px-4 py-3">{project.blockerReason ?? "-"}</td>
                  <td className="px-4 py-3">{project.lastChangedBy}</td>
                  <td className="px-4 py-3">{formatDate(project.lastChangedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openProjectEdit(project)}
                        title="Edytuj projekt"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edytuj
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(project.id)}
                        title="Usuń projekt"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogMode === "create"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dodaj projekt</DialogTitle>
            <DialogDescription>Uzupełnij dane nowego projektu.</DialogDescription>
          </DialogHeader>

          <ProjectForm
            key="new-project"
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
