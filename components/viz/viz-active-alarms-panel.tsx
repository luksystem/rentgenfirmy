"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VIZ_ALARM_CONDITION_LABELS } from "@/lib/viz/project-contact-types";
import { storeTabHref } from "@/lib/viz/store-tab-slugs";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";
import { flattenActiveAlarms } from "@/lib/viz/alarm-display";

type VizActiveAlarmsPanelProps = {
  dashboardId: string;
  snapshots: VizStoreLiveSnapshot[];
  canAcknowledge: boolean;
  onAcknowledged?: () => void;
};

type AlarmFilter = "all" | "unacknowledged";

export function VizActiveAlarmsPanel({
  dashboardId,
  snapshots,
  canAcknowledge,
  onAcknowledged,
}: VizActiveAlarmsPanelProps) {
  const [filter, setFilter] = useState<AlarmFilter>("unacknowledged");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const telemetryOnlyStores = useMemo(
    () =>
      snapshots.filter(
        (snapshot) =>
          (snapshot.roles.active_alarm_count?.numericValue ?? 0) > 0 &&
          snapshot.activeAlarms.length === 0,
      ),
    [snapshots],
  );

  const flattenedAlarms = useMemo(() => flattenActiveAlarms(snapshots), [snapshots]);

  const visibleAlarms = useMemo(() => {
    if (filter === "all") {
      return flattenedAlarms;
    }
    return flattenedAlarms.filter((alarm) => !alarm.acknowledgement);
  }, [filter, flattenedAlarms]);

  const unacknowledgedCount =
    flattenedAlarms.filter((alarm) => !alarm.acknowledgement).length + telemetryOnlyStores.length;

  async function acknowledgeItems(items: Array<{ projectId: string; ruleId: string }>) {
    if (!items.length) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/viz/dashboards/${dashboardId}/alarms/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się potwierdzić alarmów.");
    }

    onAcknowledged?.();
  }

  async function acknowledgeOne(projectId: string, ruleId: string) {
    const key = `${projectId}:${ruleId}`;
    setPendingKey(key);
    try {
      await acknowledgeItems([{ projectId, ruleId }]);
    } catch (ackError) {
      setError(ackError instanceof Error ? ackError.message : "Błąd potwierdzania.");
    } finally {
      setPendingKey(null);
    }
  }

  async function acknowledgeAllVisible() {
    const items = visibleAlarms
      .filter((alarm) => !alarm.acknowledgement)
      .map((alarm) => ({ projectId: alarm.projectId, ruleId: alarm.ruleId }));

    if (!items.length) {
      return;
    }

    setBulkPending(true);
    try {
      await acknowledgeItems(items);
    } catch (ackError) {
      setError(ackError instanceof Error ? ackError.message : "Błąd potwierdzania.");
    } finally {
      setBulkPending(false);
    }
  }

  if (!flattenedAlarms.length && !telemetryOnlyStores.length) {
    return (
      <Card className="p-5">
        <h2 className="text-base font-semibold">Aktywne alarmy</h2>
        <p className="mt-2 text-sm text-muted">Brak aktywnych alarmów reguł na sieci sklepów.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Aktywne alarmy</h2>
          <p className="mt-1 text-sm text-muted">
            {unacknowledgedCount > 0
              ? `${unacknowledgedCount} wymaga uwagi`
              : "Wszystkie reguły potwierdzone"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "unacknowledged" ? "default" : "secondary"}
            onClick={() => setFilter("unacknowledged")}
          >
            Do potwierdzenia
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "secondary"}
            onClick={() => setFilter("all")}
          >
            Wszystkie
          </Button>
          {canAcknowledge && filter === "unacknowledged" && visibleAlarms.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={bulkPending}
              onClick={() => void acknowledgeAllVisible()}
            >
              {bulkPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Potwierdź widoczne
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-2">
        {visibleAlarms.map((alarm) => {
          const key = `${alarm.projectId}:${alarm.ruleId}`;
          const isPending = pendingKey === key;

          return (
            <div
              key={key}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/wizualizacje/${dashboardId}/sklep/${alarm.projectId}`}
                    className="font-medium hover:text-accent"
                  >
                    {alarm.storeName}
                  </Link>
                  <Badge tone={alarm.severity === "alarm" ? "critical" : "waiting"}>
                    {alarm.severity === "alarm" ? "Alarm" : "Ostrzeżenie"}
                  </Badge>
                  {alarm.acknowledgement ? (
                    <Badge tone="active">Potwierdzony</Badge>
                  ) : null}
                </div>
                <p className="text-sm font-medium">{alarm.ruleName}</p>
                <p className="text-sm text-muted">
                  {alarm.roleCode}: {alarm.numericValue}{" "}
                  {VIZ_ALARM_CONDITION_LABELS[alarm.condition]} {alarm.thresholdNumeric}
                </p>
                {alarm.acknowledgement ? (
                  <p className="text-xs text-muted">
                    Potwierdzono{" "}
                    {new Date(alarm.acknowledgement.acknowledgedAt).toLocaleString("pl-PL")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={storeTabHref(dashboardId, alarm.projectId, "Alarmy")}
                  className="text-xs text-accent hover:underline"
                >
                  Szczegóły
                </Link>
                {canAcknowledge && !alarm.acknowledgement ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => void acknowledgeOne(alarm.projectId, alarm.ruleId)}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Potwierdź
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}

        {filter === "all" || filter === "unacknowledged"
          ? telemetryOnlyStores.map((snapshot) => (
              <div
                key={snapshot.projectId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/wizualizacje/${dashboardId}/sklep/${snapshot.projectId}`}
                      className="font-medium hover:text-accent"
                    >
                      {snapshot.displayName ?? snapshot.projectName}
                    </Link>
                    <Badge tone="critical">Telemetria Loxone</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    Aktywne alarmy z miniservera (
                    {snapshot.roles.active_alarm_count?.displayValue ?? "—"}). Brak reguły
                    dashboardu do potwierdzenia.
                  </p>
                </div>
                <Link
                  href={storeTabHref(dashboardId, snapshot.projectId, "Alarmy")}
                  className="text-xs text-accent hover:underline"
                >
                  Szczegóły
                </Link>
              </div>
            ))
          : null}
      </div>
    </Card>
  );
}
