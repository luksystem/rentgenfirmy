"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PROJECT_HEALTH_BAND_LABELS,
  PROJECT_HEALTH_SENTIMENT_LABELS,
  type ProjectHealthBand,
  type ProjectHealthOverviewItem,
} from "@/lib/projects/project-health";
import { fetchProjectsHealthOverview } from "@/lib/supabase/project-health-repository";
import { formatPartyName } from "@/lib/party/display-name";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const BAND_COLORS: Record<ProjectHealthBand, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#fb7185",
};

const BAND_BADGE: Record<ProjectHealthBand, string> = {
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  yellow: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  red: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

export function ClientsHealthView({
  clients,
  projects,
}: {
  clients: Client[];
  projects: Project[];
}) {
  const [items, setItems] = useState<ProjectHealthOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientIds = useMemo(() => new Set(clients.map((c) => c.id)), [clients]);
  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, formatPartyName(c)] as const)),
    [clients],
  );

  const scopedProjects = useMemo(
    () =>
      projects
        .filter((p) => p.clientId && clientIds.has(p.clientId))
        .map((p) => ({
          id: p.id,
          name: p.name,
          clientId: p.clientId as string,
          clientName: clientNameById.get(p.clientId as string) ?? "Klient",
        })),
    [projects, clientIds, clientNameById],
  );

  const scopedProjectKey = useMemo(
    () => scopedProjects.map((p) => p.id).sort().join("|"),
    [scopedProjects],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchProjectsHealthOverview(scopedProjects);
        if (!cancelled) {
          setItems(next.sort((a, b) => a.score - b.score));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nie udało się wczytać zdrowia projektów.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopedProjectKey, scopedProjects]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchProjectsHealthOverview(scopedProjects);
      setItems(next.sort((a, b) => a.score - b.score));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać zdrowia projektów.");
    } finally {
      setLoading(false);
    }
  }

  const bandChart = useMemo(() => {
    const counts: Record<ProjectHealthBand, number> = { green: 0, yellow: 0, red: 0 };
    for (const item of items) counts[item.band] += 1;
    return (Object.keys(counts) as ProjectHealthBand[]).map((band) => ({
      band,
      name: PROJECT_HEALTH_BAND_LABELS[band],
      value: counts[band],
      fill: BAND_COLORS[band],
    }));
  }, [items]);

  const scoreChart = useMemo(
    () =>
      [...items]
        .sort((a, b) => b.score - a.score)
        .slice(0, 18)
        .map((item) => ({
          id: item.projectId,
          label: item.projectName.length > 22 ? `${item.projectName.slice(0, 20)}…` : item.projectName,
          fullName: `${item.clientName} · ${item.projectName}`,
          score: item.score,
          fill: BAND_COLORS[item.band],
        })),
    [items],
  );

  const totals = useMemo(() => {
    const n = items.length || 1;
    const sum = items.reduce(
      (acc, item) => {
        acc.score += item.score;
        acc.pending += item.signals.changesPending;
        acc.accepted += item.signals.changesAccepted;
        acc.notes += item.signals.meetingNotesPublished;
        acc.kanbanOpen += item.signals.kanbanTasksOpen;
        acc.clientComments += item.signals.kanbanClientComments;
        acc.atRisk += item.signals.goalsAtRisk;
        return acc;
      },
      { score: 0, pending: 0, accepted: 0, notes: 0, kanbanOpen: 0, clientComments: 0, atRisk: 0 },
    );
    return {
      avgScore: Math.round(sum.score / n),
      pending: sum.pending,
      accepted: sum.accepted,
      notes: sum.notes,
      kanbanOpen: sum.kanbanOpen,
      clientComments: sum.clientComments,
      atRisk: sum.atRisk,
      projects: items.length,
    };
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border/80 bg-surface text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Liczenie zdrowia projektów…
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-section-title flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4" />
            Zdrowie projektów
          </h2>
          <p className="mt-1 text-sm text-muted">
            Zbiorczo dla widocznych klientów: cele, notatki u klienta, akceptacje zmian i komunikacja
            na wdrożeniu.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void reload()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Odśwież
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Śr. wynik" value={`${totals.avgScore}`} hint={`/100 · ${totals.projects} proj.`} />
        <StatCard label="Zmiany czekają" value={`${totals.pending}`} hint={`${totals.accepted} zaakceptowanych`} />
        <StatCard label="Notatki u klienta" value={`${totals.notes}`} hint="opublikowane" />
        <StatCard
          label="Komunikacja / ryzyka"
          value={`${totals.clientComments}`}
          hint={`koment. klienta · otwarte wdroż. ${totals.kanbanOpen} · cele zagroż. ${totals.atRisk}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Wynik zdrowia (projekty)</CardTitle>
            <p className="text-xs text-muted">Im wyżej, tym stabilniej — max 18 projektów na wykresie</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            {scoreChart.length === 0 ? (
              <p className="text-sm text-muted">Brak projektów w filtrze.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreChart} margin={{ left: 0, right: 8, top: 8, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value as number}/100`, "Wynik"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                      return row?.fullName ?? "";
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {scoreChart.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rozkład kondycji</CardTitle>
            <p className="text-xs text-muted">Stabilny / wymaga uwagi / zagrożony</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            {items.length === 0 ? (
              <p className="text-sm text-muted">Brak danych.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bandChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {bandChart.map((entry) => (
                      <Cell key={entry.band} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {bandChart.map((entry) => (
                <Badge key={entry.band} className={BAND_BADGE[entry.band]}>
                  {entry.name}: {entry.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Projekty od najsłabszych</CardTitle>
          <p className="text-xs text-muted">Szybki przegląd komunikacji i ryzyk</p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted">Brak projektów przypisanych do widocznych klientów.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li key={item.projectId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/przestrzenie/klient/${item.clientId}?project=${item.projectId}&tab=goals`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {item.projectName}
                    </Link>
                    <p className="text-xs text-muted">{item.clientName}</p>
                    <p className="mt-1 text-xs text-muted">
                      cele zagroż. {item.signals.goalsAtRisk}
                      {" · "}
                      zmiany czekają {item.signals.changesPending}/{item.signals.changesTotal}
                      {" · "}
                      notatki {item.signals.meetingNotesPublished}
                      {" · "}
                      wdroż. otwarte {item.signals.kanbanTasksOpen}
                      {" · "}
                      koment. klienta {item.signals.kanbanClientComments}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold tabular-nums">{item.score}</span>
                    <Badge className={cn(BAND_BADGE[item.band])}>
                      {PROJECT_HEALTH_BAND_LABELS[item.band]}
                    </Badge>
                    <Badge tone="neutral">{PROJECT_HEALTH_SENTIMENT_LABELS[item.sentiment]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
