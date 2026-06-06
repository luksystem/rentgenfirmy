"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWorkOrderStore } from "@/store/work-order-store";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { AcceptedOfferPdfButton } from "@/components/work-order/accepted-offer-pdf-button";
import { Card } from "@/components/ui/card";
import {
  WORK_ORDER_SOURCE_LABELS,
  type WorkOrderStatus,
} from "@/lib/work-order/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

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
  const isSaving = useWorkOrderStore((s) => s.isSaving);
  const projects = useAppStore((s) => s.projects);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  if (orders.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak zleceń. Powstaną automatycznie po akceptacji oferty przez klienta albo dodaj ręcznie.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
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
            {orders.map((order) => {
              const projectLabel = order.projectId
                ? projectNames.get(order.projectId) ?? "—"
                : "Bez projektu";

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
  );
}
