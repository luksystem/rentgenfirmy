"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { ProjectForm } from "@/components/project-form";
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
import { Select } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import { formatDate } from "@/lib/utils";
import {
  type FlowStatus,
  type Project,
  type ProjectInput,
  type ProjectType,
} from "@/lib/types";

type DialogMode = "create" | "edit" | null;

export function ProjectsTable() {
  const { projects, addProject, updateProject, deleteProject, isSaving, fieldOptions } =
    useAppStore();
  const [typeFilter, setTypeFilter] = useState<ProjectType | "Wszystkie">("Wszystkie");
  const [flowStatusFilter, setFlowStatusFilter] = useState<FlowStatus | "Wszystkie">(
    "Wszystkie",
  );
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesType = typeFilter === "Wszystkie" || project.type === typeFilter;
        const matchesFlowStatus =
          flowStatusFilter === "Wszystkie" || project.flowStatus === flowStatusFilter;
        return matchesType && matchesFlowStatus;
      }),
    [projects, typeFilter, flowStatusFilter],
  );

  const isDialogOpen = dialogMode !== null;

  function openCreate() {
    setEditingProject(undefined);
    setDialogMode("create");
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingProject(undefined);
  }

  async function handleSubmit(project: ProjectInput) {
    try {
      if (dialogMode === "edit" && editingProject) {
        await updateProject(editingProject.id, project);
      } else {
        await addProject(project);
      }

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
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <p className="font-semibold">Tabela projektów</p>
            <p className="text-sm text-slate-500">
              Kliknij wiersz lub ikonę edycji, aby zmienić wszystkie pola projektu.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as ProjectType | "Wszystkie")
              }
              className="w-full sm:w-44"
              aria-label="Filtr typu projektu"
            >
              <option>Wszystkie</option>
              {fieldOptions.projectTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
            <Select
              value={flowStatusFilter}
              onChange={(event) =>
                setFlowStatusFilter(event.target.value as FlowStatus | "Wszystkie")
              }
              className="w-full sm:w-56"
              aria-label="Filtr statusu przepływu"
            >
              <option>Wszystkie</option>
              {fieldOptions.flowStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Dodaj projekt
            </Button>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {filteredProjects.map((project) => (
            <MobileListCard
              key={project.id}
              title={project.name}
              subtitle={project.type}
              onClick={() => openEdit(project)}
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
                    onClick={() => openEdit(project)}
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
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer hover:bg-slate-50/70"
                  onClick={() => openEdit(project)}
                >
                  <td className="px-4 py-3 font-medium text-slate-950">{project.name}</td>
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
                        onClick={() => openEdit(project)}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edytuj projekt" : "Dodaj projekt"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Zmień dowolne pole projektu. Po zapisie zaktualizowane zostaną data i autor ostatniej zmiany."
                : "Uzupełnij dane nowego projektu."}
            </DialogDescription>
          </DialogHeader>

          <ProjectForm
            key={editingProject?.id ?? "new"}
            project={editingProject}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
