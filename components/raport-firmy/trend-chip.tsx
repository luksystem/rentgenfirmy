import { cn } from "@/lib/utils";
import type { TileTrend } from "@/lib/report-kpi/types";

const TREND_CONFIG: Record<TileTrend, { icon: string; label: string; className: string }> = {
  improving: { icon: "▼", label: "poprawa", className: "text-emerald-500" },
  worsening: { icon: "▲", label: "pogarsza się", className: "text-rose-500" },
  stable: { icon: "■", label: "stabilnie", className: "text-muted" },
};

export function TrendChip({ trend, periodLabel }: { trend: TileTrend; periodLabel?: string }) {
  const config = TREND_CONFIG[trend];

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", config.className)}>
      <span aria-hidden>{config.icon}</span>
      {config.label}
      {periodLabel ? <span className="font-normal text-muted">{periodLabel}</span> : null}
    </span>
  );
}
