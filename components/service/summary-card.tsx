import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown } from "@/lib/service/types";

function Row({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "default" | "green" | "red";
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          emphasis && "text-base font-semibold text-foreground",
          tone === "green" && "text-emerald-400",
          tone === "red" && "text-rose-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SummaryCard({
  estimate,
  actual,
  className,
}: {
  estimate: ServiceCostBreakdown;
  actual: ServiceCostBreakdown;
  className?: string;
}) {
  const diffNet = actual.netTotal - estimate.netTotal;
  const diffGross = actual.grossTotal - estimate.grossTotal;

  return (
    <Card className={cn("sticky top-24", className)}>
      <CardHeader>
        <CardTitle className="text-base">Podsumowanie</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 rounded-xl border border-border/80 bg-surface-muted/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Przewidywane koszty</p>
          <Row label="Netto" value={formatMoney(estimate.netTotal)} />
          <Row label="Brutto" value={formatMoney(estimate.grossTotal)} emphasis />
        </div>
        <div className="grid gap-2 rounded-xl border border-border/80 bg-surface-muted/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rzeczywiste</p>
          <Row label="Netto" value={formatMoney(actual.netTotal)} />
          <Row label="Brutto" value={formatMoney(actual.grossTotal)} emphasis />
        </div>
        <div className="grid gap-2 border-t border-border/80 pt-3">
          <Row
            label="Różnica netto"
            value={`${diffNet >= 0 ? "+" : ""}${formatMoney(diffNet)}`}
            tone={diffNet > 0 ? "red" : diffNet < 0 ? "green" : "default"}
          />
          <Row
            label="Różnica brutto"
            value={`${diffGross >= 0 ? "+" : ""}${formatMoney(diffGross)}`}
            tone={diffGross > 0 ? "red" : diffGross < 0 ? "green" : "default"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
