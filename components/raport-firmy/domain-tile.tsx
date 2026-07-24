import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/raport-firmy/sparkline";
import { TrendChip } from "@/components/raport-firmy/trend-chip";
import type { DomainReport } from "@/lib/report-kpi/types";

const SEVERITY_BADGE: Record<DomainReport["severity"], string> = {
  good: "bg-emerald-500/15 text-emerald-500",
  warning: "bg-amber-500/15 text-amber-500",
  critical: "bg-rose-500/15 text-rose-500",
};

const SEVERITY_LABEL: Record<DomainReport["severity"], string> = {
  good: "OK",
  warning: "Uwaga",
  critical: "Pilne",
};

export function DomainTile({
  report,
  subtitle,
  onOpen,
  locked = false,
}: {
  report: DomainReport;
  subtitle: string;
  onOpen: () => void;
  locked?: boolean;
}) {
  const primaryKpiWithTrend = report.kpis.find((kpi) => kpi.trend !== null);

  return (
    <Card
      className={cn(
        "cursor-pointer transition hover:border-accent/40 hover:shadow-md",
        locked && "border-dashed",
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <CardContent className="grid gap-3 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">
                {locked ? "🔒 " : null}
                {report.label}
              </p>
              <p className="text-xs text-muted">{subtitle}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                SEVERITY_BADGE[report.severity],
              )}
            >
              {SEVERITY_LABEL[report.severity]}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <TrendChip trend={report.trend} />
            {primaryKpiWithTrend?.trend ? (
              <Sparkline
                previous={primaryKpiWithTrend.trend.previous}
                current={primaryKpiWithTrend.trend.current}
                tone={primaryKpiWithTrend.deltaTone}
              />
            ) : null}
          </div>

          <div className="grid gap-1.5">
            {report.kpis.slice(0, 3).map((kpi) => (
              <div key={kpi.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{kpi.label}</span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {kpi.displayValue}
                  {kpi.trend ? (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        kpi.deltaTone === "bad" && "text-rose-500",
                        kpi.deltaTone === "good" && "text-emerald-500",
                        kpi.deltaTone === "neutral" && "text-muted",
                      )}
                    >
                      {kpi.trend.direction === "up" ? "▲" : kpi.trend.direction === "down" ? "▼" : "■"}{" "}
                      {kpi.trend.delta === 0 ? "" : Math.abs(kpi.trend.delta)}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-xs font-semibold text-accent">
            <span>Zobacz szczegóły</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </button>
    </Card>
  );
}
