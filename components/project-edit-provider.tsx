"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ProjectForm } from "@/components/project-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project, ProjectInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type ProjectEditContextValue = {
  openProjectEdit: (project: Project | string) => void;
};

const ProjectEditContext = createContext<ProjectEditContextValue | null>(null);

export function useProjectEdit() {
  const context = useContext(ProjectEditContext);
  if (!context) {
    throw new Error("useProjectEdit must be used within ProjectEditProvider");
  }

  return context;
}

export const projectClickableSurfaceClass =
  "cursor-pointer transition hover:border-border hover:bg-surface-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

function activateOnKeyboard(event: KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function useProjectClickHandlers(
  project: Project,
  options?: { asTableRow?: boolean },
) {
  const { openProjectEdit } = useProjectEdit();

  const open = useCallback(() => {
    openProjectEdit(project);
  }, [openProjectEdit, project]);

  if (options?.asTableRow) {
    return {
      onClick: open,
      className: projectClickableSurfaceClass,
    };
  }

  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: open,
    onKeyDown: (event: KeyboardEvent) => activateOnKeyboard(event, open),
    className: projectClickableSurfaceClass,
  };
}

export function ClickableProjectCard({
  project,
  children,
  className,
  light = false,
}: {
  project: Project;
  children: ReactNode;
  className?: string;
  light?: boolean;
}) {
  const clickHandlers = useProjectClickHandlers(project);

  return (
    <div
      {...clickHandlers}
      className={cn(
        "rounded-xl border border-border bg-surface-muted p-3 text-left",
        light && "border-zinc-200 bg-zinc-50",
        clickHandlers.className,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProjectEditProvider({ children }: { children: ReactNode }) {
  const projects = useAppStore((state) => state.projects);
  const updateProject = useAppStore((state) => state.updateProject);
  const isSaving = useAppStore((state) => state.isSaving);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const editingProject = editingProjectId
    ? projects.find((project) => project.id === editingProjectId)
    : undefined;

  const openProjectEdit = useCallback(
    (projectOrId: Project | string) => {
      const id = typeof projectOrId === "string" ? projectOrId : projectOrId.id;
      const exists = projects.some((project) => project.id === id);
      if (exists) {
        setEditingProjectId(id);
      }
    },
    [projects],
  );

  function closeDialog() {
    setEditingProjectId(null);
  }

  async function handleSubmit(project: ProjectInput) {
    if (!editingProject) {
      return;
    }

    try {
      await updateProject(editingProject.id, project);
      closeDialog();
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  return (
    <ProjectEditContext.Provider value={{ openProjectEdit }}>
      {children}
      <Dialog
        open={editingProjectId !== null && Boolean(editingProject)}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edytuj projekt</DialogTitle>
            <DialogDescription>
              Zmień dowolne pole projektu. Po zapisie zaktualizowane zostaną data i autor
              ostatniej zmiany.
            </DialogDescription>
          </DialogHeader>

          {editingProject ? (
            <ProjectForm
              key={editingProject.id}
              project={editingProject}
              isSaving={isSaving}
              onSubmit={handleSubmit}
              onCancel={closeDialog}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </ProjectEditContext.Provider>
  );
}
