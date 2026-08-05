import type { ProcessItemCompletion, ProcessItemKind, ProjectProcessItem } from "@/lib/process/types";

export type ProcessItemVisualState = "open" | "completed" | "signed" | "failed";

export function getProcessItemVisualState(
  completion?: ProcessItemCompletion,
  instance?: ProjectProcessItem,
  kind?: ProcessItemKind,
): ProcessItemVisualState {
  if (instance?.signedAt) {
    return "signed";
  }
  const isCompleted = Boolean(completion) || instance?.status === "completed";
  if (!isCompleted) {
    return "open";
  }
  // Protokół ukończony = zaakceptowany oboma podpisami — wizualnie traktujemy jak "podpisany" (zielony).
  return kind === "protocol" ? "signed" : "completed";
}

export const PROCESS_ITEM_VISUAL_CLASSES: Record<
  ProcessItemVisualState,
  { card: string; icon: string }
> = {
  open: {
    card: "border-border/70 bg-surface/60",
    icon: "text-muted",
  },
  completed: {
    card: "border-yellow-500/30 bg-yellow-500/10",
    icon: "text-yellow-400",
  },
  signed: {
    card: "border-emerald-500/30 bg-emerald-500/10",
    icon: "text-emerald-400",
  },
  // Checklista ma co najmniej jeden punkt "Problem" nieobsłużony (bez "Ogarnięte") — patrz
  // process-pipeline.tsx, gdzie ten stan jest wymuszany niezaleznie od getProcessItemVisualState.
  failed: {
    card: "border-rose-500/40 bg-rose-500/10",
    icon: "text-rose-400",
  },
};
