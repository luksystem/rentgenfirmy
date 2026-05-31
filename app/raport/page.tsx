"use client";

import { useState } from "react";
import { BarPanel, PiePanel } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, ProjectStatusBadge } from "@/components/project-status-badge";
import { QuickWinsPanel } from "@/components/quick-wins-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateWeeklyReport } from "@/lib/domain";
import { formatTrendHelper } from "@/lib/report-insights";
import type { Project } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

function ReportProjectList({
  title,
  emptyMessage,
  projects,
  detail,
}: {
  title: string;
  emptyMessage: string;
  projects: Project[];
  detail: (project: Project) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}{" "}
          <span className="text-sm font-normal text-slate-500">({projects.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{project.name}</p>
                <div className="flex flex-wrap gap-2">
                  <ProjectStatusBadge
                    status={project.flowStatus}
                    priority={project.priority}
                    isActive={project.isActive}
                  />
                  <PriorityBadge priority={project.priority} />
                </div>
              </div>
              <p className="text-sm text-slate-500">{detail(project)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportPage() {
  const { projects, interruptions, fieldOptions } = useAppStore();
  const [generated, setGenerated] = useState(false);
  const report = generateWeeklyReport(projects, interruptions, fieldOptions);
  const { daily, weekly } = report.interruptionTrends;

  return (
    <>
      <PageHeader
        eyebrow="Podsumowanie"
        title="Raport tygodniowy"
        description="Podsumowanie stanu projektów, trendów przerwań i sugerowanych quick winów."
        action={
          <Button onClick={() => setGenerated(true)}>Generuj raport tygodniowy</Button>
        }
      />

      {!generated ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Kliknij przycisk, aby wygenerować raport na podstawie aktualnych danych.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Aktywne" value={report.activeProjects} tone="green" />
            <MetricCard label="Oczekujące" value={report.waitingProjects} tone="amber" />
            <MetricCard label="Do zamknięcia" value={report.closingProjects} tone="slate" />
            <MetricCard label="Zamknięte" value={report.closedProjects} />
            <MetricCard
              label="Przerwania dziś"
              value={daily.current}
              helper={formatTrendHelper(daily, "wczoraj")}
              tone={daily.direction === "up" ? "red" : daily.direction === "down" ? "green" : "default"}
            />
            <MetricCard
              label="Przerwania 7 dni"
              value={weekly.current}
              helper={formatTrendHelper(weekly, "poprzednie 7 dni")}
              tone={weekly.direction === "up" ? "amber" : weekly.direction === "down" ? "green" : "default"}
            />
          </section>

          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader>
              <CardTitle>Quick wins — co wdrożyć teraz</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickWinsPanel wins={report.quickWins} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="grid gap-2 py-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Trend przerwań</p>
              <p>
                <strong>Dziś vs wczoraj:</strong> {daily.current} / {daily.previous} —{" "}
                {formatTrendHelper(daily, "wczoraj")}
              </p>
              <p>
                <strong>Ostatnie 7 dni vs poprzednie 7:</strong> {weekly.current} /{" "}
                {weekly.previous} — {formatTrendHelper(weekly, "poprzednie 7 dni")}
              </p>
              <p className="pt-1">
                <strong>Przerwania</strong> — pełna historia w bazie.{" "}
                <strong>Powody blokady</strong> — tylko aktualny stan projektu.
              </p>
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-2">
            <PiePanel title="Aktualne powody blokady (projekty)" data={report.blockersByReason} />
            <BarPanel title="Przerwania wg typu (historia)" data={report.interruptionsByTypeChart} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ReportProjectList
              title="Projekty krytyczne"
              emptyMessage="Brak projektów krytycznych."
              projects={report.criticalProjects}
              detail={(project) =>
                `${project.nextStepOwner} · ${project.blockerReason ?? "Brak blokady"}`
              }
            />
            <ReportProjectList
              title="Projekty oczekujące"
              emptyMessage="Brak projektów ze statusem oczekującym."
              projects={report.waitingProjectsList}
              detail={(project) =>
                `${project.nextStepOwner} · ${project.blockerReason ?? "Brak powodu blokady"}`
              }
            />
            <ReportProjectList
              title="Projekty do zamknięcia"
              emptyMessage="Brak projektów w trakcie na etapie do zamknięcia."
              projects={report.closingProjectsList}
              detail={(project) =>
                `${project.stage} · ${project.closeBlocker ?? project.blockerReason ?? "Brak blokady"}`
              }
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Najczęstszy powód blokady</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <span className="text-2xl font-semibold text-slate-950">
                  {report.mostCommonBlocker}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Najczęstsze źródło przerwań</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <span className="text-2xl font-semibold text-slate-950">
                  {report.mostCommonInterruptionSource}
                </span>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
