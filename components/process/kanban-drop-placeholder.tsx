"use client";

import { cn } from "@/lib/utils";

export function KanbanDropPlaceholder({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-accent/70 bg-accent/10 px-3.5 py-3 shadow-inner transition-all duration-200",
        className,
      )}
      aria-hidden
    >
      <p className="truncate text-sm font-medium text-accent">{title ?? "Upuść tutaj"}</p>
      <p className="mt-1 text-[11px] text-accent/80">Puść, aby przenieść zgłoszenie</p>
    </div>
  );
}

export function getKanbanColumnDropTargetClasses(isDropTarget: boolean) {
  return isDropTarget
    ? "border-accent/60 bg-accent/[0.07] shadow-md ring-2 ring-accent/25 transition-all duration-200"
    : "transition-all duration-200";
}
