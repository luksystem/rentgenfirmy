"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ExternalLink, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { formatDate, formatMoney } from "@/lib/utils";

export function ProcessSettlementPanel({ projectId }: { projectId: string }) {
  const services = useServiceStore((state) => state.services);
  const hydrate = useServiceStore((state) => state.hydrate);
  const isLoading = useServiceStore((state) => state.isLoading);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const linked = useMemo(
    () =>
      services
        .filter((service) => service.projectId === projectId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [projectId, services],
  );

  return (
    <div className="grid gap-4 rounded-xl border border-border/70 bg-surface-muted/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Receipt className="h-4 w-4 text-accent" />
            Rozliczenia powiązane z projektem
          </p>
          <p className="mt-1 text-xs text-muted">
            Oferty serwisowe z przypisanym tym projektem. Kalkulacje sprzedażowe Smart Home są w
            osobnym module.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link href="/oferty/nowy">Nowa oferta serwisowa</Link>
        </Button>
      </div>

      {isLoading && !linked.length ? (
        <p className="text-sm text-muted">Ładowanie rozliczeń…</p>
      ) : !linked.length ? (
        <p className="text-sm text-muted">
          Brak ofert serwisowych przypisanych do tego projektu. Utwórz ofertę i wybierz projekt w
          polu „Projekt”, aby pojawiła się tutaj.
        </p>
      ) : (
        <div className="grid gap-2">
          {linked.map((service) => {
            const costs = buildServiceCosts(service);
            return (
              <div
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{service.title || "Bez tytułu"}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {service.client.fullName}
                    {service.status ? ` · ${service.status}` : ""}
                    {service.createdAt ? ` · ${formatDate(service.createdAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums text-foreground">
                    {formatMoney(costs.actual.netTotal)} netto
                  </span>
                  <Button type="button" size="sm" variant="secondary" asChild>
                    <Link href={`/oferty/${service.id}`}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Otwórz
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" size="sm" variant="secondary" asChild className="w-fit">
        <Link href="/kalkulacje">Moduł kalkulacji sprzedażowych</Link>
      </Button>
    </div>
  );
}
