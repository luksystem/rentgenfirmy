"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HomeOperationsCharts } from "@/components/home/home-operations-charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ClickableProjectCard } from "@/components/project-edit-provider";
import { QuickWinsPanel } from "@/components/quick-wins-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoadingInline } from "@/components/brand-loading";

const BarPanel = dynamic(
  () => import("@/components/charts").then((module) => module.BarPanel),
  { ssr: false, loading: () => <BrandLoadingInline label="Ładowanie wykresu…" /> },
);
const PiePanel = dynamic(
  () => import("@/components/charts").then((module) => module.PiePanel),
  { ssr: false, loading: () => <BrandLoadingInline label="Ładowanie wykresu…" /> },
);
import {
  generateWeeklyReport,
  interruptionsByType,
  projectMetrics,
  projectsByBlocker,
  projectsByStatus,
} from "@/lib/domain";
import { buildProjectsPageUrl } from "@/lib/projects-page-url";
import { buildProjectClosingFlagsMap } from "@/lib/process/stage-helpers";
import { formatTrendHelper } from "@/lib/report-insights";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function Home() {
  const projects = useAppStore((state) => state.projects);
  const interruptions = useAppStore((state) => state.interruptions);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const templates = useProcessStore((state) => state.templates);
  const projectProcesses = useProcessStore((state) => state.projectProcesses);
  const projectClosingFlags = useMemo(
    () => buildProjectClosingFlagsMap(projects, projectProcesses, templates, fieldOptions),
    [fieldOptions, projectProcesses, projects, templates],
  );
  const metrics = projectMetrics(projects, fieldOptions, projectClosingFlags);
  const report = generateWeeklyReport(
    projects,
    interruptions,
    fieldOptions,
    projectClosingFlags,
  );
  const { daily, weekly } = report.interruptionTrends;

  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const agreementPendingCounts = useAgreementHubStore((state) => state.pendingCounts);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);
  const ensureAgreementSnapshot = useAgreementHubStore((state) => state.ensureSnapshot);
  const [pendingAgreementsTotal, setPendingAgreementsTotal] = useState(0);

  useEffect(() => {
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: false });
    void ensureAgreementSnapshot().then((snapshot) => {
      setPendingAgreementsTotal(snapshot.countsByStatus.pending_client);
    });
  }, [ensureAgreementSnapshot, refreshAgreementPendingCounts, refreshKanbanOverdueTaskCount]);

  const unacceptedAgreements =
    agreementPendingCounts.pendingAgreements > 0
      ? agreementPendingCounts.pendingAgreements
      : pendingAgreementsTotal;

  return (
    <>
      <PageHeader
        eyebrow="Centrum operacyjne"
        title="Dashboard przepływu projektów"
        description="Szybki obraz tego, ile tematów naprawdę żyje, co stoi w miejscu i gdzie organizacja generuje najwięcej przerwań."
      />

      <section className="grid grid-cols-2 gap-2 sm:gap-4">
        <MetricCard
          label="Wdrożenia po terminie"
          value={kanbanOverdueTaskCount}
          tone="red"
          size="hero"
          href="/tablice-wdrozen/zbiorcza"
        />
        <MetricCard
          label="Ustalenia do akceptacji"
          value={unacceptedAgreements}
          tone="amber"
          size="hero"
          href="/tablice-wdrozen/ustalenia"
        />
      </section>

      <section className="mt-2 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4">
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
      </section>

      <section className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:mt-4 sm:gap-2 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-1">
        <MetricCard
          label="Wszystkie"
          value={metrics.all}
          size="compact"
          href="/projekty"
        />
        <MetricCard
          label="Oczek. nasza"
          value={metrics.waitingInternal}
          tone="amber"
          size="compact"
          href={buildProjectsPageUrl({ categories: ["waiting"], blockerFaults: ["internal"] })}
        />
        <MetricCard
          label="Oczek. zewn."
          value={metrics.waitingExternal}
          tone="slate"
          size="compact"
          href={buildProjectsPageUrl({ categories: ["waiting"], blockerFaults: ["external"] })}
        />
        <MetricCard
          label="Nieaktywne"
          value={metrics.inactive}
          tone="slate"
          size="compact"
          href={buildProjectsPageUrl({ categories: ["inactive"] })}
        />
        <MetricCard
          label="Do zamknięcia"
          value={metrics.closing}
          tone="slate"
          size="compact"
          href={buildProjectsPageUrl({ categories: ["forClosing"] })}
        />
        <MetricCard
          label="Bez kontaktu"
          value={metrics.noContact}
          tone="red"
          size="compact"
          href={buildProjectsPageUrl({ categories: ["noContact"] })}
        />
        <MetricCard
          label="Przerwania dziś"
          value={daily.current}
          helper={formatTrendHelper(daily, "wczoraj")}
          tone={daily.direction === "up" ? "red" : daily.direction === "down" ? "green" : "default"}
          size="compact"
          href="/przerwania"
        />
        <MetricCard
          label="Przerwania 7 dni"
          value={weekly.current}
          helper={formatTrendHelper(weekly, "poprzednie 7 dni")}
          tone={weekly.direction === "up" ? "amber" : weekly.direction === "down" ? "green" : "default"}
          size="compact"
          href="/przerwania"
        />
      </section>

      <HomeOperationsCharts />

      <section className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-5">
        <Card className="panel-success border xl:col-span-5">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Quick wins</CardTitle>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/raport">Pełny raport</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <QuickWinsPanel wins={report.quickWins} limit={3} compact />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-3">
        <BarPanel title="Projekty wg statusów" data={projectsByStatus(projects)} />
        <PiePanel title="Projekty wg powodów blokady" data={projectsByBlocker(projects)} />
        <BarPanel title="Przerwania wg typu" data={interruptionsByType(interruptions)} />
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Co wymaga uwagi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {projects
              .filter((project) => project.priority === "Krytyczny")
              .slice(0, 5)
              .map((project) => (
                <ClickableProjectCard
                  key={project.id}
                  project={project}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-sm text-muted">
                      {project.nextStepOwner} · {project.blockerReason ?? "Brak blokady"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                    Krytyczny
                  </span>
                </ClickableProjectCard>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Najkrótsza odpowiedź operacyjna</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted">
            Aplikacja nie próbuje być CRM-em. Jej główny rytm to: status,
            blokada, właściciel następnego kroku i data kontaktu. Dzięki temu
            łatwo oddzielić realnie aktywne projekty od tematów, które tylko
            generują komunikację.
          </CardContent>
        </Card>
      </section>
    </>
  );
}
