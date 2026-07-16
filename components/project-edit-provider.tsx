"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ProjectIntegrationsTab } from "@/components/project/project-integrations-tab";

const ProjectForm = dynamic(
  () => import("@/components/project-form").then((module) => module.ProjectForm),
  { ssr: false },
);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isIntegrationOperator } from "@/lib/auth/types";
import type { Project, ProjectInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

type ProjectEditTab = "details" | "integrations";

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
  const profile = useAuthStore((state) => state.profile);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectEditTab>("details");

  const showIntegrationsTab =
    isAdministrator || (profile ? isIntegrationOperator(profile.role) : false);

  const editingProject = editingProjectId
    ? projects.find((project) => project.id === editingProjectId)
    : undefined;

  const openProjectEdit = useCallback(
    (projectOrId: Project | string) => {
      const id = typeof projectOrId === "string" ? projectOrId : projectOrId.id;
      const exists = projects.some((project) => project.id === id);
      if (exists) {
        setActiveTab("details");
        setEditingProjectId(id);
      }
    },
    [projects],
  );

  function closeDialog() {
    setEditingProjectId(null);
    setActiveTab("details");
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj projekt</DialogTitle>
            <DialogDescription>
              {activeTab === "details"
                ? "Zmień dowolne pole projektu. Po zapisie zaktualizowane zostaną data i autor ostatniej zmiany."
                : "Połączenia z systemami BMS — odczyt temperatury i status online."}
            </DialogDescription>
          </DialogHeader>

          {showIntegrationsTab ? (
            <div className="flex gap-2 border-b border-border/70 pb-3">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  activeTab === "details"
                    ? "bg-accent/15 text-foreground"
                    : "text-muted hover:bg-surface-muted/80",
                )}
                onClick={() => setActiveTab("details")}
              >
                Dane projektu
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  activeTab === "integrations"
                    ? "bg-accent/15 text-foreground"
                    : "text-muted hover:bg-surface-muted/80",
                )}
                onClick={() => setActiveTab("integrations")}
              >
                Integracje
              </button>
            </div>
          ) : null}

          {editingProject && activeTab === "details" ? (
            <ProjectForm
              key={editingProject.id}
              project={editingProject}
              isSaving={isSaving}
              onSubmit={handleSubmit}
              onCancel={closeDialog}
            />
          ) : null}

          {editingProject && activeTab === "integrations" && showIntegrationsTab ? (
            <ProjectIntegrationsTab key={`${editingProject.id}-integrations`} projectId={editingProject.id} />
          ) : null}
        </DialogContent>
      </Dialog>
    </ProjectEditContext.Provider>
  );
}
