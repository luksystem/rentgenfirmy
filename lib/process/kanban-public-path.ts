/** Wyciąga token z ścieżki publicznej tablicy, np. `/kanban/abc123`. */
export function extractKanbanTokenFromPublicPath(path: string): string | null {
  const match = path.match(/\/kanban\/([^/?#]+)/);
  return match?.[1] ?? null;
}
