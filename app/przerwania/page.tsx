"use client";

import { BarPanel } from "@/components/charts";
import { InterruptionForm } from "@/components/interruption-form";
import { MetricCard } from "@/components/metric-card";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  interruptionsByType,
  interruptionsPerDay,
  interruptionsPerWeek,
  topInterruptionProjects,
} from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function InterruptionsPage() {
  const { interruptions, projects, addInterruption, isSaving } = useAppStore();
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <>
      <PageHeader
        eyebrow="Źródła chaosu"
        title="Przerwania"
        description="Rejestr telefonów, pytań, zmian, reklamacji i spotkań, które wybijają z rytmu operacyjnego."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard
          label="Liczba przerwań dziennie"
          value={interruptionsPerDay(interruptions).at(-1)?.value ?? 0}
          helper="ostatni dzień w danych"
        />
        <MetricCard
          label="Liczba przerwań tygodniowo"
          value={interruptionsPerWeek(interruptions).at(-1)?.value ?? 0}
          helper="ostatni tydzień"
        />
        <MetricCard label="Wszystkie przerwania" value={interruptions.length} />
      </section>

      <section className="mt-4 sm:mt-6">
        <InterruptionForm
          projects={projects.map((project) => ({ id: project.id, name: project.name }))}
          isSaving={isSaving}
          onSubmit={addInterruption}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-2">
        <BarPanel title="Przerwania wg typu" data={interruptionsByType(interruptions)} />
        <BarPanel
          title="Projekty generujące najwięcej przerwań"
          data={topInterruptionProjects(interruptions, projects)}
        />
      </section>

      <div className="mt-4 grid gap-3 sm:mt-6 md:hidden">
        {interruptions.map((item) => (
          <MobileListCard
            key={item.id}
            title={item.type}
            subtitle={formatDate(item.date)}
          >
            <MobileField label="Osoba" value={item.person} />
            <MobileField label="Projekt" value={projectNames.get(item.projectId) ?? "-"} />
            <MobileField label="Opis" value={item.description} stack />
          </MobileListCard>
        ))}
      </div>

      <Card className="mt-4 hidden overflow-hidden sm:mt-6 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Osoba</th>
                <th className="px-4 py-3">Typ przerwania</th>
                <th className="px-4 py-3">Projekt</th>
                <th className="px-4 py-3">Opis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interruptions.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{formatDate(item.date)}</td>
                  <td className="px-4 py-3">{item.person}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3">{projectNames.get(item.projectId) ?? "-"}</td>
                  <td className="px-4 py-3">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
