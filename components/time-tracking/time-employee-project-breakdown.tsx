"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import {
  buildProjectBreakdownForEntries,
  type TeamPeriodProjectRow,
} from "@/lib/time-tracking/team-period-detail";
import type { TimeEntryView } from "@/lib/time-tracking/types";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

function ProjectEntriesList({ project }: { project: TeamPeriodProjectRow }) {
  return (
    <div className="grid gap-2 px-3 pb-3">
      {project.entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col gap-1 rounded-lg border border-border/50 bg-surface px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.categoryColor }}
                aria-hidden
              />
              <span className="font-medium text-foreground">{entry.categoryName}</span>
              <span className="text-muted">{entry.entryTypeName}</span>
              <span className="text-xs text-muted">{entry.date}</span>
            </div>
            {entry.description ? <p className="mt-1 text-muted">{entry.description}</p> : null}
          </div>
          <span className="shrink-0 font-medium text-foreground">
            {formatDurationMinutes(entry.durationMinutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeEmployeeProjectBreakdown({
  entries,
  dateFrom,
  dateTo,
}: {
  entries: TimeEntryView[];
  dateFrom: string;
  dateTo: string;
}) {
  const meta = useTimeTrackingStore((state) => state.meta);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const projects = useMemo(() => {
    if (!meta) {
      return [];
    }
    return buildProjectBreakdownForEntries(
      entries,
      dateFrom,
      dateTo,
      meta.entryTypes.map((item) => ({
        id: item.id,
        countsAsWork: item.countsAsWork,
        countsAsAbsence: item.countsAsAbsence,
      })),
    );
  }, [entries, dateFrom, dateTo, meta]);

  if (projects.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Rozbicie na projekty</p>
          <p className="text-xs text-muted">Godziny w okresie wg projektu — rozwiń, aby zobaczyć wpisy.</p>
        </div>

        <div className="grid gap-2">
          {projects.map((project) => {
            const key = `${project.projectId ?? "none"}:${project.projectLabel}`;
            const expanded = expandedProjects[key] ?? false;

            return (
              <div key={key} className="overflow-hidden rounded-lg border border-border/60">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-muted/50"
                  onClick={() =>
                    setExpandedProjects((state) => ({
                      ...state,
                      [key]: !expanded,
                    }))
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    )}
                    <span className="truncate font-medium text-foreground">{project.projectLabel}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {formatDurationMinutes(project.totalMinutes)} · {project.entries.length} wpisów
                  </span>
                </button>
                {expanded ? <ProjectEntriesList project={project} /> : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
