"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { ProjectProcessLink } from "@/components/process/project-process-link";
import { useProjectEdit } from "@/components/project-edit-provider";
import { ProjectForm } from "@/components/project-form";
import { ProjectsStageKanban } from "@/components/projects-stage-kanban";
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
  formatProjectDuration,
  formatWarrantyEndDate,
  getWarrantyStatus,
} from "@/lib/project/warranty";
import {
  ALL_FILTER,
  countActiveProjectsViewFilters,
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
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

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

  const activeFilterCount = countActiveProjectsViewFilters(projectsViewFilters);

  function renderProjectFilters() {
    return (
      <div className="grid gap-3">
        <Input
          type="search"
          value={projectsViewFilters.nameQuery}
          onChange={(event) => updateViewFilters({ nameQuery: event.target.value })}
          placeholder="Szukaj po nazwie..."
          aria-label="Szukaj projektu po nazwie"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            value={projectsViewFilters.typeFilter}
            onChange={(event) =>
              updateViewFilters({
                typeFilter: event.target.value as ProjectType | typeof ALL_FILTER,
              })
            }
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
            aria-label="Filtr właściciela kolejnego kroku"
          >
            <option value={ALL_FILTER}>Właściciel</option>
            {fieldOptions.nextStepOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </Select>
        </div>
        <ProjectViewFiltersBar
          categories={projectsViewFilters.categories}
          blockerFaults={projectsViewFilters.blockerFaults}
          onCategoriesChange={(categories: ProjectCategoryFilterId[]) =>
            updateViewFilters({ categories })
          }
          onBlockerFaultsChange={(blockerFaults) => updateViewFilters({ blockerFaults })}
        />
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-border/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "table" ? "default" : "secondary"}
              onClick={() => setViewMode("table")}
            >
              Tabela
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "kanban" ? "default" : "secondary"}
              onClick={() => setViewMode("kanban")}
            >
              Kanban etapów
            </Button>
            <Button onClick={openCreate} size="sm" className="ml-auto shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Dodaj projekt</span>
            </Button>
          </div>

          {isInitialized ? (
            <p className="mt-2 text-sm text-muted">
              Widoczne:{" "}
              <span className="font-medium text-foreground/80">
                {filteredProjects.length} z {projects.length}
              </span>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-start gap-2">
            <MobileFiltersPanel
              activeCount={activeFilterCount}
              onClear={resetViewFilters}
              className="min-w-0 flex-1"
            >
              {renderProjectFilters()}
            </MobileFiltersPanel>
            {!isDefaultProjectsViewFilters(projectsViewFilters) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={resetViewFilters}
                className="hidden md:inline-flex"
              >
                Domyślny widok
              </Button>
            ) : null}
          </div>
        </div>

        {viewMode === "kanban" ? (
          <div className="p-4">
            <ProjectsStageKanban
              projects={projects}
              fieldOptions={fieldOptions}
              filters={projectsViewFilters}
            />
          </div>
        ) : (
          <>
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
                  <ProjectProcessLink
                    projectId={project.id}
                    projectType={project.type}
                    variant="button"
                  />
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
              <MobileField label="Czas trwania" value={formatProjectDuration(project)} />
              <MobileField
                label="Gwarancja"
                value={`${getWarrantyStatus(project).label} · ${formatWarrantyEndDate(project)}`}
              />
              <MobileField label="Krok" value={project.nextStepOwner} />
              <MobileField
                label="Proces"
                value={<ProjectProcessLink projectId={project.id} projectType={project.type} />}
              />
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
                <th className="px-4 py-3">Czas trwania</th>
                <th className="px-4 py-3">Gwarancja</th>
                <th className="px-4 py-3">Priorytet</th>
                <th className="px-4 py-3">Właściciel kroku</th>
                <th className="px-4 py-3">Następny kontakt</th>
                <th className="px-4 py-3">Powód blokady</th>
                <th className="px-4 py-3">Proces</th>
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
                  <td className="px-4 py-3">{formatProjectDuration(project)}</td>
                  <td className="px-4 py-3">
                    <div className="grid gap-0.5">
                      <span>{getWarrantyStatus(project).label}</span>
                      <span className="text-xs text-muted">{formatWarrantyEndDate(project)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={project.priority} />
                  </td>
                  <td className="px-4 py-3">{project.nextStepOwner}</td>
                  <td className="px-4 py-3">{formatDate(project.nextContactDate)}</td>
                  <td className="px-4 py-3">{project.blockerReason ?? "-"}</td>
                  <td className="px-4 py-3">
                    <ProjectProcessLink projectId={project.id} projectType={project.type} />
                  </td>
                  <td className="px-4 py-3">{project.lastChangedBy}</td>
                  <td className="px-4 py-3">{formatDate(project.lastChangedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <ProjectProcessLink
                        projectId={project.id}
                        projectType={project.type}
                        variant="button"
                      />
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
          </>
        )}
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
