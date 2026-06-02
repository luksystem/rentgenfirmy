"use client";

import { ServiceComparisonTable } from "@/components/service/service-comparison-table";
import { ServiceCostBreakdownPanel } from "@/components/service/service-cost-breakdown";
import { Button } from "@/components/ui/button";
import { buildServiceCosts } from "@/store/service-store";
import { formatDate, formatMoney } from "@/lib/utils";
import type { ServiceRecord } from "@/lib/service/types";

export function ServiceReport({
  service,
  projectName,
}: {
  service: ServiceRecord;
  projectName?: string;
}) {
  const costs = buildServiceCosts(service);

  return (
    <div className="service-report space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="text-xl font-semibold">Raport serwisowy</h2>
        <Button type="button" onClick={() => window.print()}>
          Drukuj / eksportuj PDF
        </Button>
      </div>

      <section className="grid gap-2 rounded-xl border border-border p-4">
        <h3 className="font-semibold">1. Dane klienta</h3>
        <p>{service.client.fullName}</p>
        <p>{service.client.location}</p>
        <p>{service.client.email}</p>
        <p>{service.client.phone}</p>
      </section>

      <section className="grid gap-2 rounded-xl border border-border p-4">
        <h3 className="font-semibold">2. Dane zgłoszenia</h3>
        <p>
          <span className="text-muted">Tytuł:</span> {service.title}
        </p>
        <p>
          <span className="text-muted">Typ:</span> {service.serviceType}
        </p>
        <p>
          <span className="text-muted">Projekt:</span>{" "}
          {projectName ?? (service.projectId ? "—" : "Bez projektu")}
        </p>
        <p>
          <span className="text-muted">Status:</span> {service.status}
        </p>
        <p>
          <span className="text-muted">Utworzono:</span> {formatDate(service.createdAt)}
        </p>
      </section>

      <section className="grid gap-2 rounded-xl border border-border p-4">
        <h3 className="font-semibold">3. Raport z prac</h3>
        <p className="whitespace-pre-wrap text-sm">
          {service.actual.workReportNote || service.estimate.workReportNote || "—"}
        </p>
      </section>

      <section className="grid gap-2 rounded-xl border border-border p-4">
        <h3 className="font-semibold">4. Użyte materiały</h3>
        <p className="whitespace-pre-wrap text-sm">
          {service.actual.materialsNote || service.estimate.materialsNote || "—"}
        </p>
        <p>
          Koszt materiałów (rozliczane): {formatMoney(costs.actual.categories.materials)}
        </p>
      </section>

      <section className="grid gap-4">
        <h3 className="font-semibold">5. Wyliczenia kosztów (rzeczywiste)</h3>
        <ServiceCostBreakdownPanel
          title="Koszty rzeczywiste"
          breakdown={costs.actual}
          discounts={service.discounts}
          kilometerZone={costs.actual.kilometerZone}
          suggestedCarHours={costs.actual.suggestedCarHoursFromZone}
        />
      </section>

      <section className="grid gap-4">
        <h3 className="font-semibold">6. Porównanie estymacji i rzeczywistości</h3>
        <ServiceComparisonTable estimate={costs.estimate} actual={costs.actual} />
        <p className="text-sm text-muted">
          Estymacja brutto: {formatMoney(costs.estimate.grossTotal)} · Rzeczywiste brutto:{" "}
          {formatMoney(costs.actual.grossTotal)} · Różnica brutto:{" "}
          {formatMoney(costs.actual.grossTotal - costs.estimate.grossTotal)}
        </p>
      </section>
    </div>
  );
}
