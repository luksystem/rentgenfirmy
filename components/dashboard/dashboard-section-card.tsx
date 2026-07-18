"use client";

import { cn } from "@/lib/utils";

export function DashboardSectionCard({
  section,
  children,
}: {
  section: { title: string; description: string; status: "active" | "planned" };
  children?: React.ReactNode;
}) {
  const isPlanned = section.status === "planned";

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-surface p-4",
        isPlanned && "opacity-90",
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="page-section-title text-base font-semibold">{section.title}</h2>
          <p className="mt-1 text-sm text-muted">{section.description}</p>
        </div>
        {isPlanned ? (
          <span className="rounded-full border border-border/80 bg-surface-muted/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Wkrótce
          </span>
        ) : null}
      </div>
      {children ?? (
        <p className="text-sm text-muted">
          Moduł w przygotowaniu — zostanie tu rozbudowana funkcjonalność opisana w specyfikacji
          dashboardu.
        </p>
      )}
    </section>
  );
}
