"use client";

import { cn } from "@/lib/utils";

export type BoardNavCategory = {
  id: string;
  name: string;
  tone: "failed" | "complete" | "progress" | "idle";
  subtitle?: string;
};

export function BoardCategoryMobileNav({
  categories,
  activeCategoryId,
  onSelect,
}: {
  categories: BoardNavCategory[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}) {
  if (categories.length <= 1) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[110] border-t border-border/80 bg-surface-elevated/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((category) => {
          const toneClass =
            category.tone === "failed"
              ? "border-rose-500/50 bg-rose-500/15 text-rose-200"
              : category.tone === "complete"
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                : category.tone === "progress"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                  : "border-border/60 bg-surface-muted/40 text-muted";

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-2 text-left text-xs font-medium transition",
                toneClass,
                activeCategoryId === category.id && "ring-2 ring-accent/40",
              )}
            >
              <span className="block max-w-[9rem] truncate">{category.name}</span>
              {category.subtitle ? (
                <span className="mt-0.5 block text-[10px] opacity-90">{category.subtitle}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
