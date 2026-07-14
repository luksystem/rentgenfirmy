"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VizBulkSetpointControl } from "@/components/viz/viz-bulk-setpoint-control";
import { VizActiveAlarmsPanel } from "@/components/viz/viz-active-alarms-panel";
import { VizNetworkSystemsMatrix } from "@/components/viz/viz-network-systems-matrix";
import { VizChartRenderer } from "@/components/viz/viz-chart-renderer";
import { VizDashboardMap } from "@/components/viz/viz-dashboard-map";
import { VizEnergyTrendWidget } from "@/components/viz/viz-energy-trend-widget";
import { formatEnergyKwh } from "@/lib/viz/energy-kpi";
import { STORE_QUICK_LINK_TABS, storeTabHref } from "@/lib/viz/store-tab-slugs";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";
import { LIVE_POLL_MS, useVizDashboardCacheStore } from "@/store/viz-dashboard-cache-store";

type VizDashboardCommandCenterProps = {
  dashboardId: string;
};

function statusTone(snapshot: VizStoreLiveSnapshot): "active" | "waiting" | "critical" | "closed" | "blue" | "neutral" {
  return snapshot.status.tone;
}

export function VizDashboardCommandCenter({ dashboardId }: VizDashboardCommandCenterProps) {
  const live = useVizDashboardCacheStore((s) => s.getLive(dashboardId));
  const widgetCharts = useVizDashboardCacheStore((s) => s.getWidgetCharts(dashboardId));
  const session = useVizDashboardCacheStore((s) => s.getSession(dashboardId));
  const isLoading = useVizDashboardCacheStore((s) => s.isLiveLoading(dashboardId));
  const ensureLive = useVizDashboardCacheStore((s) => s.ensureLive);
  const invalidateLive = useVizDashboardCacheStore((s) => s.invalidateLive);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const hasCachedLive = Boolean(useVizDashboardCacheStore.getState().getLive(dashboardId));
      const data = await useVizDashboardCacheStore
        .getState()
        .ensureLive(dashboardId, {
          force: refresh,
          showLoading: refresh ? false : !hasCachedLive,
        });
      if (!data && !hasCachedLive) {
        throw new Error("Nie udało się pobrać danych dashboardu.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsRefreshing(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    const store = useVizDashboardCacheStore.getState();
    void store.ensureSession(dashboardId);
    void load(false);
    void store.ensureWidgetCharts(dashboardId);

    const interval = window.setInterval(() => {
      void useVizDashboardCacheStore
        .getState()
        .ensureLive(dashboardId, { force: true, showLoading: false });
    }, LIVE_POLL_MS);

    return () => window.clearInterval(interval);
  }, [dashboardId, load]);

  if (isLoading && !live) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie dashboardu…
      </div>
    );
  }

  if (error && !live) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!live?.snapshots.length) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="font-medium">Dashboard nie ma jeszcze przypisanych sklepów</p>
        <Link href={`/wizualizacje/${dashboardId}/konfiguracja`} className="text-sm text-accent hover:underline">
          Przejdź do konfiguracji
        </Link>
      </Card>
    );
  }

  const { kpi, snapshots } = live;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Dane z ostatniego sync telemetrii. Brak mapowania = „—”, nie zero.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isRefreshing}
          onClick={() => void load(true)}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Odśwież
        </Button>
      </div>

      <VizBulkSetpointControl
        dashboardId={dashboardId}
        snapshots={snapshots}
        canControl={session?.permissions.controlSetpoint === true}
        onSuccess={() => void ensureLive(dashboardId, { force: true, showLoading: false })}
      />

      <VizActiveAlarmsPanel
        dashboardId={dashboardId}
        snapshots={snapshots}
        canAcknowledge={session?.permissions.acknowledgeAlarms === true}
        onAcknowledged={() => {
          invalidateLive(dashboardId);
          void ensureLive(dashboardId, { force: true, showLoading: false });
        }}
      />

      <VizNetworkSystemsMatrix dashboardId={dashboardId} snapshots={snapshots} />

      <VizDashboardMap dashboardId={dashboardId} snapshots={snapshots} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sklepy" value={String(kpi.storeCount)} />
        <KpiCard label="Online" value={String(kpi.onlineCount)} />
        <KpiCard label="Offline" value={String(kpi.offlineCount)} />
        <KpiCard
          label="Średnia temperatura"
          value={
            kpi.avgTemperature != null ? `${kpi.avgTemperature.toFixed(1)} °C` : "—"
          }
        />
        <KpiCard label="Z alarmami" value={String(kpi.alarmCount)} />
        <KpiCard
          label="Alarmy bez potwierdzenia"
          value={String(kpi.unacknowledgedAlarmCount ?? 0)}
        />
        <KpiCard label="Otwarte zgłoszenia" value={String(kpi.openServiceRequests)} />
        <KpiCard
          label="Energia (suma odczytów)"
          value={formatEnergyKwh(kpi.totalEnergyKwh)}
        />
        <KpiCard
          label="Sklepy z odczytem energii"
          value={String(kpi.storesWithEnergyReading)}
        />
        <KpiCard label="Faktury energii" value={String(kpi.energyInvoiceCount)} />
      </div>

      {kpi.energyInvoiceCount > 0 ? (
        <VizEnergyTrendWidget dashboardId={dashboardId} compact />
      ) : null}

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Macierz sklepów</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-2 font-medium">Sklep</th>
                <th className="px-3 py-2 font-medium">Adres (klient projektu)</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Temperatura</th>
                <th className="px-3 py-2 font-medium">Setpoint</th>
                <th className="px-3 py-2 font-medium">Zgłoszenia</th>
                <th className="px-3 py-2 font-medium">Ostatni odczyt</th>
                <th className="px-3 py-2 font-medium">Zakładki</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((store) => (
                <tr key={store.projectId} className="border-b border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/wizualizacje/${dashboardId}/sklep/${store.projectId}`}
                      className="font-medium hover:text-accent"
                    >
                      {store.displayName ?? store.projectName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted">{store.clientAddress ?? "Brak adresu"}</td>
                  <td className="px-3 py-3">
                    <Badge tone={statusTone(store)}>{store.status.label}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    {store.roles.store_temperature?.displayValue ?? "—"}
                  </td>
                  <td className="px-3 py-3">{store.roles.store_setpoint?.displayValue ?? "—"}</td>
                  <td className="px-3 py-3">
                    {store.openServiceRequests > 0 ? store.openServiceRequests : "—"}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {store.lastReadAt
                      ? new Date(store.lastReadAt).toLocaleString("pl-PL")
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {STORE_QUICK_LINK_TABS.map((tab) => (
                        <Link
                          key={tab}
                          href={storeTabHref(dashboardId, store.projectId, tab)}
                          className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs text-muted hover:border-accent/40 hover:text-accent"
                        >
                          {tab}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {widgetCharts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Wykresy</h2>
            <Link
              href={`/wizualizacje/${dashboardId}/wykresy`}
              className="text-sm text-accent hover:underline"
            >
              Konfiguruj wykresy
            </Link>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {widgetCharts.map((chart) => (
              <VizChartRenderer key={chart.id} dashboardId={dashboardId} chart={chart} />
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-4 text-sm text-muted">
          Brak widgetów wykresów.{" "}
          <Link href={`/wizualizacje/${dashboardId}/wykresy`} className="text-accent hover:underline">
            Dodaj wykresy
          </Link>{" "}
          i włącz opcję „Pokaż jako widget”.
        </Card>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
