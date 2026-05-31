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
  "#059669",
  "#0d9488",
  "#d97706",
  "#e11d48",
  "#7c3aed",
  "#2563eb",
  "#ca8a04",
  "#65a30d",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#78716c",
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
    <div className="rounded-2xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-soft">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f0e8" }} />
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
                  stroke="#fff"
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
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        )}
      </CardContent>
    </Card>
  );
}
