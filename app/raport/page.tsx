"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReportContent } from "@/components/report-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { DashboardGrid } from "@/components/raport-firmy/dashboard-grid";
import { DomainDrilldown } from "@/components/raport-firmy/domain-drilldown";
import { isAdministratorRole } from "@/lib/auth/types";
import { generateReport } from "@/lib/domain";
import { buildProjectClosingFlagsMap } from "@/lib/process/stage-helpers";
import { exportElementToPdf } from "@/lib/export-report-pdf";
import {
  createWeeklyPeriod,
  periodFromPreset,
  reportFilename,
  validatePeriod,
  type ReportPreset,
} from "@/lib/report-period";
import type { DomainReport } from "@/lib/report-kpi/types";
import { useRaportFirmyData } from "@/hooks/use-raport-firmy-data";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

type ViewState = "grid" | "projects" | DomainReport["domain"];

const presetLabels: Record<ReportPreset, string> = {
  weekly: "Ostatnie 7 dni",
  last30: "Ostatnie 30 dni",
  thisMonth: "Ten miesiąc",
  custom: "Własny zakres",
};

function ProjectsReportView() {
  const projects = useAppStore((state) => state.projects);
  const interruptions = useAppStore((state) => state.interruptions);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const templates = useProcessStore((state) => state.templates);
  const projectProcesses = useProcessStore((state) => state.projectProcesses);
  const defaultPeriod = createWeeklyPeriod();
  const [preset, setPreset] = useState<ReportPreset>("weekly");
  const [customStart, setCustomStart] = useState(defaultPeriod.startDate);
  const [customEnd, setCustomEnd] = useState(defaultPeriod.endDate);
  const [generated, setGenerated] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const period = useMemo(
    () => periodFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const projectClosingFlags = useMemo(
    () => buildProjectClosingFlagsMap(projects, projectProcesses, templates, fieldOptions),
    [fieldOptions, projectProcesses, projects, templates],
  );

  const report = useMemo(
    () => generateReport(projects, interruptions, fieldOptions, period, projectClosingFlags),
    [projects, interruptions, fieldOptions, period, projectClosingFlags],
  );

  function handleGenerate() {
    if (preset === "custom") {
      const error = validatePeriod(customStart, customEnd);
      setPeriodError(error);
      if (error) {
        return;
      }
    }

    setPeriodError(null);
    setGenerated(true);
  }

  async function handleExportPdf() {
    if (!reportRef.current) {
      return;
    }

    setIsExporting(true);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await exportElementToPdf(reportRef.current, reportFilename(period));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      {generated ? (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={() => void handleExportPdf()} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Eksport..." : "Eksport PDF"}
          </Button>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardContent className="grid gap-4 py-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(presetLabels) as ReportPreset[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={preset === key ? "default" : "secondary"}
                onClick={() => {
                  setPreset(key);
                  setPeriodError(null);
                }}
              >
                {presetLabels[key]}
              </Button>
            ))}
          </div>

          {preset === "custom" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Od">
                <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </Field>
              <Field label="Do">
                <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </Field>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Zakres: <strong className="text-foreground">{report.periodLabel}</strong>
            </p>
          )}

          {periodError ? <p className="text-sm text-rose-400">{periodError}</p> : null}

          <div>
            <Button onClick={handleGenerate}>
              <FileBarChart className="h-4 w-4" />
              Generuj raport
            </Button>
          </div>
        </CardContent>
      </Card>

      {!generated ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            Wybierz okres i kliknij „Generuj raport”.
          </CardContent>
        </Card>
      ) : (
        <ReportContent ref={reportRef} report={report} light={isExporting} />
      )}
    </>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = Boolean(profile && isAdministratorRole(profile.role));
  const [view, setView] = useState<ViewState>("grid");
  const { data, isLoading, error } = useRaportFirmyData();

  const domainReport: DomainReport | null =
    data && view !== "grid" && view !== "projects" ? (data[view] ?? null) : null;

  const headerCopy: Record<ViewState, { title: string; description: string }> = {
    grid: {
      title: "Raport firmowy",
      description: "Pełny obraz firmy na dziś: zespół, sprzedaż, serwis, cele i budżet w jednym miejscu.",
    },
    projects: {
      title: "Projekty",
      description: "Stan projektów na dziś oraz przerwania z wybranego okresu. Raport liczony na żywo.",
    },
    team: { title: "Zespół i czas", description: "Zadania, plan pracy, urlopy, nadgodziny." },
    growth: { title: "Ocena i rozwój", description: "Ranking XP, oceny miesięczne, cele managerów." },
    sales: { title: "Sprzedaż i cashflow", description: "Oferty, rozliczenia, zapotrzebowania." },
    service: { title: "Serwis", description: "Zgłoszenia serwisowe i przeglądy." },
    budget: { title: "Budżet firmy", description: "Przychód, faktury, należności." },
  };

  return (
    <>
      <PageHeader eyebrow="Podsumowanie" title={headerCopy[view].title} description={headerCopy[view].description} />

      {view === "grid" ? (
        isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted">Wczytywanie raportu firmowego...</CardContent>
          </Card>
        ) : error || !data ? (
          <Card>
            <CardContent className="py-12 text-center text-rose-400">
              {error ?? "Nie udało się wczytać raportu firmowego."}
            </CardContent>
          </Card>
        ) : (
          <DashboardGrid
            payload={data}
            isAdmin={isAdmin}
            onOpenDomain={(domain) => setView(domain)}
            onOpenSettings={() => router.push("/raport/ustawienia-kpi")}
          />
        )
      ) : view === "projects" ? (
        <DomainDrilldown onBack={() => setView("grid")}>
          <ProjectsReportView />
        </DomainDrilldown>
      ) : domainReport ? (
        <DomainDrilldown report={domainReport} onBack={() => setView("grid")} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted">Brak danych dla tego widoku.</CardContent>
        </Card>
      )}
    </>
  );
}
