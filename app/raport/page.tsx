"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/project-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateWeeklyReport } from "@/lib/domain";
import { useAppStore } from "@/store/app-store";

export default function ReportPage() {
  const { projects, interruptions, fieldOptions } = useAppStore();
  const [generated, setGenerated] = useState(false);
  const report = generateWeeklyReport(projects, interruptions, fieldOptions);

  return (
    <>
      <PageHeader
        eyebrow="Podsumowanie"
        title="Raport tygodniowy"
        description="Jedno kliknięcie generuje syntetyczną odpowiedź: ile tematów jest aktywnych, co blokuje przepływ i które projekty wymagają uwagi."
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
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Projekty</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p>Aktywne: {report.activeProjects}</p>
              <p>Oczekujące: {report.waitingProjects}</p>
              <p>Zamknięte: {report.closedProjects}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Blokady</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              Najczęstszy powód blokady:{" "}
              <span className="font-semibold">{report.mostCommonBlocker}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Przerwania</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p>Liczba przerwań: {report.interruptionsCount}</p>
              <p>
                Najczęstsze źródło:{" "}
                <span className="font-semibold">
                  {report.mostCommonInterruptionSource}
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Projekty krytyczne</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {report.criticalProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-slate-500">{project.nextStepOwner}</p>
                  </div>
                  <PriorityBadge priority={project.priority} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
