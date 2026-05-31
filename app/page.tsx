"use client";

import Link from "next/link";
import { BarPanel, PiePanel } from "@/components/charts";
import { InterruptionForm } from "@/components/interruption-form";
import { MetricCard } from "@/components/metric-card";
import { PageHeader, ResetButton } from "@/components/page-header";
import { QuickWinsPanel } from "@/components/quick-wins-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateWeeklyReport,
  interruptionsByType,
  projectMetrics,
  projectsByBlocker,
  projectsByStatus,
} from "@/lib/domain";
import { formatTrendHelper } from "@/lib/report-insights";
import { useAppStore } from "@/store/app-store";

export default function Home() {
  const { projects, interruptions, addInterruption, seedDemoData, isSaving, fieldOptions } =
    useAppStore();
  const metrics = projectMetrics(projects, fieldOptions);
  const report = generateWeeklyReport(projects, interruptions, fieldOptions);
  const { daily, weekly } = report.interruptionTrends;

  return (
    <>
      <PageHeader
        eyebrow="Centrum operacyjne"
        title="Dashboard przepływu projektów"
        description="Szybki obraz tego, ile tematów naprawdę żyje, co stoi w miejscu i gdzie organizacja generuje najwięcej przerwań."
        action={
          <ResetButton onReset={() => seedDemoData()} disabled={isSaving} />
        }
      />

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <MetricCard label="Aktywne" value={metrics.active} tone="green" size="hero" />
        <MetricCard label="Oczekujące" value={metrics.waiting} tone="amber" size="hero" />
        <MetricCard label="Krytyczne" value={metrics.critical} tone="red" size="hero" />
      </section>

      <section className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:mt-4 sm:gap-2 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-1">
        <MetricCard label="Wszystkie" value={metrics.all} size="compact" />
        <MetricCard label="Nieaktywne" value={metrics.inactive} tone="slate" size="compact" />
        <MetricCard label="Do zamknięcia" value={metrics.closing} tone="slate" size="compact" />
        <MetricCard label="Bez kontaktu" value={metrics.noContact} tone="red" size="compact" />
        <MetricCard
          label="Przerwania dziś"
          value={daily.current}
          helper={formatTrendHelper(daily, "wczoraj")}
          tone={daily.direction === "up" ? "red" : daily.direction === "down" ? "green" : "default"}
          size="compact"
        />
        <MetricCard
          label="Przerwania 7 dni"
          value={weekly.current}
          helper={formatTrendHelper(weekly, "poprzednie 7 dni")}
          tone={weekly.direction === "up" ? "amber" : weekly.direction === "down" ? "green" : "default"}
          size="compact"
        />
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-5">
        <Card className="panel-success border xl:col-span-3">
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

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Szybkie wpisanie przerwania</CardTitle>
          </CardHeader>
          <CardContent>
            <InterruptionForm
              projects={projects.map((project) => ({ id: project.id, name: project.name }))}
              isSaving={isSaving}
              onSubmit={addInterruption}
              className="border-0 p-0"
            />
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
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
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
                </div>
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
