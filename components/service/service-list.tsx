"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getServiceOfferListTone,
  serviceOfferListBadge,
  serviceOfferListRowClassName,
} from "@/lib/service/client-offer-history";
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
        Brak ofert. Użyj przycisku „Nowa oferta”, aby dodać pierwszy wpis.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="sticky left-0 z-20 bg-surface-muted px-3 py-3 sm:px-4">Akcje</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Obiekt</th>
              <th className="px-4 py-3">Tytuł</th>
              <th className="px-4 py-3">Projekt</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Przewidywane netto</th>
              <th className="px-4 py-3 text-right">Rzecz. netto</th>
              <th className="px-4 py-3 text-right">Różnica</th>
              <th className="px-4 py-3 text-right">Brutto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map(({ service, costs, diff, projectLabel }) => {
              const offerTone = getServiceOfferListTone(service);
              const offerBadge = serviceOfferListBadge(offerTone);

              return (
              <tr
                key={service.id}
                className={cn(serviceOfferListRowClassName(offerTone))}
              >
                <td
                  className={cn(
                    "sticky left-0 z-10 bg-surface px-3 py-3 shadow-[1px_0_0_var(--border)] sm:px-4",
                    offerTone === "quote" && "bg-sky-500/8",
                    offerTone === "pending" && "bg-amber-500/10",
                    offerTone === "negotiation" && "bg-orange-500/10",
                    offerTone === "accepted" && "bg-emerald-500/10",
                    offerTone === "rejected" && "bg-rose-500/10",
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/oferty/${service.id}`}>Edytuj</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isSaving}
                      onClick={async () => {
                        if (!window.confirm("Usunąć tę ofertę?")) {
                          return;
                        }

                        try {
                          await deleteService(service.id);
                        } catch {
                          window.alert("Nie udało się usunąć oferty.");
                        }
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3">{formatDate(service.createdAt)}</td>
                <td className="px-4 py-3">{service.client.fullName}</td>
                <td className="px-4 py-3">{service.client.location}</td>
                <td className="px-4 py-3 font-medium">{service.title}</td>
                <td className="px-4 py-3">{projectLabel}</td>
                <td className="px-4 py-3">{service.serviceType}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{service.status}</span>
                    {offerBadge ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          offerBadge.className,
                        )}
                      >
                        {offerBadge.label}
                      </span>
                    ) : null}
                  </div>
                </td>
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
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
