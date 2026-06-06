"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { printServiceReport } from "@/lib/service/print-service-report";
import {
  buildServiceReportCosts,
  getAppliedDiscountDescription,
  getServiceReportBillingBreakdown,
  getServiceReportBillingDiscounts,
  getServiceReportDocumentMeta,
  getServiceReportMaterialsNote,
  getServiceReportQuantitySections,
  getServiceReportWorkNote,
  getServiceReportWorkTimeSections,
  hasAppliedDiscount,
  isServiceSettled,
} from "@/lib/service/report-document";
import {
  buildAccommodationsCompareRows,
  buildMaterialsCompareRows,
  buildWorkTimeCompareRows,
  type ReportCompareRow,
} from "@/lib/service/report-compare-rows";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown, ServiceDiscounts, ServiceRecord } from "@/lib/service/types";

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
  emptyMessage,
  grossTotalLabel,
}: {
  breakdown: ServiceCostBreakdown;
  vatRate: number;
  percentDiscount: number;
  specialDiscountPln: number;
  emptyMessage: string;
  grossTotalLabel: string;
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
              {emptyMessage}
            </td>
          </tr>
        )}
        <tr className="border-b border-zinc-100">
          <td className="py-2.5 pr-4 text-zinc-600">Suma netto przed rabatem</td>
          <td className="py-2.5 text-right tabular-nums font-medium text-zinc-900">
            {formatMoney(breakdown.subtotalBeforeDiscount)}
          </td>
        </tr>
        {percentDiscount > 0 ? (
          <tr className="border-b border-emerald-100 bg-emerald-50/80">
            <td className="py-2.5 pr-4 font-medium text-emerald-900">
              Rabat procentowy ({percentDiscount}%)
            </td>
            <td className="py-2.5 text-right tabular-nums font-semibold text-emerald-700">
              −{formatMoney(breakdown.percentDiscountAmount)}
            </td>
          </tr>
        ) : (
          <tr className="border-b border-zinc-100">
            <td className="py-2.5 pr-4 text-zinc-600">Rabat procentowy (0%)</td>
            <td className="py-2.5 text-right tabular-nums text-zinc-500">—</td>
          </tr>
        )}
        {specialDiscountPln > 0 ? (
          <tr className="border-b border-emerald-100 bg-emerald-50/80">
            <td className="py-2.5 pr-4 font-medium text-emerald-900">Rabat specjalny</td>
            <td className="py-2.5 text-right tabular-nums font-semibold text-emerald-700">
              −{formatMoney(specialDiscountPln)}
            </td>
          </tr>
        ) : (
          <tr className="border-b border-zinc-100">
            <td className="py-2.5 pr-4 text-zinc-600">Rabat specjalny</td>
            <td className="py-2.5 text-right tabular-nums text-zinc-500">—</td>
          </tr>
        )}
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
          <td className="py-3 pr-4 text-base font-bold text-zinc-900">{grossTotalLabel}</td>
          <td className="py-3 text-right tabular-nums text-base font-bold text-blue-700">
            {formatMoney(breakdown.grossTotal)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function DiscountBanner({
  discounts,
  breakdown,
}: {
  discounts: ServiceDiscounts;
  breakdown: ServiceCostBreakdown;
}) {
  const description = getAppliedDiscountDescription(discounts, breakdown);
  const active = hasAppliedDiscount(discounts);

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border px-4 py-3 text-sm",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-zinc-200 bg-zinc-50 text-zinc-700",
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Przyznany rabat</p>
      <p className={cn("mt-1 font-semibold", active && "text-emerald-900")}>{description}</p>
    </div>
  );
}

