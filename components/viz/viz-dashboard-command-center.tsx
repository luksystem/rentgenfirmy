"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

type VizDashboardCommandCenterProps = {
  dashboardId: string;
};

type LiveResponse = {
  snapshots: VizStoreLiveSnapshot[];
  kpi: {
    storeCount: number;
    onlineCount: number;
    offlineCount: number;
    alarmCount: number;
    openServiceRequests: number;
    avgTemperature: number | null;
  };
};

function statusTone(snapshot: VizStoreLiveSnapshot): "active" | "waiting" | "critical" | "closed" | "blue" | "neutral" {
  return snapshot.status.tone;
}

export function VizDashboardCommandCenter({ dashboardId }: VizDashboardCommandCenterProps) {
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/live`, {
        method: refresh ? "POST" : "GET",
      });
      if (!response.ok) {
        throw new Error("Nie udało się pobrać danych dashboardu.");
      }
      const data = (await response.json()) as LiveResponse;
      setLive(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <KpiCard label="Otwarte zgłoszenia" value={String(kpi.openServiceRequests)} />
      </div>

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex items-start gap-3 border-amber-500/20 bg-amber-500/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <p className="font-medium text-amber-100">Etap 2 — dane na żywo z telemetrii</p>
          <p className="mt-1 text-muted">
            Mapa, wykresy historyczne i reguły alarmów będą w Etapie 3. Zgłoszenia serwisowe
            pochodzą z istniejącego modułu (statusy new/in_review).
          </p>
        </div>
      </Card>
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
