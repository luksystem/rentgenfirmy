import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import type { MonthlyForecastRow } from "@/lib/budget-forecast/engine";

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(Number(year), Number(month) - 1, 1),
  );
}

export function BudgetForecastTable({ rows }: { rows: MonthlyForecastRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted">Brak danych do prognozy.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-surface-muted/20 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Miesiąc</th>
              <th className="px-4 py-3 text-right font-medium">Przychód rzeczywisty</th>
              <th className="px-4 py-3 text-right font-medium">Przychód prognozowany (ważony)</th>
              <th className="px-4 py-3 text-right font-medium">Koszty stałe</th>
              <th className="px-4 py-3 text-right font-medium">Koszt zmienny</th>
              <th className="px-4 py-3 text-right font-medium">Wynik miesiąca</th>
              <th className="px-4 py-3 text-right font-medium">Saldo narastające</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-border/40">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground capitalize">
                  {formatMonthLabel(row.month)}
                  {row.isCurrent ? <span className="ml-2 text-xs font-normal text-accent">bieżący</span> : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {formatMoney(row.actualRevenue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {formatMoney(row.scheduledRevenue + row.pipelineRevenueWeighted + row.scenarioRevenueDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {formatMoney(row.fixedCosts)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {formatMoney(row.variableCosts)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums font-medium",
                    row.netResult < 0 ? "text-rose-400" : "text-emerald-400",
                  )}
                >
                  {formatMoney(row.netResult)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums font-semibold",
                    row.cumulativeBalance < 0
                      ? "bg-rose-500/10 text-rose-300"
                      : "text-foreground",
                  )}
                >
                  {formatMoney(row.cumulativeBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
