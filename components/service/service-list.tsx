"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import {
  getServiceOfferListTone,
  serviceOfferListBadge,
  serviceOfferListCardClassName,
  serviceOfferListRowClassName,
} from "@/lib/service/client-offer-history";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import { SERVICE_STATUSES } from "@/lib/service/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const ALL_CLIENTS = "";
const ALL_STATUSES = "";

export function ServiceList() {
  const services = useServiceStore((s) => s.services);
  const deleteService = useServiceStore((s) => s.deleteService);
  const duplicateServiceForClient = useServiceStore((s) => s.duplicateServiceForClient);
  const refresh = useServiceStore((s) => s.refresh);
  const isSaving = useServiceStore((s) => s.isSaving);
  const projects = useAppStore((s) => s.projects);
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const refreshList = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useListAutoRefresh(refreshList, 30_000, !isSaving);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const clientOptions = useMemo(() => {
    const names = new Set(services.map((service) => service.client.fullName.trim()).filter(Boolean));
    return [...names].sort((left, right) => left.localeCompare(right, "pl"));
  }, [services]);

  const rows = useMemo(() => {
    return services
      .filter((service) => {
        if (clientFilter && service.client.fullName !== clientFilter) {
          return false;
        }
        if (statusFilter && service.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .map((service) => {
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
  }, [clientFilter, projectNames, services, statusFilter]);

  const hasActiveFilters = clientFilter !== ALL_CLIENTS || statusFilter !== ALL_STATUSES;
  const activeFilterCount =
    (clientFilter !== ALL_CLIENTS ? 1 : 0) + (statusFilter !== ALL_STATUSES ? 1 : 0);

  function clearFilters() {
    setClientFilter(ALL_CLIENTS);
    setStatusFilter(ALL_STATUSES);
  }

  async function handleDuplicate(service: (typeof rows)[number]["service"]) {
    const isSettlement =
      service.status === "Rozliczony" || service.status === "Do rozliczenia";
    if (!isSettlement) {
      window.alert("Duplikowanie dostępne dla rozliczeń serwisowych.");
      return;
    }

    const targetName = window.prompt(
      "Dla jakiego klienta utworzyć kopię rozliczenia?",
      "",
    );
    if (!targetName?.trim()) {
      return;
    }

    const existing = services.find((entry) => entry.client.fullName === targetName.trim());
    const client = existing
      ? { ...existing.client }
      : {
          fullName: targetName.trim(),
          location: "",
          email: "",
          phone: "",
        };

    try {
      const cloned = await duplicateServiceForClient(service.id, client);
      window.location.href = `/oferty/${cloned.id}`;
    } catch {
      window.alert("Nie udało się zduplikować rozliczenia.");
    }
  }

  if (services.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak ofert. Użyj przycisku „Nowa oferta”, aby dodać pierwszy wpis.
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4 border-border/80 p-4">
        <MobileFiltersPanel
          activeCount={activeFilterCount}
          onClear={clearFilters}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <Field label="Klient">
              <Select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                <option value={ALL_CLIENTS}>Wszyscy klienci</option>
                {clientOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value={ALL_STATUSES}>Wszystkie statusy</option>
                {SERVICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="hidden sm:col-span-2 lg:col-span-1 md:inline-flex"
                onClick={clearFilters}
              >
                Wyczyść filtry
              </Button>
            ) : null}
          </div>
        </MobileFiltersPanel>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          Brak ofert dla wybranych filtrów.
        </Card>
      ) : (
        <>
      <div className="grid gap-3 md:hidden">
        {rows.map(({ service, costs, diff, projectLabel }) => {
          const offerTone = getServiceOfferListTone(service);
          const offerBadge = serviceOfferListBadge(offerTone);

          return (
            <Card
              key={service.id}
              className={cn("overflow-hidden border p-4", serviceOfferListCardClassName(offerTone))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{service.title}</p>
                  <p className="mt-1 text-sm text-muted">{service.client.fullName}</p>
                  {service.client.location ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{service.client.location}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-xs text-muted">{formatDate(service.createdAt)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface-muted/80 px-2 py-0.5 text-[11px] font-medium">
                  {service.status}
                </span>
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
                <span className="rounded-full bg-surface-muted/60 px-2 py-0.5 text-[11px] text-muted">
                  {service.serviceType}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Projekt</dt>
                  <dd className="mt-0.5 text-foreground">{projectLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Brutto</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                    {formatMoney(costs.actual.grossTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Przewidywane netto</dt>
                  <dd className="mt-0.5 tabular-nums text-foreground">
                    {formatMoney(costs.estimate.netTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Różnica netto</dt>
                  <dd
                    className={cn(
                      "mt-0.5 tabular-nums font-medium",
                      diff > 0 && "text-rose-400",
                      diff < 0 && "text-emerald-400",
                      diff === 0 && "text-foreground",
                    )}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatMoney(diff)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild className="flex-1 sm:flex-none">
                  <Link href={`/oferty/${service.id}`}>Edytuj</Link>
                </Button>
                {service.status === "Rozliczony" || service.status === "Do rozliczenia" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    disabled={isSaving}
                    onClick={() => void handleDuplicate(service)}
                  >
                    Duplikuj
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isSaving}
                  className="flex-1 sm:flex-none"
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
            </Card>
          );
        })}
      </div>

      <Card className="hidden overflow-hidden md:block">
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
                        {service.status === "Rozliczony" || service.status === "Do rozliczenia" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => void handleDuplicate(service)}
                          >
                            Duplikuj
                          </Button>
                        ) : null}
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
        </>
      )}
    </>
  );
}
