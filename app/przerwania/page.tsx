"use client";

import { useEffect, useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { BarPanel } from "@/components/charts";
import { InterruptionForm } from "@/components/interruption-form";
import { MetricCard } from "@/components/metric-card";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  interruptionsByType,
  interruptionsPerDay,
  interruptionsPerWeek,
  topInterruptionProjects,
} from "@/lib/domain";
import type { Interruption } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

function scrollToInterruptionForm() {
  const section = document.getElementById("dodaj-przerwanie");
  if (!section) {
    return;
  }

  section.scrollIntoView({ behavior: "smooth", block: "start" });

  const firstField = section.querySelector<HTMLElement>(
    "input, select, textarea, button",
  );
  firstField?.focus({ preventScroll: true });
}

function formatFlag(value: boolean) {
  return value ? "Tak" : "Nie";
}

export default function InterruptionsPage() {
  const { interruptions, projects, addInterruption, updateInterruption, deleteInterruption, isSaving } =
    useAppStore();
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const projectOptions = projects.map((project) => ({ id: project.id, name: project.name }));
  const [editingInterruption, setEditingInterruption] = useState<Interruption | null>(null);

  useEffect(() => {
    if (window.location.hash !== "#dodaj-przerwanie") {
      return;
    }

    scrollToInterruptionForm();

    function handleHashChange() {
      if (window.location.hash === "#dodaj-przerwanie") {
        scrollToInterruptionForm();
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Usunąć to przerwanie?")) {
      return;
    }

    try {
      await deleteInterruption(id);
      if (editingInterruption?.id === id) {
        setEditingInterruption(null);
      }
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  async function handleEditSubmit(values: Omit<Interruption, "id">) {
    if (!editingInterruption) {
      return;
    }

    try {
      await updateInterruption(editingInterruption.id, values);
      setEditingInterruption(null);
    } catch {
      // Błąd wyświetla DataProvider
    }
  }

  function renderActions(item: Interruption) {
    return (
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setEditingInterruption(item)}
          title="Edytuj przerwanie"
        >
          <Edit className="h-3.5 w-3.5" />
          Edytuj
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => void handleDelete(item.id)}
          title="Usuń przerwanie"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

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

      <section
        id="dodaj-przerwanie"
        className="mt-4 scroll-mt-24 sm:mt-6"
      >
        <InterruptionForm
          projects={projectOptions}
          isSaving={isSaving}
          onSubmit={addInterruption}
          layout="inline"
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
            footer={renderActions(item)}
          >
            <MobileField label="Osoba" value={item.person} />
            <MobileField label="Projekt" value={projectNames.get(item.projectId) ?? "-"} />
            <MobileField label="Konieczne" value={formatFlag(item.wasNecessary)} />
            <MobileField label="Powtarza się" value={formatFlag(item.isRecurring)} />
            <MobileField label="Opis" value={item.description} stack />
          </MobileListCard>
        ))}
      </div>

      <Card className="mt-4 hidden overflow-hidden sm:mt-6 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Osoba</th>
                <th className="px-4 py-3">Typ przerwania</th>
                <th className="px-4 py-3">Projekt</th>
                <th className="px-4 py-3">Opis</th>
                <th className="px-4 py-3">Konieczne?</th>
                <th className="px-4 py-3">Powtarza się?</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {interruptions.map((item) => (
                <tr key={item.id} className="transition hover:bg-surface-muted/60">
                  <td className="px-4 py-3">{formatDate(item.date)}</td>
                  <td className="px-4 py-3">{item.person}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3">{projectNames.get(item.projectId) ?? "-"}</td>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3">{formatFlag(item.wasNecessary)}</td>
                  <td className="px-4 py-3">{formatFlag(item.isRecurring)}</td>
                  <td className="px-4 py-3">{renderActions(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={editingInterruption !== null}
        onOpenChange={(open) => !open && setEditingInterruption(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edytuj przerwanie</DialogTitle>
            <DialogDescription>
              Zmień datę, typ, projekt lub opis. Zapis nadpisze istniejący wpis.
            </DialogDescription>
          </DialogHeader>

          {editingInterruption ? (
            <InterruptionForm
              key={editingInterruption.id}
              projects={projectOptions}
              interruption={editingInterruption}
              isSaving={isSaving}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingInterruption(null)}
              className="border-0 p-0 shadow-none"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
