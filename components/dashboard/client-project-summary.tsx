"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  formatProjectDuration,
  formatSystemHandoverDate,
  formatWarrantyDurationMonths,
  formatWarrantyEndDate,
  getWarrantyStatus,
} from "@/lib/project/warranty";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClientProjectSummary({
  project,
  defaultExpanded = false,
  compact = false,
}: {
  project: Project;
  defaultExpanded?: boolean;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || !compact);
  const warrantyStatus = getWarrantyStatus(project);

  const rows = [
    { label: "Projekt", value: project.name },
    { label: "Typ", value: project.type },
    { label: "Czas trwania", value: formatProjectDuration(project) },
    { label: "Przekazanie systemu", value: formatSystemHandoverDate(project) },
    { label: "Czas gwarancji", value: formatWarrantyDurationMonths(project.warrantyDurationMonths) },
    { label: "Status gwarancji", value: warrantyStatus.label },
    { label: "Koniec gwarancji", value: formatWarrantyEndDate(project) },
    { label: "Etap", value: project.stage },
    { label: "Status", value: project.flowStatus },
    { label: "Priorytet", value: project.priority },
    { label: "Kolejny krok", value: project.nextStepOwner },
  ];

  if (compact) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted">Projekt</p>
            <p className="truncate font-medium text-foreground">{project.name}</p>
            <p className="text-xs text-muted">
              {formatProjectDuration(project)} · gwarancja: {warrantyStatus.label}
            </p>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted transition", expanded && "rotate-180")}
          />
        </button>
        {expanded ? (
          <div className="grid grid-cols-1 gap-2 border-t border-border/60 px-4 py-3">
            {rows.slice(2).map((row) => (
              <div key={row.label}>
                <p className="text-[10px] uppercase tracking-wide text-muted">{row.label}</p>
                <p className="text-sm text-foreground">{row.value}</p>
              </div>
            ))}
            {project.notes ? (
              <p className="sm:col-span-2 rounded-xl border border-border/60 bg-surface-muted/20 px-3 py-2 text-sm text-muted">
                {project.notes}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-border/60 bg-surface-muted/15 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">{row.label}</p>
          <p className="text-sm font-medium text-foreground">{row.value}</p>
        </div>
      ))}
      {project.notes ? (
        <p className="sm:col-span-2 rounded-xl border border-border/60 bg-surface-muted/20 px-3 py-2 text-sm text-muted">
          {project.notes}
        </p>
      ) : null}
    </div>
  );
}
