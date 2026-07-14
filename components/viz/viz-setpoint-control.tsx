"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type VizSetpointControlProps = {
  dashboardId: string;
  projectId: string;
  currentValue: string | null;
  canControl: boolean;
  onSuccess?: () => void;
};

export function VizSetpointControl({
  dashboardId,
  projectId,
  currentValue,
  canControl,
  onSuccess,
}: VizSetpointControlProps) {
  const [value, setValue] = useState(currentValue?.replace(/[^\d.,-]/g, "") ?? "21");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!canControl) {
    return (
      <Card className="p-4 text-sm text-muted">
        Brak uprawnień do zmiany setpointu na tym dashboardzie.
      </Card>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const numeric = Number.parseFloat(value.replace(",", "."));
    if (Number.isNaN(numeric)) {
      setError("Podaj poprawną wartość temperatury.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, value: numeric }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się wysłać setpointu.");
      }

      setMessage("Setpoint wysłany do Miniservera.");
      onSuccess?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Błąd sterowania.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-3 font-semibold">Sterowanie setpointem</h3>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px]">
          <label className="mb-1.5 block text-sm font-medium">Nowy setpoint (°C)</label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wysyłanie…
            </>
          ) : (
            "Wyślij do BMS"
          )}
        </Button>
      </form>
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </Card>
  );
}
