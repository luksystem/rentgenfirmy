"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WORK_ITEM_STATUS_LABELS } from "@/lib/my-work/types";
import { formatDate } from "@/lib/utils";
import { useMyWorkStore } from "@/store/my-work-store";

export function MyWorkManagerDashboard() {
  const metrics = useMyWorkStore((state) => state.dashboardMetrics);
  const loading = useMyWorkStore((state) => state.dashboardLoading);
  const ensureDashboard = useMyWorkStore((state) => state.ensureDashboardMetrics);

  useEffect(() => {
    void ensureDashboard();
  }, [ensureDashboard]);

  if (loading && !metrics) {
    return <p className="text-sm text-muted">Wczytywanie pulpitu…</p>;
  }

  if (!metrics) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        Nie udało się wczytać metryk pulpitu.
        <Button variant="secondary" size="sm" className="ml-3" onClick={() => void ensureDashboard({ force: true, showLoading: true })}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <LayoutDashboard className="h-4 w-4" />
          Pulpit managera
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Moja praca — operacje zespołu</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Otwarte zadania" value={metrics.totalOpen} />
        <MetricCard label="Zaległe" value={metrics.overdueCount} tone={metrics.overdueCount > 0 ? "amber" : "default"} />
        <MetricCard label="Do weryfikacji" value={metrics.pendingVerificationCount} />
        <MetricCard label="Otwarte przeszkody" value={metrics.openObstaclesCount} tone={metrics.openObstaclesCount > 0 ? "amber" : "default"} />
        <MetricCard label="Do zapoznania" value={metrics.pendingAckCount} />
        <MetricCard label="Zablokowane" value={metrics.blockedCount} />
        <MetricCard label="Plany bez potwierdzenia" value={metrics.weekPlansAwaitingAck} />
        <MetricCard label="Ukończone (7 dni)" value={metrics.completedThisWeek} tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wymaga reakcji</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.reactionQueue.length === 0 ? (
              <p className="text-sm text-muted">Brak zadań wymagających natychmiastowej reakcji.</p>
            ) : (
              metrics.reactionQueue.map((item) => (
                <Link
                  key={item.id}
                  href={item.myWorkLinkUrl}
                  className="block rounded-lg border border-border/80 px-3 py-2 text-sm hover:border-border-strong"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.assignedUserName} · {WORK_ITEM_STATUS_LABELS[item.status]}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zaległe zadania</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.overdueQueue.length === 0 ? (
              <p className="text-sm text-muted">Brak zaległości w zespole.</p>
            ) : (
              metrics.overdueQueue.map((item) => (
                <Link
                  key={item.id}
                  href={item.myWorkLinkUrl}
                  className="block rounded-lg border border-amber-500/30 px-3 py-2 text-sm hover:border-amber-500/50"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.assignedUserName} · termin {formatDate(item.plannedEnd ?? item.dueDate ?? undefined)}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Obciążenie zespołu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.assigneeLoad.slice(0, 6).map((row) => (
              <div key={row.userId} className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2 text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="text-xs text-muted">
                  {row.openCount} otw. · {row.overdueCount} zaległych
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Przeszkody
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.obstacleRows.length === 0 ? (
              <p className="text-sm text-muted">Brak otwartych przeszkód.</p>
            ) : (
              metrics.obstacleRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-border/80 px-3 py-2 text-sm">
                  <p className="font-medium">{row.workItemTitle ?? "Przeszkoda ogólna"}</p>
                  <p className="text-xs text-muted">
                    {row.reportedByName} · {row.severity} · {row.obstacleType}
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">{row.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {metrics.bySourceType.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Źródła otwartych zadań</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {metrics.bySourceType.map((entry) => (
              <span
                key={entry.code}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted"
              >
                {entry.label}: {entry.count}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
