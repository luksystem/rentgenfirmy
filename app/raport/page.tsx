"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReportContent } from "@/components/report-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { generateReport } from "@/lib/domain";
import { exportElementToPdf } from "@/lib/export-report-pdf";
import {
  createWeeklyPeriod,
  periodFromPreset,
  reportFilename,
  validatePeriod,
  type ReportPreset,
} from "@/lib/report-period";
import { useAppStore } from "@/store/app-store";

const presetLabels: Record<ReportPreset, string> = {
  weekly: "Ostatnie 7 dni",
  last30: "Ostatnie 30 dni",
  thisMonth: "Ten miesiąc",
  custom: "Własny zakres",
};

export default function ReportPage() {
  const { projects, interruptions, fieldOptions } = useAppStore();
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

  const report = useMemo(
    () => generateReport(projects, interruptions, fieldOptions, period),
    [projects, interruptions, fieldOptions, period],
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
      <PageHeader
        eyebrow="Podsumowanie"
        title="Raport operacyjny"
        description="Stan projektów na dziś oraz przerwania z wybranego okresu. Raport liczony na żywo — nie jest zapisywany w bazie."
        action={
          generated ? (
            <Button variant="secondary" onClick={() => void handleExportPdf()} disabled={isExporting}>
              <Download className="h-4 w-4" />
              {isExporting ? "Eksport..." : "Eksport PDF"}
            </Button>
          ) : null
        }
      />

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
                <Input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </Field>
              <Field label="Do">
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                />
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