function CompactCostSummary({
  breakdown,
  discounts,
  grossTotalLabel,
}: {
  breakdown: ServiceCostBreakdown;
  discounts: ServiceDiscounts;
  grossTotalLabel: string;
}) {
  return (
    <div className="ml-auto max-w-md rounded-lg border border-zinc-200 bg-white px-4 py-5">
      <dl className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-zinc-600">Suma netto przed rabatem</dt>
          <dd className="font-medium tabular-nums text-zinc-900">
            {formatMoney(breakdown.subtotalBeforeDiscount)}
          </dd>
        </div>
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-md px-2 py-1.5",
            discounts.percentDiscount > 0 ? "bg-emerald-50" : "",
          )}
        >
          <dt className={discounts.percentDiscount > 0 ? "font-medium text-emerald-900" : "text-zinc-600"}>
            Rabat procentowy ({discounts.percentDiscount}%)
          </dt>
          <dd
            className={cn(
              "tabular-nums font-semibold",
              discounts.percentDiscount > 0 ? "text-emerald-700" : "text-zinc-500",
            )}
          >
            {discounts.percentDiscount > 0
              ? `−${formatMoney(breakdown.percentDiscountAmount)}`
              : "—"}
          </dd>
        </div>
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-md px-2 py-1.5",
            discounts.specialDiscountPln > 0 ? "bg-emerald-50" : "",
          )}
        >
          <dt
            className={
              discounts.specialDiscountPln > 0 ? "font-medium text-emerald-900" : "text-zinc-600"
            }
          >
            Rabat specjalny
          </dt>
          <dd
            className={cn(
              "tabular-nums font-semibold",
              discounts.specialDiscountPln > 0 ? "text-emerald-700" : "text-zinc-500",
            )}
          >
            {discounts.specialDiscountPln > 0 ? `−${formatMoney(discounts.specialDiscountPln)}` : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-3">
          <dt className="font-semibold text-zinc-900">Cena netto</dt>
          <dd className="font-semibold tabular-nums text-zinc-900">
            {formatMoney(breakdown.netTotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-zinc-600">VAT {discounts.vatRate}%</dt>
          <dd className="font-medium tabular-nums text-zinc-900">
            {formatMoney(breakdown.vatAmount)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-3 text-base font-bold">
          <dt className="text-zinc-900">{grossTotalLabel}</dt>
          <dd className="tabular-nums text-blue-700">{formatMoney(breakdown.grossTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}

function ReportCompareTable({
  title,
  rows,
  showComparison,
  valueHeader = "Wartość",
  compact = false,
}: {
  title: string;
  rows: ReportCompareRow[];
  showComparison: boolean;
  valueHeader?: string;
  compact?: boolean;
}) {
  return (
    <section className="border-t border-zinc-100 px-6 py-5 sm:px-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-700">{title}</h2>
      <div className={cn(compact && "ml-auto max-w-lg")}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="py-2 pr-4 font-semibold">Pozycja</th>
              <th className="py-2 text-right font-semibold">
                {showComparison ? "Przewidywane" : valueHeader}
              </th>
              {showComparison ? (
                <th className="py-2 pl-4 text-right font-semibold">Rozliczone</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={cn(
                  "border-b border-zinc-100",
                  row.group && "border-zinc-200",
                )}
              >
                <td
                  className={cn(
                    "py-2.5 pr-4",
                    row.group ? "font-semibold text-zinc-900" : "pl-4 text-zinc-600",
                  )}
                >
                  {row.label}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right tabular-nums",
                    row.group ? "font-semibold text-zinc-900" : "text-zinc-900",
                  )}
                >
                  {row.predicted}
                </td>
                {showComparison ? (
                  <td
                    className={cn(
                      "py-2.5 pl-4 text-right tabular-nums",
                      row.group ? "font-semibold text-zinc-900" : "text-zinc-900",
                    )}
                  >
                    {row.settled}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Przewidywane koszty</p>
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
  variant = "internal",
}: {
  service: ServiceRecord;
  projectName?: string;
  variant?: "internal" | "client";
}) {
  const settled = isServiceSettled(service);
  const meta = getServiceReportDocumentMeta(service);
  const costs = buildServiceReportCosts(service);
  const billing = getServiceReportBillingBreakdown(service, costs);
  const billingDiscounts = getServiceReportBillingDiscounts(service);
  const workNote = getServiceReportWorkNote(service, settled);
  const materialsNote = getServiceReportMaterialsNote(service, settled);
  const workTimeSections = getServiceReportWorkTimeSections(service);
  const quantitySections = getServiceReportQuantitySections(service);
  const workTimeRows = buildWorkTimeCompareRows(
    workTimeSections.predicted,
    workTimeSections.actual,
    meta.showDetailedCosts,
  );
  const materialsRows = buildMaterialsCompareRows(
    quantitySections.predicted.materialsCost,
    quantitySections.actual.materialsCost,
  );
  const accommodationsRows = buildAccommodationsCompareRows(
    quantitySections.predicted.accommodations,
    quantitySections.actual.accommodations,
  );
  const workTimeTitle = workTimeSections.showComparison
    ? "Czas pracy"
    : "Przewidywany czas pracy";

  const handlePrint = useCallback(() => {
    printServiceReport(service, projectName);
  }, [service, projectName]);

  const reportDocument = (
    <article className="service-report-document mx-auto max-w-[210mm] overflow-hidden rounded-lg bg-white text-zinc-900 shadow-lg ring-1 ring-zinc-200">
        <header className="border-b-4 border-blue-600 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Rentgen firmy
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
                {meta.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">{meta.subtitle}</p>
            </div>
            <dl className="grid gap-1 text-right text-sm sm:text-base">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{meta.dateLabel}</dt>
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
            {meta.worksSectionTitle}
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
        </section>

        <ReportCompareTable
          title="Koszty materiałów"
          rows={materialsRows}
          showComparison={quantitySections.showComparison}
          valueHeader="Koszt"
          compact={!meta.showDetailedCosts}
        />

        {!meta.showDetailedCosts ? (
          <ReportCompareTable
            title="Noclegi"
            rows={accommodationsRows}
            showComparison={quantitySections.showComparison}
            valueHeader="Ilość"
            compact
          />
        ) : null}

        <ReportCompareTable
          title={workTimeTitle}
          rows={workTimeRows}
          showComparison={workTimeSections.showComparison}
          valueHeader="Ilość"
          compact={!meta.showDetailedCosts}
        />

        <section className="border-t border-zinc-200 bg-zinc-50/80 px-6 py-6 sm:px-8">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-zinc-700">
            {meta.costSectionTitle}
          </h2>
          <DiscountBanner discounts={billingDiscounts} breakdown={billing} />
          {meta.showDetailedCosts ? (
            <CostTable
              breakdown={billing}
              vatRate={billingDiscounts.vatRate}
              percentDiscount={billingDiscounts.percentDiscount}
              specialDiscountPln={billingDiscounts.specialDiscountPln}
              emptyMessage={meta.emptyCostRowsMessage}
              grossTotalLabel={meta.grossTotalLabel}
            />
          ) : (
            <CompactCostSummary
              breakdown={billing}
              discounts={billingDiscounts}
              grossTotalLabel={meta.grossTotalLabel}
            />
          )}
          {meta.showDetailedCosts && billing.kilometerZone > 0 ? (
            <p className="mt-4 text-xs text-zinc-500">
              Strefa kilometrowa: {billing.kilometerZone} · Sugerowane godziny w aucie:{" "}
              {billing.suggestedCarHoursFromZone}
            </p>
          ) : null}
        </section>

        {meta.showComparison ? (
          <section className="border-t border-zinc-100 px-6 py-5 sm:px-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-700">
              Porównanie z przewidywanymi kosztami
            </h2>
            <ComparisonMini estimate={costs.estimate} actual={costs.actual} />
          </section>
        ) : null}

        <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-400 sm:px-8">
          Dokument wygenerowany w module Serwis · Rentgen firmy
        </footer>
      </article>
  );

  if (variant === "client") {
    return reportDocument;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
          <p className="text-sm text-muted">{meta.previewDescription}</p>
        </div>
        <Button type="button" onClick={handlePrint}>
          Drukuj / eksportuj PDF
        </Button>
        <p className="text-xs text-muted">
          Otworzy się podgląd raportu w nowej karcie. W oknie druku możesz wyłączyć „Nagłówki i stopki”
          przeglądarki, jeśli widzisz pustą stronę z samą datą i numerem strony.
        </p>
      </div>
      {reportDocument}
    </div>
  );
}
