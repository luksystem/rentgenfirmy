"use client";

import { BarPanel, PiePanel } from "@/components/charts";
import { InterruptionForm } from "@/components/interruption-form";
import { MetricCard } from "@/components/metric-card";
import { PageHeader, ResetButton } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  interruptionsByType,
  projectMetrics,
  projectsByBlocker,
  projectsByStatus,
} from "@/lib/domain";
import { useAppStore } from "@/store/app-store";

export default function Home() {
  const { projects, interruptions, addInterruption, seedDemoData, isSaving, fieldOptions } =
    useAppStore();
  const metrics = projectMetrics(projects, fieldOptions);

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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Wszystkie projekty" value={metrics.all} />
        <MetricCard label="Projekty aktywne" value={metrics.active} tone="green" />
        <MetricCard label="Projekty oczekujące" value={metrics.waiting} tone="amber" />
        <MetricCard label="Do zamknięcia" value={metrics.closing} tone="slate" />
        <MetricCard label="Bez kontaktu > 14 dni" value={metrics.noContact} tone="red" />
        <MetricCard label="Projekty krytyczne" value={metrics.critical} tone="red" />
      </section>

      <section className="mt-4 sm:mt-6">
        <Card>
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
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-slate-500">
                      {project.nextStepOwner} · {project.blockerReason ?? "Brak blokady"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
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
          <CardContent className="text-sm leading-6 text-slate-600">
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
