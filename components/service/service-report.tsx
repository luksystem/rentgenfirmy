"use client";

import { useCallback, type ReactNode } from "react";
import { CompanyDocumentFooter } from "@/components/company/company-document-footer";
import { ServiceReportPhotosGrid } from "@/components/service/service-report-photos";
import { Button } from "@/components/ui/button";
import { RichHtml } from "@/components/ui/rich-html";
import { useCompanyProfile } from "@/lib/hooks/use-company-profile";
import { printServiceReport } from "@/lib/service/print-service-report";
import { resolveProjectLabel } from "@/lib/service/resolve-project-label";
import {
  buildServiceReportCosts,
  getAppliedDiscountDescription,
  getServiceCombinedBilling,
  getServiceReportBillingBreakdown,
  getServiceReportBillingDiscounts,
  getServiceReportDocumentMeta,
  getServiceReportMaterialsNote,
  getServiceReportPhotos,
  getServiceReportQuantitySections,
  getServiceReportWarrantyHoursRows,
  getServiceReportWorkNote,
  getServiceReportWorkTimeSections,
  hasAppliedDiscount,
  isServiceSettled,
} from "@/lib/service/report-document";
import {
  hasOptionalItems,
  optionalItemAmounts,
  type OptionalItemsBreakdown,
} from "@/lib/service/optional-items";
import {
  buildAccommodationsCompareRows,
  buildMaterialItemsCompareRows,
  buildMaterialsCompareRows,
  buildTripCountCompareRows,
  buildWorkTimeCompareRows,
  type ReportCompareRow,
} from "@/lib/service/report-compare-rows";
import { hasMaterialItems } from "@/lib/service/material-items";
import { FixedPriceOfferReport } from "@/components/service/fixed-price-offer-report";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type {
  ServiceCostBreakdown,
  ServiceDiscounts,
  ServiceMaterialItem,
  ServiceRecord,
} from "@/lib/service/types";
import { useAppStore } from "@/store/app-store";

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900">{value || "—"}</dd>
    </div>
  );
}

function ReportMajorSection({
  id,
  label,
  children,
  className,
}: {
  id?: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 border-t-2 border-zinc-900/90 px-6 py-7 sm:px-8", className)}
    >
      <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      {children}
    </section>
  );
}

function ReportSubsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="border-b border-zinc-200 pb-2 text-xs font-bold tracking-wide text-zinc-700">
        {title}
      </h3>
      {children}
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
  materialItems,
}: {
  breakdown: ServiceCostBreakdown;
  vatRate: number;
  percentDiscount: number;
  specialDiscountPln: number;
  emptyMessage: string;
  grossTotalLabel: string;
  /** Pozycje materiałowe do rozbicia wiersza "Materiały" na osobne pozycje. */
  materialItems?: ServiceMaterialItem[];
}) {
  const visibleMaterialItems = (materialItems ?? []).filter(
    (item) => item.billable && (item.title.trim() || item.netAmount > 0),
  );

  const rows = [
    { label: "Auto (kilometry)", value: breakdown.categories.car },
    { label: "Godziny w aucie", value: breakdown.categories.carHours },
    { label: "Praca", value: breakdown.categories.labor },
    ...(visibleMaterialItems.length === 0
      ? [{ label: "Materiały", value: breakdown.categories.materials }]
      : []),
    { label: "Noclegi", value: breakdown.categories.accommodations },
  ].filter((row) => row.value > 0);

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-zinc-900/80 text-left text-[10px] uppercase tracking-[0.08em] text-zinc-400">
          <th className="py-2.5 pr-4 font-bold">Pozycja</th>
          <th className="py-2.5 text-right font-bold">Kwota netto</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <tr key={row.label} className="border-b border-zinc-100">
              <td className="py-2.5 pr-4 text-zinc-700">{row.label}</td>
              <td className="py-2.5 text-right tabular-nums text-zinc-900">
                {formatMoney(row.value)}
              </td>
            </tr>
          ))
        ) : visibleMaterialItems.length === 0 ? (
          <tr className="border-b border-zinc-100">
            <td colSpan={2} className="py-3 text-zinc-500">
              {emptyMessage}
            </td>
          </tr>
        ) : null}
        {visibleMaterialItems.map((item) => (
          <tr key={item.id} className="border-b border-zinc-100">
            <td className="py-2.5 pr-4 pl-4 text-zinc-600">
              {item.title.trim() || "Materiał"}
              {item.quantity !== 1 ? ` × ${item.quantity}` : ""}
            </td>
            <td className="py-2.5 text-right tabular-nums text-zinc-900">
              {formatMoney(item.netAmount)}
            </td>
          </tr>
        ))}
        {visibleMaterialItems.length > 0 ? (
          <tr className="border-b border-zinc-100">
            <td className="py-2.5 pr-4 text-zinc-700">Materiały razem</td>
            <td className="py-2.5 text-right tabular-nums text-zinc-900">
              {formatMoney(breakdown.categories.materials)}
            </td>
          </tr>
        ) : null}
        <tr className="border-b border-zinc-100">
          <td className="py-2.5 pr-4 text-zinc-600">Suma netto przed rabatem</td>
          <td className="py-2.5 text-right tabular-nums font-medium text-zinc-900">
            {formatMoney(breakdown.subtotalBeforeDiscount)}
          </td>
        </tr>
        <tr className="border-b border-zinc-100">
          <td className="py-2.5 pr-4 font-medium text-zinc-700">
            Rabat procentowy ({percentDiscount}%)
          </td>
          <td className="py-2.5 text-right tabular-nums font-semibold text-zinc-900">
            {percentDiscount > 0 ? `−${formatMoney(breakdown.percentDiscountAmount)}` : "—"}
          </td>
        </tr>
        <tr className="border-b border-zinc-100">
          <td className="py-2.5 pr-4 font-medium text-zinc-700">Rabat specjalny</td>
          <td className="py-2.5 text-right tabular-nums font-semibold text-zinc-900">
            {specialDiscountPln > 0 ? `−${formatMoney(specialDiscountPln)}` : "—"}
          </td>
        </tr>
        <tr className="border-t-2 border-zinc-200">
          <td className="py-3 pr-4 font-bold text-zinc-900">Cena netto</td>
          <td className="py-3 text-right tabular-nums font-bold text-zinc-900">
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
          <td className="py-3 text-right tabular-nums text-base font-bold text-zinc-900">
            {formatMoney(breakdown.grossTotal)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function DiscountNote({
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
        "mb-5 border-l-2 pl-3 text-sm",
        active ? "border-zinc-900 text-zinc-800" : "border-zinc-200 text-zinc-500",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
        Przyznany rabat
      </p>
      <p className="mt-1 font-semibold">{description}</p>
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
    <div className="ml-auto max-w-md border-t-2 border-zinc-900/80 pt-1">
      <dl className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3">
          <dt className="text-zinc-600">Suma netto przed rabatem</dt>
          <dd className="font-medium tabular-nums text-zinc-900">
            {formatMoney(breakdown.subtotalBeforeDiscount)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-zinc-600">Rabat procentowy ({discounts.percentDiscount}%)</dt>
          <dd className="tabular-nums font-semibold text-zinc-900">
            {discounts.percentDiscount > 0
              ? `−${formatMoney(breakdown.percentDiscountAmount)}`
              : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3">
          <dt className="text-zinc-600">Rabat specjalny</dt>
          <dd className="tabular-nums font-semibold text-zinc-900">
            {discounts.specialDiscountPln > 0
              ? `−${formatMoney(discounts.specialDiscountPln)}`
              : "—"}
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
        <div className="flex items-center justify-between gap-4 border-t-2 border-zinc-900/80 pt-3 text-base font-bold">
          <dt className="text-zinc-900">{grossTotalLabel}</dt>
          <dd className="tabular-nums text-zinc-900">{formatMoney(breakdown.grossTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}

function OptionalItemsCostBlock({
  optional,
  combinedGrossTotal,
  grossTotalLabel,
}: {
  optional: OptionalItemsBreakdown;
  combinedGrossTotal: number;
  grossTotalLabel: string;
}) {
  if (optional.lines.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-bold text-zinc-900">Pozycje opcjonalne</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-900/80 text-left text-[10px] uppercase tracking-[0.08em] text-zinc-400">
            <th className="py-2 pr-4 font-bold">Pozycja</th>
            <th className="py-2 text-right font-bold">Netto</th>
            <th className="py-2 text-right font-bold">VAT</th>
            <th className="py-2 text-right font-bold">Brutto</th>
          </tr>
        </thead>
        <tbody>
          {optional.lines.map(({ item, vatAmount, grossAmount }) => (
            <tr key={item.id} className="border-b border-zinc-100">
              <td className="py-2 pr-4 text-zinc-800">{item.title}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(item.netAmount)}</td>
              <td className="py-2 text-right tabular-nums">
                {item.vatRate}% ({formatMoney(vatAmount)})
              </td>
              <td className="py-2 text-right tabular-nums font-medium">{formatMoney(grossAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto max-w-md border-t-2 border-zinc-900/80 pt-3">
        <div className="flex items-center justify-between gap-4 text-base font-bold">
          <span className="text-zinc-900">{grossTotalLabel} (z opcjami)</span>
          <span className="tabular-nums text-zinc-900">{formatMoney(combinedGrossTotal)}</span>
        </div>
      </div>
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
    <div className={cn("space-y-3", compact && "ml-auto max-w-lg")}>
      <h3 className="border-b border-zinc-200 pb-2 text-xs font-bold tracking-wide text-zinc-700">
        {title}
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-900/80 text-left text-[10px] uppercase tracking-[0.08em] text-zinc-400">
            <th className="py-2 pr-4 font-bold">Pozycja</th>
            <th className="py-2 text-right font-bold">
              {showComparison ? "Przewidywane" : valueHeader}
            </th>
            {showComparison ? (
              <th className="py-2 pl-4 text-right font-bold">Rozliczone</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-zinc-100">
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
    <div className="grid gap-0 border border-zinc-200 text-sm sm:grid-cols-3">
      {[
        {
          label: "Przewidywane koszty",
          value: `netto ${formatMoney(estimate.netTotal)} · brutto ${formatMoney(estimate.grossTotal)}`,
        },
        {
          label: "Rzeczywiste",
          value: `netto ${formatMoney(actual.netTotal)} · brutto ${formatMoney(actual.grossTotal)}`,
        },
        {
          label: "Różnica",
          value: `netto ${diffNet >= 0 ? "+" : ""}${formatMoney(diffNet)} · brutto ${diffGross >= 0 ? "+" : ""}${formatMoney(diffGross)}`,
        },
      ].map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "px-4 py-3",
            index < 2 && "border-b border-zinc-200 sm:border-b-0 sm:border-r sm:border-zinc-200",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
            {item.label}
          </p>
          <p className="mt-1.5 tabular-nums font-semibold text-zinc-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ClientPriceSummary({
  netTotal,
  grossTotal,
  grossTotalLabel,
}: {
  netTotal: number;
  grossTotal: number;
  grossTotalLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 px-6 py-5 sm:px-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
          Wartość wyceny
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          netto <span className="font-semibold text-zinc-900">{formatMoney(netTotal)}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
          {grossTotalLabel}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
          {formatMoney(grossTotal)}
        </p>
      </div>
    </div>
  );
}

export function ServiceReport({
  service,
  projectName,
  variant = "internal",
  optionalItemSelection,
}: {
  service: ServiceRecord;
  projectName?: string;
  variant?: "internal" | "client";
  optionalItemSelection?: ReadonlySet<string>;
}) {
  const projects = useAppStore((state) => state.projects);
  const { profile: companyProfile } = useCompanyProfile();
  const isFixedPrice = service.pricingModel === "fixed_price";
  const resolvedProjectName = resolveProjectLabel(service.projectId, projects, projectName);
  const settled = isServiceSettled(service);
  const meta = getServiceReportDocumentMeta(service);
  const costs = buildServiceReportCosts(service);
  const billing = getServiceReportBillingBreakdown(service, costs);
  const combined = getServiceCombinedBilling(service, optionalItemSelection ?? null);
  const billingDiscounts = getServiceReportBillingDiscounts(service);
  const workNote = getServiceReportWorkNote(service, settled);
  const materialsNote = getServiceReportMaterialsNote(service, settled);
  const reportPhotos = getServiceReportPhotos(service, settled);
  const workTimeSections = getServiceReportWorkTimeSections(service);
  const quantitySections = getServiceReportQuantitySections(service);
  const workTimeRows = [
    ...buildTripCountCompareRows(
      quantitySections.predicted.tripCount,
      quantitySections.actual.tripCount,
    ),
    ...buildWorkTimeCompareRows(
      workTimeSections.predicted,
      workTimeSections.actual,
      meta.showDetailedCosts,
    ),
  ];
  const materialsRows =
    hasMaterialItems(service.estimate.materialItems) || hasMaterialItems(service.actual.materialItems)
      ? buildMaterialItemsCompareRows(service.estimate.materialItems, service.actual.materialItems)
      : buildMaterialsCompareRows(
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
  const warrantyRows = getServiceReportWarrantyHoursRows(service);

  const handlePrint = useCallback(() => {
    void printServiceReport(service, resolvedProjectName, companyProfile);
  }, [companyProfile, resolvedProjectName, service]);

  if (isFixedPrice) {
    return <FixedPriceOfferReport service={service} variant={variant} />;
  }

  const detailsTables = (
    <div className="grid gap-8">
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
      {warrantyRows.length > 0 ? (
        <ReportCompareTable
          title="Prace w ramach gwarancji"
          rows={warrantyRows}
          showComparison={false}
          valueHeader="Godziny"
          compact={!meta.showDetailedCosts}
        />
      ) : null}
    </div>
  );

  const reportDocument = (
    <article className="service-report-document mx-auto w-full max-w-[min(100%,210mm)] overflow-hidden rounded-xl bg-white text-zinc-900 shadow-lg ring-1 ring-zinc-200">
      <header className="border-b-2 border-zinc-900 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              {companyProfile.displayName}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{meta.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{meta.subtitle}</p>
          </div>
          <dl className="grid gap-2 text-right text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                {meta.dateLabel}
              </dt>
              <dd className="font-semibold text-zinc-900">{formatDate(service.updatedAt)}</dd>
            </div>
            {variant === "internal" ? (
              <div>
                <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">Status</dt>
                <dd className="font-semibold text-zinc-900">{service.status}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      {variant === "client" ? (
        <ClientPriceSummary
          netTotal={combined.netTotal}
          grossTotal={combined.grossTotal}
          grossTotalLabel={meta.grossTotalLabel}
        />
      ) : null}

      <ReportMajorSection id={variant === "client" ? "offer-info" : undefined} label="Informacje">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-0">
          <section className="sm:pr-8">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Dane klienta</h2>
            <dl className="grid gap-4">
              <ReportField label="Imię i nazwisko" value={service.client.fullName} />
              <ReportField label="Obiekt / lokalizacja" value={service.client.location} />
              <ReportField label="E-mail" value={service.client.email} />
              <ReportField label="Telefon" value={service.client.phone} />
            </dl>
          </section>
          <section className="border-t border-zinc-200 pt-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Zgłoszenie</h2>
            <dl className="grid gap-4">
              <ReportField label="Tytuł" value={service.title} />
              <ReportField label="Typ serwisu" value={service.serviceType} />
              <ReportField label="Projekt" value={resolvedProjectName} />
              <ReportField label="Data utworzenia" value={formatDate(service.createdAt)} />
            </dl>
          </section>
        </div>
      </ReportMajorSection>

      <ReportMajorSection
        id={variant === "client" ? "offer-scope" : undefined}
        label="Zakres prac"
      >
        <div className="grid gap-8">
          <ReportSubsection title={meta.worksSectionTitle}>
            <RichHtml html={workNote} fallback="Brak opisu prac." className="text-zinc-800" />
          </ReportSubsection>
          <ReportSubsection title="Materiały">
            <RichHtml
              html={materialsNote}
              fallback="Brak informacji o materiałach."
              className="text-zinc-800"
            />
          </ReportSubsection>
          {reportPhotos.length ? (
            <ReportSubsection title="Zdjęcia">
              <ServiceReportPhotosGrid photos={reportPhotos} />
            </ReportSubsection>
          ) : null}
        </div>
      </ReportMajorSection>

      <ReportMajorSection
        id={variant === "client" ? "offer-details" : undefined}
        label="Szczegóły wyceny"
      >
        {variant === "client" && !meta.showDetailedCosts ? (
          <details className="group rounded-lg border border-zinc-200">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-800 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                Pokaż rozbicie pozycji
                <span className="text-xs font-normal text-zinc-500 group-open:hidden">
                  materiały, noclegi, czas pracy
                </span>
                <span className="hidden text-xs font-normal text-zinc-500 group-open:inline">
                  ukryj
                </span>
              </span>
            </summary>
            <div className="border-t border-zinc-200 px-4 py-5">{detailsTables}</div>
          </details>
        ) : (
          detailsTables
        )}
      </ReportMajorSection>

      <ReportMajorSection
        id={variant === "client" ? "offer-pricing" : undefined}
        label="Podsumowanie"
      >
        <h2 className="mb-4 text-sm font-bold text-zinc-900">{meta.costSectionTitle}</h2>
        <DiscountNote discounts={billingDiscounts} breakdown={billing} />
        {meta.showDetailedCosts ? (
          <CostTable
            breakdown={billing}
            vatRate={billingDiscounts.vatRate}
            percentDiscount={billingDiscounts.percentDiscount}
            specialDiscountPln={billingDiscounts.specialDiscountPln}
            emptyMessage={meta.emptyCostRowsMessage}
            grossTotalLabel={meta.grossTotalLabel}
            materialItems={settled ? service.actual.materialItems : service.estimate.materialItems}
          />
        ) : (
          <CompactCostSummary
            breakdown={billing}
            discounts={billingDiscounts}
            grossTotalLabel={meta.grossTotalLabel}
          />
        )}
        <OptionalItemsCostBlock
          optional={combined.optional}
          combinedGrossTotal={combined.grossTotal}
          grossTotalLabel={meta.grossTotalLabel}
        />
        {variant === "internal" && hasOptionalItems(service.optionalItems) ? (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Pozycje opcjonalne w ofercie</p>
            <ul className="mt-2 grid gap-2">
              {service.optionalItems
                .filter((item) => item.title.trim())
                .map((item) => {
                  const { grossAmount } = optionalItemAmounts(item);
                  return (
                    <li key={item.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {item.title}
                        {item.clientSelected ? " · wybrane przez klienta" : ""}
                        {item.billable ? " · w rozliczeniu" : ""}
                      </span>
                      <span className="tabular-nums font-medium">{formatMoney(grossAmount)}</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : null}
        {meta.showDetailedCosts && billing.kilometerZone > 0 ? (
          <p className="mt-4 text-xs text-zinc-500">
            Strefa kilometrowa: {billing.kilometerZone} · Sugerowane godziny w aucie:{" "}
            {billing.suggestedCarHoursFromZone}
          </p>
        ) : null}
      </ReportMajorSection>

      {meta.showComparison ? (
        <ReportMajorSection label="Porównanie">
          <h2 className="mb-4 text-sm font-bold text-zinc-900">
            Porównanie z przewidywanymi kosztami
          </h2>
          <ComparisonMini estimate={costs.estimate} actual={costs.actual} />
        </ReportMajorSection>
      ) : null}

      <CompanyDocumentFooter profile={companyProfile} />
    </article>
  );

  if (variant === "client") {
    return reportDocument;
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface-muted/30 p-3 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
          <p className="text-sm text-muted">{meta.previewDescription}</p>
        </div>
        <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={handlePrint}>
          Drukuj / eksportuj PDF
        </Button>
        <p className="hidden text-xs text-muted sm:block sm:basis-full">
          Otworzy się podgląd raportu w nowej karcie. W oknie druku możesz wyłączyć „Nagłówki i
          stopki” przeglądarki, jeśli widzisz pustą stronę z samą datą i numerem strony.
        </p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
        {reportDocument}
      </div>
    </div>
  );
}
