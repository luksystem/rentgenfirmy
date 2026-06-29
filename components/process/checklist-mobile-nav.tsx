"use client";

import { cn } from "@/lib/utils";
import type { ChecklistSection } from "@/lib/process/types";
import { checklistSectionSummary } from "@/lib/process/item-payload";

export function ChecklistMobileNav({
  sections,
  activeSectionId,
  onSelect,
}: {
  sections: ChecklistSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  if (sections.length <= 1) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface-elevated/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {sections.map((section) => {
          const summary = checklistSectionSummary(section);
          const toneClass =
            summary.tone === "failed"
              ? "border-rose-500/50 bg-rose-500/15 text-rose-200"
              : summary.tone === "complete"
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                : summary.tone === "progress"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                  : "border-border/60 bg-surface-muted/40 text-muted";

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-2 text-left text-xs font-medium transition",
                toneClass,
                activeSectionId === section.id && "ring-2 ring-accent/40",
              )}
            >
              <span className="block max-w-[9rem] truncate">{section.name}</span>
              {summary.tone === "failed" ? (
                <span className="mt-0.5 block text-[10px] opacity-90">{summary.failed} problemów</span>
              ) : summary.tone === "complete" ? (
                <span className="mt-0.5 block text-[10px] opacity-90">ukończone</span>
              ) : summary.tone === "progress" ? (
                <span className="mt-0.5 block text-[10px] opacity-90">w toku</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
