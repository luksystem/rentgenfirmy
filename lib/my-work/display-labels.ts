export function workItemProjectLabel(projectName: string | null | undefined) {
  const trimmed = projectName?.trim();
  return trimmed || "Bez projektu";
}
