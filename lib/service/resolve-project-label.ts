export function resolveProjectLabel(
  projectId: string | null,
  projects: { id: string; name: string }[],
  explicitName?: string,
) {
  if (explicitName?.trim()) {
    return explicitName.trim();
  }

  if (!projectId) {
    return "Bez projektu";
  }

  return projects.find((project) => project.id === projectId)?.name ?? "Nieznany projekt";
}
