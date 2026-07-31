"use client";

import { useMemo } from "react";
import { MetricCard } from "@/components/metric-card";
import { projectMetrics } from "@/lib/domain";
import { buildProjectsPageUrl } from "@/lib/projects-page-url";
import { useAppStore } from "@/store/app-store";

export function ProjectMetricsWidget() {
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const metrics = useMemo(() => projectMetrics(projects, fieldOptions), [projects, fieldOptions]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <MetricCard
        label="Aktywne"
        value={metrics.active}
        tone="green"
        size="hero"
        href={buildProjectsPageUrl({ categories: ["active"] })}
      />
      <MetricCard
        label="Oczekujące"
        value={metrics.waiting}
        tone="amber"
        size="hero"
        href={buildProjectsPageUrl({ categories: ["waiting"] })}
      />
      <MetricCard
        label="Krytyczne"
        value={metrics.critical}
        tone="red"
        size="hero"
        href={buildProjectsPageUrl({ categories: ["critical"] })}
      />
    </div>
  );
}
