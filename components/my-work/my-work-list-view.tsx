"use client";

import { LIST_SECTIONS, groupItemsByListSection } from "@/lib/my-work/section-filters";
import type { WorkItemView } from "@/lib/my-work/types";
import { MyWorkTaskCard } from "@/components/my-work/my-work-task-card";

export function MyWorkListView({
  items,
  onOpenItem,
  showVerificationSection = false,
}: {
  items: WorkItemView[];
  onOpenItem: (id: string) => void;
  showVerificationSection?: boolean;
}) {
  const grouped = groupItemsByListSection(items, new Date(), { showVerificationSection });

  const nonEmptySections = LIST_SECTIONS.filter((section) => (grouped.get(section.id)?.length ?? 0) > 0);

  if (!nonEmptySections.length) {
    return (
      <p className="rounded-xl border border-border bg-surface-elevated px-4 py-8 text-center text-sm text-muted">
        Brak zadań w wybranych filtrach. Sprawdź inne filtry lub poczekaj na nowe przypisania od managera.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {nonEmptySections.map((section) => {
        const sectionItems = grouped.get(section.id) ?? [];
        return (
          <section key={section.id}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {section.label}
              <span className="ml-2 font-normal text-foreground">({sectionItems.length})</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sectionItems.map((item) => (
                <MyWorkTaskCard key={item.id} item={item} onOpen={() => onOpenItem(item.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
