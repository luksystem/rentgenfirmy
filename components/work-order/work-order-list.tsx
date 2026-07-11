"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useWorkOrderStore } from "@/store/work-order-store";
import { useAppStore } from "@/store/app-store";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { AcceptedOfferPdfButton } from "@/components/work-order/accepted-offer-pdf-button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import {
  WORK_ORDER_SOURCE_LABELS,
  WORK_ORDER_STATUSES,
  type WorkOrderStatus,
} from "@/lib/work-order/types";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const ALL_CLIENTS = "";
const ALL_STATUSES = "";

function statusRowClass(status: WorkOrderStatus) {
  switch (status) {
    case "Nowe":
      return "bg-sky-500/8 hover:bg-sky-500/12";
    case "Zaplanowane":
      return "bg-amber-500/10 hover:bg-amber-500/15";
    case "W trakcie":
      return "bg-orange-500/10 hover:bg-orange-500/15";
    case "Zrealizowane":
      return "bg-emerald-500/10 hover:bg-emerald-500/15";
    case "Anulowane":
      return "bg-rose-500/10 hover:bg-rose-500/15";
    default:
      return "hover:bg-surface-muted/50";
  }
}

function statusCardClass(status: WorkOrderStatus) {
  switch (status) {
    case "Nowe":
      return "border-sky-500/25 bg-sky-500/8";
    case "Zaplanowane":
      return "border-amber-500/30 bg-amber-500/10";
    case "W trakcie":
      return "border-orange-500/30 bg-orange-500/10";
    case "Zrealizowane":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "Anulowane":
      return "border-rose-500/30 bg-rose-500/10";
    default:
      return "border-border/80 bg-surface";
  }
}

function stickyCellClass(status: WorkOrderStatus) {
  switch (status) {
    case "Nowe":
      return "bg-sky-500/8";
    case "Zaplanowane":
      return "bg-amber-500/10";
    case "W trakcie":
      return "bg-orange-500/10";
    case "Zrealizowane":
      return "bg-emerald-500/10";
    case "Anulowane":
      return "bg-rose-500/10";
    default:
      return "bg-surface";
  }
}

export function WorkOrderList() {
  const orders = useWorkOrderStore((s) => s.orders);
  const deleteOrder = useWorkOrderStore((s) => s.deleteOrder);
  const refresh = useWorkOrderStore((s) => s.refresh);
  const isSaving = useWorkOrderStore((s) => s.isSaving);
  const projects = useAppStore((s) => s.projects);
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const refreshList = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useListAutoRefresh(refreshList);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const clientOptions = useMemo(() => {
    const names = new Set(orders.map((order) => order.client.fullName.trim()).filter(Boolean));
    return [...names].sort((left, right) => left.localeCompare(right, "pl"));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (clientFilter && order.client.fullName !== clientFilter) {
        return false;
      }
      if (statusFilter && order.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [clientFilter, orders, statusFilter]);

  const hasActiveFilters = clientFilter !== ALL_CLIENTS || statusFilter !== ALL_STATUSES;
  const activeFilterCount =
    (clientFilter !== ALL_CLIENTS ? 1 : 0) + (statusFilter !== ALL_STATUSES ? 1 : 0);

  function clearFilters() {
    setClientFilter(ALL_CLIENTS);
    setStatusFilter(ALL_STATUSES);
  }

  if (orders.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak zleceń. Powstaną automatycznie po akceptacji oferty przez klienta albo dodaj ręcznie.
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
                {WORK_ORDER_STATUSES.map((status) => (
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

      {filteredOrders.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          Brak zleceń dla wybranych filtrów.
        </Card>
      ) : (
        <>
      <div className="grid gap-3 md:hidden">
        {filteredOrders.map((order) => {
          const projectLabel = order.projectId ? (
            projectNames.get(order.projectId) ?? "—"
          ) : (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              Bez projektu
            </span>
          );

          return (
            <Card
              key={order.id}
              className={cn("overflow-hidden border p-4", statusCardClass(order.status))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{order.title}</p>
                  <p className="mt-1 text-sm text-muted">{order.client.fullName}</p>
                </div>
                <p className="shrink-0 text-xs text-muted">{formatDate(order.createdAt)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface-muted/80 px-2 py-0.5 text-[11px] font-medium">
                  {order.status}
                </span>
                <span className="rounded-full bg-surface-muted/60 px-2 py-0.5 text-[11px] text-muted">
                  {WORK_ORDER_SOURCE_LABELS[order.source]}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Projekt</dt>
                  <dd className="mt-0.5 text-foreground">{projectLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Brutto oferty</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                    {order.offerGrossTotal !== null ? formatMoney(order.offerGrossTotal) : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild className="flex-1 min-w-[7rem]">
                  <Link href={`/zlecenia/${order.id}`}>Edytuj</Link>
                </Button>
                {order.serviceId ? (
                  <Button variant="outline" size="sm" asChild className="flex-1 min-w-[7rem]">
                    <Link href={`/oferty/${order.serviceId}`}>Oferta</Link>
                  </Button>
                ) : null}
                {order.acceptedOfferDocument ? (
                  <AcceptedOfferPdfButton
                    document={order.acceptedOfferDocument}
                    variant="outline"
                  />
                ) : null}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isSaving}
                  className="flex-1 min-w-[7rem]"
                  onClick={async () => {
                    if (!window.confirm("Usunąć to zlecenie?")) {
                      return;
                    }

                    try {
                      await deleteOrder(order.id);
                    } catch {
                      window.alert("Nie udało się usunąć zlecenia.");
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
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="sticky left-0 z-20 bg-surface-muted px-3 py-3 sm:px-4">Akcje</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tytuł</th>
                <th className="px-4 py-3">Klient</th>
                <th className="px-4 py-3">Projekt</th>
                <th className="px-4 py-3">Źródło</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Kwota brutto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.map((order) => {
                const projectLabel = order.projectId ? (
                  projectNames.get(order.projectId) ?? "—"
                ) : (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Bez projektu
                  </span>
                );

                return (
                  <tr key={order.id} className={cn(statusRowClass(order.status))}>
                    <td
                      className={cn(
                        "sticky left-0 z-10 px-3 py-3 shadow-[1px_0_0_var(--border)] sm:px-4",
                        stickyCellClass(order.status),
                      )}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/zlecenia/${order.id}`}>Edytuj</Link>
                        </Button>
                        {order.serviceId ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/oferty/${order.serviceId}`}>Oferta</Link>
                          </Button>
                        ) : null}
                        {order.acceptedOfferDocument ? (
                          <AcceptedOfferPdfButton
                            document={order.acceptedOfferDocument}
                            variant="outline"
                          />
                        ) : null}
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isSaving}
                          onClick={async () => {
                            if (!window.confirm("Usunąć to zlecenie?")) {
                              return;
                            }

                            try {
                              await deleteOrder(order.id);
                            } catch {
                              window.alert("Nie udało się usunąć zlecenia.");
                            }
                          }}
                        >
                          Usuń
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{order.title}</td>
                    <td className="px-4 py-3">{order.client.fullName}</td>
                    <td className="px-4 py-3">{projectLabel}</td>
                    <td className="px-4 py-3">{WORK_ORDER_SOURCE_LABELS[order.source]}</td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {order.offerGrossTotal !== null ? formatMoney(order.offerGrossTotal) : "—"}
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
