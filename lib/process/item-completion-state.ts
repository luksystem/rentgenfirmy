import type { ProcessItemCompletion, ProjectProcessItem } from "@/lib/process/types";

export type ProcessItemVisualState = "open" | "completed" | "signed";

export function getProcessItemVisualState(
  completion?: ProcessItemCompletion,
  instance?: ProjectProcessItem,
): ProcessItemVisualState {
  if (instance?.signedAt) {
    return "signed";
  }
  if (completion || instance?.status === "completed") {
    return "completed";
  }
  return "open";
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
};
