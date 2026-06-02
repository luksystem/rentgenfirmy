"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { printServiceReport } from "@/lib/service/print-service-report";
import { buildServiceCosts } from "@/store/service-store";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown, ServiceRecord } from "@/lib/service/types";

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900">{value || "—"}</dd>
    </div>
  );
}

function CostTable({
  breakdown,
  vatRate,
  percentDiscount,
  specialDiscountPln,
}: {
  breakdown: ServiceCostBreakdown;
  vatRate: number;
  percentDiscount: number;
  specialDiscountPln: number;
}) {
  const rows = [
    { label: "Auto (kilometry)", value: breakdown.categories.car },
    { label: "Godziny w aucie", value: breakdown.categories.carHours },
    { label: "Praca", value: breakdown.categories.labor },
    { label: "Materiały", value: breakdown.categories.materials },
    { label: "Noclegi", value: breakdown.categories.accommodations },
  ].filter((row) => row.value > 0);

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500">
          <th className="py-2 pr-4 font-semibold">Pozycja</th>
          <th className="py-2 text-right font-semibold">Kwota netto</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <tr key={row.label} className="border-b border-zinc-100">
              <td className="py-2.5 pr-4 text-zinc-700">{row.label}</td>
              <td className="py-2.5 text-right tabular-nums text-zinc-900">{formatMoney(row.value)}</td>
            </tr>
          ))
        ) : (
          <tr className="border-b border-zinc-100">
            <td colSpan={2} className="py-3 text-zinc-500">
              Brak pozycji do rozliczenia
            </td>
          </tr>
        )}
        <tr className="border-b border-zinc-100">
          <td className="py-2.5 pr-4 text-zinc-600">Suma bez rabatu</td>
          <td className="py-2.5 text-right tabular-nums font-medium text-zinc-900">
            {formatMoney(breakdown.subtotalBeforeDiscount)}
          </td>
        </tr>
        {percentDiscount > 0 ? (
          <tr className="border-b border-zinc-100">
            <td className="py-2.5 pr-4 text-zinc-600">Rabat {percentDiscount}%</td>
            <td className="py-2.5 text-right tabular-nums text-rose-700">
              −{formatMoney(breakdown.percentDiscountAmount)}
            </td>
          </tr>
        ) : null}
        {specialDiscountPln > 0 ? (
          <tr className="border-b border-zinc-100">
            <td className="py-2.5 pr-4 text-zinc-600">Rabat specjalny</td>
            <td className="py-2.5 text-right tabular-nums text-rose-700">
              −{formatMoney(specialDiscountPln)}
            </td>
          </tr>
        ) : null}
        <tr className="border-b border-zinc-200">
          <td className="py-3 pr-4 font-semibold text-zinc-900">Cena netto</td>
          <td className="py-3 text-right tabular-nums font-semibold text-zinc-900">
            {formatMoney(breakdown.netTotal)}
          </td>
        </tr>
        <tr className="border-b border-zinc-100">
          <td className="py-2.5 pr-4 text-zinc-600">VAT {vatRate}%</td>
          <td className="py-2.5 text-right tabular-nums text-zinc-900">
            {formatMoney(breakdown.vatAmount)}
          </td>
        </tr>
        <tr>
          <td className="py-3 pr-4 text-base font-bold text-zinc-900">Cena brutto do faktury</td>
          <td className="py-3 text-right tabular-nums text-base font-bold text-blue-700">
            {formatMoney(breakdown.grossTotal)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ComparisonMini({
  estimate,
  actual,
}: {
  estimate: ServiceCostBreakdown;
  actual: ServiceCostBreakdown;
}) {
  const diffNet = actual.netTotal - estimate.netTotal;
  const diffGross = actual.grossTotal - estimate.grossTotal;

  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm sm:grid-cols-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Estymacja</p>
        <p className="mt-1 tabular-nums text-zinc-900">
          netto {formatMoney(estimate.netTotal)} · brutto {formatMoney(estimate.grossTotal)}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Rzeczywiste</p>
        <p className="mt-1 tabular-nums text-zinc-900">
          netto {formatMoney(actual.netTotal)} · brutto {formatMoney(actual.grossTotal)}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Różnica</p>
        <p
          className={cn(
            "mt-1 tabular-nums font-medium",
            diffNet > 0 && "text-rose-700",
            diffNet < 0 && "text-emerald-700",
            diffNet === 0 && "text-zinc-700",
          )}
        >
          netto {diffNet >= 0 ? "+" : ""}
          {formatMoney(diffNet)} · brutto {diffGross >= 0 ? "+" : ""}
          {formatMoney(diffGross)}
        </p>
      </div>
    </div>
  );
}

