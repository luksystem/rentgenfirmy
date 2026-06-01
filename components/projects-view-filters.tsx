"use client";

import { cn } from "@/lib/utils";
import {
  PROJECT_CATEGORY_FILTERS,
  type ProjectCategoryFilterId,
} from "@/lib/projects-view-filters";

function CategoryCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
        checked
          ? "border-accent/40 bg-accent-soft text-foreground"
          : "border-border/80 bg-surface-muted/50 text-muted hover:border-border hover:text-foreground",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border bg-surface-muted text-accent focus:ring-accent/30"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

export function ProjectCategoryFiltersBar({
  categories,
  onCategoriesChange,
}: {
  categories: ProjectCategoryFilterId[];
  onCategoriesChange: (categories: ProjectCategoryFilterId[]) => void;
}) {
  function toggleCategory(id: ProjectCategoryFilterId, enabled: boolean) {
    if (enabled) {
      onCategoriesChange([...categories, id]);
      return;
    }

    onCategoriesChange(categories.filter((item) => item !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Widok (kategorie z ustawień)
      </p>
      <div className="flex flex-wrap gap-2">
        {PROJECT_CATEGORY_FILTERS.map((item) => (
          <CategoryCheckbox
            key={item.id}
            label={item.label}
            checked={categories.includes(item.id)}
            onChange={(checked) => toggleCategory(item.id, checked)}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        Zaznacz jedną lub więcej kategorii — lista pokazuje projekty pasujące do któregokolwiek
        wyboru. Bez zaznaczenia: wszystkie kategorie. Ulubiony widok zapisuje się automatycznie.
      </p>
    </div>
  );
}
