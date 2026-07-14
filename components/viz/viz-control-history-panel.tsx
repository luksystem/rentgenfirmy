"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { VizControlCommand } from "@/lib/viz/viz-commands-server";

const STATUS_LABELS: Record<VizControlCommand["status"], string> = {
  pending: "Oczekuje",
  processing: "W trakcie",
  success: "Sukces",
  failed: "Błąd",
};

type VizControlHistoryPanelProps = {
  dashboardId: string;
  projectId: string;
};

export function VizControlHistoryPanel({ dashboardId, projectId }: VizControlHistoryPanelProps) {
  const [commands, setCommands] = useState<VizControlCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/commands?projectId=${encodeURIComponent(projectId)}`,
      );
      if (!response.ok) {
        throw new Error("Nie udało się pobrać historii sterowania.");
      }
      const data = (await response.json()) as { commands: VizControlCommand[] };
      setCommands(data.commands);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, projectId]);

  useEffect(() => {
    void loadCommands();
  }, [loadCommands]);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie historii sterowania…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!commands.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Brak wysłanych komend sterujących dla tego sklepu.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Rola</th>
              <th className="px-4 py-3 font-medium">Wartość</th>
              <th className="px-4 py-3 font-medium">Poprzednia</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Operator</th>
            </tr>
          </thead>
          <tbody>
            {commands.map((command) => (
              <tr key={command.id} className="border-b border-border/60">
                <td className="px-4 py-3 text-muted">
                  {new Date(command.createdAt).toLocaleString("pl-PL")}
                </td>
                <td className="px-4 py-3">{command.roleCode ?? command.commandType}</td>
                <td className="px-4 py-3 font-medium">{command.requestedValue}</td>
                <td className="px-4 py-3 text-muted">
                  {command.previousValue != null ? command.previousValue : "—"}
                </td>
                <td className="px-4 py-3">
                  {STATUS_LABELS[command.status]}
                  {command.errorMessage ? (
                    <span className="block text-xs text-rose-300">{command.errorMessage}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">{command.requestedByName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
