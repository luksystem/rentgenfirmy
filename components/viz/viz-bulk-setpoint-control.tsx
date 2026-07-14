"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { averageSetpointFromSnapshots } from "@/lib/viz/live-types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

const MIN_SETPOINT = 16;
const MAX_SETPOINT = 30;
const SETPOINT_STEP = 0.5;

type VizBulkSetpointControlProps = {
  dashboardId: string;
  snapshots: VizStoreLiveSnapshot[];
  canControl: boolean;
  onSuccess?: () => void;
};

export function VizBulkSetpointControl({
  dashboardId,
  snapshots,
  canControl,
  onSuccess,
}: VizBulkSetpointControlProps) {
  const avgSetpoint = averageSetpointFromSnapshots(snapshots);
  const [value, setValue] = useState(avgSetpoint ?? 22);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (avgSetpoint != null) {
      setValue(avgSetpoint);
    }
  }, [avgSetpoint]);

  if (!canControl) {
    return null;
  }

  async function handleApply() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allStores: true, value }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        succeeded?: number;
        failed?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać setpointu do sklepów.");
      }

      const succeeded = payload.succeeded ?? snapshots.length;
      const failed = payload.failed ?? 0;

      if (failed > 0) {
        setMessage(`Setpoint ${value}°C: ${succeeded} sklepów OK, ${failed} błędów.`);
      } else {
        setMessage(`Setpoint ${value}°C ustawiony we wszystkich sklepach (${succeeded}).`);
      }

      onSuccess?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Błąd sterowania.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Setpoint sieciowy</h3>
          <p className="mt-1 text-sm text-muted">
            Ustaw temperaturę zadaną we wszystkich sklepach dashboardu jednocześnie.
            {avgSetpoint != null ? ` Średnia aktualna: ${avgSetpoint}°C.` : null}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-accent">{value.toFixed(1)}°C</p>
      </div>

      <input
        type="range"
        min={MIN_SETPOINT}
        max={MAX_SETPOINT}
        step={SETPOINT_STEP}
        value={value}
        onChange={(event) => setValue(Number.parseFloat(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-accent"
        aria-label="Setpoint dla wszystkich sklepów"
      />
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{MIN_SETPOINT}°C</span>
        <span>{MAX_SETPOINT}°C</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={isSaving || snapshots.length === 0} onClick={() => void handleApply()}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wysyłanie do {snapshots.length} sklepów…
            </>
          ) : (
            `Zastosuj we wszystkich sklepach (${snapshots.length})`
          )}
        </Button>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </Card>
  );
}
