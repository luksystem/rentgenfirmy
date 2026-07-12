"use client";

import { LIST_SECTIONS, groupItemsByListSection } from "@/lib/my-work/section-filters";
import type { WorkItemView } from "@/lib/my-work/types";
import { MyWorkTaskListRow } from "@/components/my-work/my-work-task-list-row";

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
      <p className="rounded-lg border border-border bg-surface-elevated px-4 py-6 text-center text-sm text-muted">
        Brak zadań w wybranych filtrach. Sprawdź inne filtry lub poczekaj na nowe przypisania od managera.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {nonEmptySections.map((section) => {
        const sectionItems = grouped.get(section.id) ?? [];
        return (
          <section key={section.id}>
            <h2 className="mb-1.5 flex items-baseline gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {section.label}
              <span className="font-normal normal-case text-foreground">({sectionItems.length})</span>
            </h2>
            <div className="overflow-hidden rounded-lg border border-border/80 bg-surface-elevated/50">
              {sectionItems.map((item) => (
                <MyWorkTaskListRow key={item.id} item={item} onOpen={() => onOpenItem(item.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
