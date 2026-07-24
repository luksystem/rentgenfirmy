"use client";

import { Area, AreaChart } from "recharts";
import type { DeltaTone } from "@/lib/report-kpi/types";

const TONE_COLOR: Record<DeltaTone, string> = {
  good: "#10b981",
  bad: "#f43f5e",
  neutral: "#71717a",
};

/**
 * Minimalny szkic trendu na kafelku — dwa punkty (poprzedni → bieżący), bo agregatory
 * domenowe liczą tylko current/previous, nie pełną historię N okresów. Wystarcza, żeby
 * pokazać kierunek zmiany bez dodatkowych zapytań o serię czasową.
 */
export function Sparkline({ previous, current, tone }: { previous: number; current: number; tone: DeltaTone }) {
  const data = [{ index: 0, value: previous }, { index: 1, value: current }];
  const color = TONE_COLOR[tone];

  return (
    <AreaChart width={52} height={20} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        fill={color}
        fillOpacity={0.15}
        strokeWidth={1.6}
        dot={false}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}
