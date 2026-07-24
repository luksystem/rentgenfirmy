import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { QuickWinsPanel } from "@/components/quick-wins-panel";
import { DetailTable } from "@/components/raport-firmy/detail-table";
import { formatTrendHelper } from "@/lib/report-kpi/kpi-engine";
import type { DomainReport, Severity } from "@/lib/report-kpi/types";

const SEVERITY_TONE: Record<Severity, "green" | "amber" | "red"> = {
  good: "green",
  warning: "amber",
  critical: "red",
};

export function DomainDrilldown({
  report,
  onBack,
  children,
}: {
  report?: DomainReport | null;
  onBack: () => void;
  /** Miejsce na treść specyficzną dla domeny (np. istniejący ReportContent dla Projektów). */
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="w-fit">
        <ArrowLeft className="h-4 w-4" />
        Wróć do przeglądu
      </Button>

      {children ?? (report ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.kpis.map((kpi) => (
              <MetricCard
                key={kpi.key}
                label={kpi.label}
                value={kpi.displayValue}
                helper={kpi.trend ? formatTrendHelper(kpi.trend, "poprzedni okres") : undefined}
                tone={SEVERITY_TONE[kpi.severity]}
              />
            ))}
          </section>

          {report.quickWins.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted">Co wymaga działania</h2>
              <QuickWinsPanel wins={report.quickWins} />
            </section>
          ) : null}

          <DetailTable title="Szczegóły" rows={report.detailRows} />
        </>
      ) : null)}
    </div>
  );
}
