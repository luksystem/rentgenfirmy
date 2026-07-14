"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
} from "@/lib/service-intake/types";
import {
  VIZ_SLA_STATUS_LABELS,
  type VizSlaStatus,
  type VizServiceSlaItem,
} from "@/lib/viz/service-sla";
import { storeTabHref } from "@/lib/viz/store-tab-slugs";

type VizServiceSlaPanelProps = {
  dashboardId: string;
};

type SlaSummary = {
  totalOpen: number;
  overdueCount: number;
  approachingCount: number;
  items: VizServiceSlaItem[];
};

const SLA_TONE: Record<VizSlaStatus, "active" | "waiting" | "critical" | "neutral"> = {
  ok: "active",
  approaching: "waiting",
  overdue: "critical",
  no_deadline: "neutral",
};

function formatHours(value: number | null) {
  if (value == null) {
    return "—";
  }
  const abs = Math.abs(value);
  if (abs < 1) {
    return `${Math.round(abs * 60)} min`;
  }
  return `${abs.toFixed(1)} h`;
}

export function VizServiceSlaPanel({ dashboardId }: VizServiceSlaPanelProps) {
  const [summary, setSummary] = useState<SlaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/viz/dashboards/${dashboardId}/service-sla`);
        if (!response.ok) {
          throw new Error("Nie udało się pobrać SLA zgłoszeń.");
        }
        const data = (await response.json()) as SlaSummary;
        setSummary(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [dashboardId]);

  const visibleItems = useMemo(() => summary?.items.slice(0, 20) ?? [], [summary?.items]);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-5 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie SLA zgłoszeń…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-5 text-sm text-rose-300">{error}</Card>;
  }

  if (!summary?.totalOpen) {
    return (
      <Card className="p-5">
        <h2 className="text-base font-semibold">SLA zgłoszeń serwisowych</h2>
        <p className="mt-2 text-sm text-muted">Brak otwartych zgłoszeń w sieci sklepów.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">SLA zgłoszeń serwisowych</h2>
          <p className="mt-1 text-sm text-muted">
            Otwarte: {summary.totalOpen}
            {summary.overdueCount > 0 ? ` · Po terminie: ${summary.overdueCount}` : ""}
            {summary.approachingCount > 0 ? ` · Zbliża się termin: ${summary.approachingCount}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.overdueCount > 0 ? (
            <Badge tone="critical">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {summary.overdueCount} po terminie
            </Badge>
          ) : null}
          {summary.approachingCount > 0 ? (
            <Badge tone="waiting">
              <Clock className="mr-1 h-3 w-3" />
              {summary.approachingCount} zbliża się
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">SLA</th>
              <th className="px-3 py-2 font-medium">Numer</th>
              <th className="px-3 py-2 font-medium">Sklep</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Priorytet</th>
              <th className="px-3 py-2 font-medium">Otwarte</th>
              <th className="px-3 py-2 font-medium">Termin</th>
              <th className="px-3 py-2 font-medium">Umowa SLA</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="px-3 py-3">
                  <Badge tone={SLA_TONE[item.slaStatus]}>{VIZ_SLA_STATUS_LABELS[item.slaStatus]}</Badge>
                </td>
                <td className="px-3 py-3 font-medium">{item.referenceNumber}</td>
                <td className="px-3 py-3">
                  {item.projectId ? (
                    <Link
                      href={storeTabHref(dashboardId, item.projectId, "Serwis")}
                      className="hover:text-accent"
                    >
                      {item.projectLabel ?? item.projectId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3">{SERVICE_INTAKE_STATUS_LABELS[item.status]}</td>
                <td className="px-3 py-3 text-muted">
                  {item.priority ? SERVICE_INTAKE_PRIORITY_LABELS[item.priority] : "—"}
                </td>
                <td className="px-3 py-3 tabular-nums text-muted">{formatHours(item.hoursOpen)}</td>
                <td className="px-3 py-3 text-muted">
                  {item.effectiveDueAt
                    ? new Date(item.effectiveDueAt).toLocaleString("pl-PL")
                    : "—"}
                  {item.hoursUntilDue != null && item.hoursUntilDue > 0 ? (
                    <span className="block text-xs">za {formatHours(item.hoursUntilDue)}</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-muted">
                  {item.contractSlaHours != null
                    ? `${item.contractSlaHours} h${item.contractName ? ` (${item.contractName})` : ""}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary.items.length > visibleItems.length ? (
        <p className="mt-3 text-xs text-muted">
          Pokazano {visibleItems.length} z {summary.items.length} otwartych zgłoszeń.
        </p>
      ) : null}
    </Card>
  );
}
