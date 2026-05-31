"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartData = Array<{ name: string; value: number }>;

export const CHART_COLORS = [
  "#34d399",
  "#2dd4bf",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#60a5fa",
  "#f472b6",
  "#4ade80",
  "#fb923c",
  "#38bdf8",
  "#c084fc",
  "#94a3b8",
];

function colorForIndex(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function ClientOnlyChart({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-surface-muted text-sm text-muted">
        Ładowanie wykresu...
      </div>
    );
  }

  return children;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm shadow-soft">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-muted">{item.value}</p>
    </div>
  );
}

export function BarPanel({ title, data }: { title: string; data: ChartData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 min-h-64 sm:h-80 sm:min-h-80">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Brak danych
          </div>
        ) : (
          <ClientOnlyChart>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={colorForIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        )}
      </CardContent>
    </Card>
  );
}

export function PiePanel({ title, data }: { title: string; data: ChartData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 min-h-64 sm:h-80 sm:min-h-80">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Brak danych
          </div>
        ) : (
          <ClientOnlyChart>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={92}
                  paddingAngle={3}
                  stroke="#18181b"
                  strokeWidth={2}
                >
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={colorForIndex(index)} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "#a1a1aa" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        )}
      </CardContent>
    </Card>
  );
}
