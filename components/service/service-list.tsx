"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export function ServiceList() {
  const services = useServiceStore((s) => s.services);
  const deleteService = useServiceStore((s) => s.deleteService);
  const isSaving = useServiceStore((s) => s.isSaving);
  const projects = useAppStore((s) => s.projects);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const rows = services.map((service) => {
    const costs = buildServiceCosts(service);
    const diff = costs.actual.netTotal - costs.estimate.netTotal;

    return {
      service,
      costs,
      diff,
      projectLabel: service.projectId
        ? projectNames.get(service.projectId) ?? "—"
        : "Bez projektu",
    };
  });

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak serwisów. Użyj przycisku „Wyceń serwis”, aby dodać pierwszy wpis.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Obiekt</th>
              <th className="px-4 py-3">Tytuł</th>
              <th className="px-4 py-3">Projekt</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Est. netto</th>
              <th className="px-4 py-3 text-right">Rzecz. netto</th>
              <th className="px-4 py-3 text-right">Różnica</th>
              <th className="px-4 py-3 text-right">Brutto</th>
              <th className="px-4 py-3">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map(({ service, costs, diff, projectLabel }) => (
              <tr key={service.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-3">{formatDate(service.createdAt)}</td>
                <td className="px-4 py-3">{service.client.fullName}</td>
                <td className="px-4 py-3">{service.client.location}</td>
                <td className="px-4 py-3 font-medium">{service.title}</td>
                <td className="px-4 py-3">{projectLabel}</td>
                <td className="px-4 py-3">{service.serviceType}</td>
                <td className="px-4 py-3">{service.status}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(costs.estimate.netTotal)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(costs.actual.netTotal)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    diff > 0 && "text-rose-400",
                    diff < 0 && "text-emerald-400",
                  )}
                >
                  {diff >= 0 ? "+" : ""}
                  {formatMoney(diff)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatMoney(costs.actual.grossTotal)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/serwis/${service.id}`}>Edytuj</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isSaving}
                      onClick={async () => {
                        if (!window.confirm("Usunąć ten serwis?")) {
                          return;
                        }

                        try {
                          await deleteService(service.id);
                        } catch {
                          window.alert("Nie udało się usunąć serwisu.");
                        }
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
