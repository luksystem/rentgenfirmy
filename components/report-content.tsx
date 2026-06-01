"use client";

import { forwardRef } from "react";
import { BarPanel, PiePanel } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PriorityBadge, ProjectStatusBadge } from "@/components/project-status-badge";
import { ClickableProjectCard } from "@/components/project-edit-provider";
import { QuickWinsPanel } from "@/components/quick-wins-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTrendHelper } from "@/lib/report-insights";
import type { Project, WeeklyReport } from "@/lib/types";
import { cn } from "@/lib/utils";

function ReportProjectList({
  title,
  emptyMessage,
  projects,
  detail,
  light,
}: {
  title: string;
  emptyMessage: string;
  projects: Project[];
  detail: (project: Project) => string;
  light?: boolean;
}) {
  return (
    <Card className={cn(light && "border-zinc-200 bg-white shadow-none")}>
      <CardHeader>
        <CardTitle className={cn(light && "text-zinc-900")}>
          {title}{" "}
          <span className={cn("text-sm font-normal text-muted", light && "text-zinc-500")}>
            ({projects.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {projects.length === 0 ? (
          <p className={cn("text-sm text-muted", light && "text-zinc-600")}>{emptyMessage}</p>
        ) : (
          projects.map((project) => (
            <ClickableProjectCard key={project.id} project={project} light={light}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className={cn("font-medium", light && "text-zinc-900")}>{project.name}</p>
                <div className="flex flex-wrap gap-2">
                  <ProjectStatusBadge
                    status={project.flowStatus}
                    priority={project.priority}
                    isActive={project.isActive}
                  />
                  <PriorityBadge priority={project.priority} />
                </div>
              </div>
              <p className={cn("text-sm text-muted", light && "text-zinc-600")}>
                {detail(project)}
              </p>
            </ClickableProjectCard>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type ReportContentProps = {
  report: WeeklyReport;
  light?: boolean;
};

export const ReportContent = forwardRef<HTMLDivElement, ReportContentProps>(
  function ReportContent({ report, light = false }, ref) {
    const { daily, weekly, previousPeriodLabel } = report.interruptionTrends;
    const periodTrendLabel =
      report.period.mode === "weekly" ? "poprzednie 7 dni" : previousPeriodLabel.toLowerCase();

    return (
      <div
        ref={ref}
        className={cn(
          "grid gap-4",
          light && "bg-white p-6 text-zinc-900 [&_.text-foreground]:text-zinc-900 [&_.text-muted]:text-zinc-600",
        )}
      >
        <div className={cn("rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm", light && "border-zinc-200 bg-zinc-50 text-zinc-700")}>
          <p className={cn("font-medium text-foreground", light && "text-zinc-900")}>
            Okres raportu: {report.periodLabel}
          </p>
          <p className={cn("mt-1 text-muted", light && "text-zinc-600")}>
            Projekty — stan na moment generowania. Przerwania — tylko z wybranego okresu.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Aktywne" value={report.activeProjects} tone="green" />
          <MetricCard label="Oczekujące" value={report.waitingProjects} tone="amber" />
          <MetricCard label="Do zamknięcia" value={report.closingProjects} tone="slate" />
          <MetricCard label="Zamknięte" value={report.closedProjects} />
          <MetricCard
            label="Przerwania w okresie"
            value={report.interruptionsCount}
            tone="default"
          />
          <MetricCard
            label={report.period.mode === "weekly" ? "Trend 7 dni" : "Trend okresu"}
            value={weekly.current}
            helper={formatTrendHelper(weekly, periodTrendLabel)}
            tone={weekly.direction === "up" ? "amber" : weekly.direction === "down" ? "green" : "default"}
          />
        </section>

        <Card className={cn("panel-success border", light && "border-emerald-200 bg-emerald-50 shadow-none")}>
          <CardHeader>
            <CardTitle className={cn(light && "text-zinc-900")}>
              Quick wins — co wdrożyć teraz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickWinsPanel wins={report.quickWins} />
          </CardContent>
        </Card>

        <Card className={cn("border border-border bg-surface-muted", light && "border-zinc-200 bg-zinc-50 shadow-none")}>
          <CardContent className="grid gap-2 py-4 text-sm text-muted">
            <p className={cn("font-medium text-foreground", light && "text-zinc-900")}>
              Trend przerwań
            </p>
            <p className={cn(light && "text-zinc-700")}>
              <strong>Ostatni vs poprzedni dzień:</strong> {daily.current} / {daily.previous} —{" "}
              {formatTrendHelper(daily, "dzień wcześniej")}
            </p>
            <p className={cn(light && "text-zinc-700")}>
              <strong>Okres vs poprzedni:</strong> {weekly.current} / {weekly.previous} —{" "}
              {formatTrendHelper(weekly, periodTrendLabel)}
            </p>
          </CardContent>
        </Card>

        <section className="grid gap-4 xl:grid-cols-2">
          <PiePanel title="Aktualne powody blokady (projekty)" data={report.blockersByReason} />
          <BarPanel
            title={`Przerwania wg typu (${report.periodLabel})`}
            data={report.interruptionsByTypeChart}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <ReportProjectList
            title="Projekty krytyczne"
            emptyMessage="Brak projektów krytycznych."
            projects={report.criticalProjects}
            detail={(project) =>
              `${project.nextStepOwner} · ${project.blockerReason ?? "Brak blokady"}`
            }
            light={light}
          />
          <ReportProjectList
            title="Projekty oczekujące"
            emptyMessage="Brak projektów ze statusem oczekującym."
            projects={report.waitingProjectsList}
            detail={(project) =>
              `${project.nextStepOwner} · ${project.blockerReason ?? "Brak powodu blokady"}`
            }
            light={light}
          />
          <ReportProjectList
            title="Projekty do zamknięcia"
            emptyMessage="Brak projektów w trakcie na etapie do zamknięcia."
            projects={report.closingProjectsList}
            detail={(project) =>
              `${project.stage} · ${project.closeBlocker ?? project.blockerReason ?? "Brak blokady"}`
            }
            light={light}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className={cn(light && "border-zinc-200 bg-white shadow-none")}>
            <CardHeader>
              <CardTitle className={cn(light && "text-zinc-900")}>
                Najczęstszy powód blokady
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <span className={cn("text-2xl font-semibold text-foreground", light && "text-zinc-900")}>
                {report.mostCommonBlocker}
              </span>
            </CardContent>
          </Card>
          <Card className={cn(light && "border-zinc-200 bg-white shadow-none")}>
            <CardHeader>
              <CardTitle className={cn(light && "text-zinc-900")}>
                Najczęstsze źródło przerwań
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <span className={cn("text-2xl font-semibold text-foreground", light && "text-zinc-900")}>
                {report.mostCommonInterruptionSource}
              </span>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  },
);
