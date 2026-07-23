"use client";

import { Search } from "lucide-react";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SmartHomeKbCategory, SmartHomeKbTag } from "@/lib/smart-home-kb/types";

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border bg-surface-muted/30 text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function KbFilters({
  query,
  onQueryChange,
  categories,
  activeCategoryId,
  onCategoryChange,
  tags,
  activeTagIds,
  onTagToggle,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  categories: SmartHomeKbCategory[];
  activeCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  tags: SmartHomeKbTag[];
  activeTagIds: string[];
  onTagToggle: (id: string) => void;
}) {
  const activeCount = (activeCategoryId ? 1 : 0) + activeTagIds.length;

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Szukaj — np. sterowanie oświetleniem, reset bramy..."
          className="pl-9"
        />
      </div>

      <MobileFiltersPanel
        activeCount={activeCount}
        onClear={() => {
          onCategoryChange(null);
          for (const tagId of activeTagIds) {
            onTagToggle(tagId);
          }
        }}
      >
        <div className="grid gap-3">
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <ChipButton active={activeCategoryId === null} onClick={() => onCategoryChange(null)}>
                Wszystkie kategorie
              </ChipButton>
              {categories.map((category) => (
                <ChipButton
                  key={category.id}
                  active={activeCategoryId === category.id}
                  onClick={() => onCategoryChange(category.id === activeCategoryId ? null : category.id)}
                >
                  {category.name}
                </ChipButton>
              ))}
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <ChipButton
                  key={tag.id}
                  active={activeTagIds.includes(tag.id)}
                  onClick={() => onTagToggle(tag.id)}
                >
                  #{tag.name}
                </ChipButton>
              ))}
            </div>
          ) : null}
        </div>
      </MobileFiltersPanel>
    </div>
  );
}