export function ServiceReport({
  service,
  projectName,
}: {
  service: ServiceRecord;
  projectName?: string;
}) {
  const costs = buildServiceCosts(service);
  const actual = costs.actual;
  const workNote = service.actual.workReportNote || service.estimate.workReportNote;
  const materialsNote = service.actual.materialsNote || service.estimate.materialsNote;

  const handlePrint = useCallback(() => {
    printServiceReport(service, projectName);
  }, [service, projectName]);

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Raport serwisowy</h2>
          <p className="text-sm text-muted">Podgląd dokumentu do rozliczenia / faktury</p>
        </div>
        <Button type="button" onClick={handlePrint}>
          Drukuj / eksportuj PDF
        </Button>
        <p className="text-xs text-muted">
          Otworzy się podgląd raportu w nowej karcie. W oknie druku możesz wyłączyć „Nagłówki i stopki”
          przeglądarki, jeśli widzisz pustą stronę z samą datą i numerem strony.
        </p>
      </div>

      <article className="service-report-document mx-auto max-w-[210mm] overflow-hidden rounded-lg bg-white text-zinc-900 shadow-lg ring-1 ring-zinc-200">
        <header className="border-b-4 border-blue-600 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Rentgen firmy
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
                Raport serwisowy
              </h1>
              <p className="mt-1 text-sm text-zinc-500">Smart Home / BMS · rozliczenie serwisu</p>
            </div>
            <dl className="grid gap-1 text-right text-sm sm:text-base">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Data raportu</dt>
                <dd className="font-medium text-zinc-900">{formatDate(service.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Status</dt>
                <dd className="font-medium text-zinc-900">{service.status}</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <section>
            <h2 className="mb-3 border-b border-zinc-200 pb-2 text-xs font-bold uppercase tracking-wide text-zinc-700">
              Dane klienta
            </h2>
            <dl className="grid gap-3">
              <ReportField label="Imię i nazwisko" value={service.client.fullName} />
              <ReportField label="Obiekt / lokalizacja" value={service.client.location} />
              <ReportField label="E-mail" value={service.client.email} />
              <ReportField label="Telefon" value={service.client.phone} />
            </dl>
          </section>

          <section>
            <h2 className="mb-3 border-b border-zinc-200 pb-2 text-xs font-bold uppercase tracking-wide text-zinc-700">
              Zgłoszenie
            </h2>
            <dl className="grid gap-3">
              <ReportField label="Tytuł" value={service.title} />
              <ReportField label="Typ serwisu" value={service.serviceType} />
              <ReportField
                label="Projekt"
                value={projectName ?? (service.projectId ? "—" : "Bez projektu")}
              />
              <ReportField label="Data utworzenia" value={formatDate(service.createdAt)} />
            </dl>
          </section>
        </div>

        <section className="border-t border-zinc-100 px-6 py-5 sm:px-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-700">
            Wykonane prace
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">
            {workNote || "Brak opisu prac."}
          </p>
        </section>

        <section className="border-t border-zinc-100 px-6 py-5 sm:px-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-700">
            Materiały
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">
            {materialsNote || "Brak informacji o materiałach."}
          </p>
          {actual.categories.materials > 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Koszt materiałów (rozliczane):{" "}
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatMoney(actual.categories.materials)}
              </span>
            </p>
          ) : null}
        </section>

        <section className="border-t border-zinc-200 bg-zinc-50/80 px-6 py-6 sm:px-8">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-zinc-700">
            Rozliczenie kosztów serwisu
          </h2>
          <CostTable
            breakdown={actual}
            vatRate={service.discounts.vatRate}
            percentDiscount={service.discounts.percentDiscount}
            specialDiscountPln={service.discounts.specialDiscountPln}
          />
          {actual.kilometerZone > 0 ? (
            <p className="mt-4 text-xs text-zinc-500">
              Strefa kilometrowa: {actual.kilometerZone} · Sugerowane godziny w aucie:{" "}
              {actual.suggestedCarHoursFromZone}
            </p>
          ) : null}
        </section>

        <section className="border-t border-zinc-100 px-6 py-5 sm:px-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-700">
            Porównanie z estymacją
          </h2>
          <ComparisonMini estimate={costs.estimate} actual={actual} />
        </section>

        <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-400 sm:px-8">
          Dokument wygenerowany w module Serwis · Rentgen firmy
        </footer>
      </article>
    </div>
  );
}
