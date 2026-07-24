"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientOnlyChart } from "@/components/charts";
import { formatMoney } from "@/lib/utils";
import type { MonthlyForecastRow } from "@/lib/budget-forecast/engine";

function formatMonthTick(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Intl.DateTimeFormat("pl-PL", { month: "short", year: "2-digit" }).format(
    new Date(Number(year), Number(month) - 1, 1),
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthlyForecastRow }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm shadow-soft">
      <p className="mb-1 font-medium capitalize text-foreground">{formatMonthTick(row.month)}</p>
      <p className={row.netResult < 0 ? "text-rose-300" : "text-emerald-300"}>
        Stan miesiąca: {formatMoney(row.netResult)}
      </p>
      <p className="text-muted">Saldo narastające: {formatMoney(row.cumulativeBalance)}</p>
    </div>
  );
}

export function BudgetForecastChart({ rows }: { rows: MonthlyForecastRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stan miesiąca i saldo narastające</CardTitle>
      </CardHeader>
      <CardContent className="h-72 w-full min-w-0 sm:h-80">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">Brak danych</div>
        ) : (
          <ClientOnlyChart>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
              <ComposedChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthTick}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickFormatter={(v) => formatMoney(v)} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
                <ReferenceLine y={0} stroke="#71717a" strokeDasharray="4 4" />
                <Bar dataKey="netResult" name="Stan miesiąca" radius={[6, 6, 6, 6]} maxBarSize={28}>
                  {rows.map((row) => (
                    <Cell key={row.month} fill={row.netResult < 0 ? "#f43f5e" : "#22c55e"} />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  name="Saldo narastające"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        )}
      </CardContent>
    </Card>
  );
}
