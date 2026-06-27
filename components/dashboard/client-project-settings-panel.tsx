"use client";

import { ProjectForm } from "@/components/project-form";
import { projectToInput } from "@/lib/supabase/mappers";
import type { Project, ProjectInput } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function ClientProjectSettingsPanel({ project }: { project: Project }) {
  const updateProject = useAppStore((state) => state.updateProject);
  const isSaving = useAppStore((state) => state.isSaving);

  async function handleSubmit(input: ProjectInput) {
    await updateProject(project.id, {
      ...projectToInput(project),
      ...input,
      clientId: project.clientId ?? null,
      lastContactDate: project.lastContactDate,
      systemHandoverAt: project.systemHandoverAt,
      warrantyDurationMonths: project.warrantyDurationMonths,
      warrantyEndsAt: project.warrantyEndsAt,
    });
  }

  return (
    <ProjectForm
      key={project.id}
      project={project}
      variant="client-dashboard"
      isSaving={isSaving}
      hideCancel
      onSubmit={handleSubmit}
      onCancel={() => undefined}
    />
  );
}
