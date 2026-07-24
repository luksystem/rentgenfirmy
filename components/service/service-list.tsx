"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  getServiceOfferListTone,
  serviceOfferListBadge,
  serviceOfferListCardClassName,
  serviceOfferListRowClassName,
} from "@/lib/service/client-offer-history";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import { isUnreviewedIntakeOffer } from "@/lib/service/intake-offer";
import { SERVICE_STATUSES } from "@/lib/service/types";
import {
  fetchRecentOfferSearches,
  recordOfferSearch,
} from "@/lib/supabase/offer-search-history-repository";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const ALL_CLIENTS = "";
const ALL_STATUSES = "";
const SEARCH_SAVE_DEBOUNCE_MS = 1200;

export function ServiceList() {
  const services = useServiceStore((s) => s.services);
  const deleteService = useServiceStore((s) => s.deleteService);
  const duplicateServiceForClient = useServiceStore((s) => s.duplicateServiceForClient);
  const upsertService = useServiceStore((s) => s.upsertService);
  const refresh = useServiceStore((s) => s.refresh);
  const isSaving = useServiceStore((s) => s.isSaving);
  const projects = useAppStore((s) => s.projects);
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const searchSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshList = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useListAutoRefresh(refreshList, 30_000, !isSaving);

  useEffect(() => {
    void fetchRecentOfferSearches().then(setRecentSearches);
  }, []);

  function handleClientFilterChange(value: string) {
    setClientFilter(value);
    if (searchSaveTimer.current) {
      clearTimeout(searchSaveTimer.current);
    }
    if (!value.trim()) {
      return;
    }
    searchSaveTimer.current = setTimeout(() => {
      void recordOfferSearch(value).then(() => {
        void fetchRecentOfferSearches().then(setRecentSearches);
      });
    }, SEARCH_SAVE_DEBOUNCE_MS);
  }

  function handleSelectRecentSearch(query: string) {
    setClientFilter(query);
    setShowRecentSearches(false);
  }

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const rows = useMemo(() => {
    const normalizedClientFilter = clientFilter.trim().toLowerCase();
    return services
      .filter((service) => {
        if (
          normalizedClientFilter &&
          !service.client.fullName.toLowerCase().includes(normalizedClientFilter)
        ) {
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

  async function handleMarkPaid(service: (typeof rows)[number]["service"]) {
    if (!window.confirm("Oznaczyć rozliczenie jako opłacone i zakończone?")) {
      return;
    }

    try {
      await upsertService({
        ...service,
        status: "Zakończona",
        updatedAt: new Date().toISOString(),
      });
    } catch {
      window.alert("Nie udało się zmienić statusu.");
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
            <Field label="Klient" className="relative">
              <Input
                value={clientFilter}
                onChange={(event) => handleClientFilterChange(event.target.value)}
                onFocus={() => setShowRecentSearches(true)}
                onBlur={() => window.setTimeout(() => setShowRecentSearches(false), 150)}
                placeholder="Szukaj po imieniu i nazwisku…"
              />
              {showRecentSearches && recentSearches.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border/80 bg-surface-elevated shadow-soft">
                  <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Ostatnie wyszukiwania
                  </p>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {recentSearches.map((query) => (
                      <li key={query}>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-surface-muted/60"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelectRecentSearch(query)}
                        >
                          {query}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
          const unreviewedIntake = isUnreviewedIntakeOffer(service);

          return (
            <Card
              key={service.id}
              className={cn(
                "overflow-hidden border p-4",
                serviceOfferListCardClassName(offerTone),
                unreviewedIntake && "ring-1 ring-emerald-500/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      {service.title}
                      {unreviewedIntake ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          Nowa
                        </span>
                      ) : null}
                    </span>
                  </p>
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
                {service.status === "Fakturowanie" ? (
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none"
                    disabled={isSaving}
                    onClick={() => void handleMarkPaid(service)}
                  >
                    Oznacz jako opłacone
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={isSaving}
                  onClick={() => void handleDuplicate(service)}
                >
                  Duplikuj
                </Button>
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
                const unreviewedIntake = isUnreviewedIntakeOffer(service);

                return (
                  <tr
                    key={service.id}
                    className={cn(
                      serviceOfferListRowClassName(offerTone),
                      unreviewedIntake && "bg-emerald-500/5",
                    )}
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
                        {service.status === "Fakturowanie" ? (
                          <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={() => void handleMarkPaid(service)}
                          >
                            Oznacz jako opłacone
                          </Button>
                        ) : null}
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => void handleDuplicate(service)}
                        >
                          Duplikuj
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
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        {service.title}
                        {unreviewedIntake ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                            Nowa
                          </span>
                        ) : null}
                      </span>
                    </td>
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
