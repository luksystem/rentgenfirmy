"use client";

import { ChevronRight } from "lucide-react";
import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { Field } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import type { ContractModuleSettings } from "@/lib/contracts/module-settings";
import {
  allSelectionKeys,
  calculateContractTotals,
  calculatePaymentPlanFinalNet,
  calculatePaymentPlanInstallmentAmounts,
  calculateRowDiscountAmount,
  calculateTableDiscountAmount,
  calculateTableNetTotal,
  calculateVatBreakdown,
  contractRowSelectionKey,
} from "@/lib/contracts/totals";
import {
  CONTRACT_BUILDING_TYPES,
  CONTRACT_BUILDING_TYPE_LABELS,
  CONTRACT_OPTION_CATEGORY_LABELS,
  CONTRACT_PAYER_TYPES,
  CONTRACT_PAYER_TYPE_LABELS,
  isContractTableSection,
  isContractTextSection,
  type Contract,
  type ContractPaymentPlan,
  type ContractVatDeclaration,
} from "@/lib/contracts/types";
import { renderContractText } from "@/lib/contracts/render-text";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

/**
 * Treść dokumentu umowy — dane stron, sekcje (tekst/tabele), podsumowanie z rabatami, wariant
 * płatności, rozliczenie VAT wg deklaracji klienta i harmonogram, podpisy. Wszystko liczone w
 * netto aż do sekcji "Rozliczenie VAT" — tam dopiero dolicza się podatek wg typu płatnika.
 * Stylizowana jak jeden ciągły dokument. Współdzielona przez publiczną stronę podpisu
 * (`ClientContractPage`) i podgląd w panelu admina (`ContractPreviewDialog`).
 */
export function ContractDocumentView({
  contract,
  selectedKeys,
  onToggleSelection,
  company,
  selectedPaymentPlanId,
  onSelectPaymentPlan,
  vatDeclaration,
  onChangeVatDeclaration,
  moduleSettings,
}: {
  contract: Contract;
  selectedKeys: Set<string>;
  /** Gdy pominięte, checkboxy opcji/pozycji są tylko do odczytu (podgląd bez interakcji). */
  onToggleSelection?: (key: string, checked: boolean) => void;
  company?: CompanyProfileDocument | null;
  selectedPaymentPlanId?: string | null;
  /** Gdy pominięte, karty wariantów płatności są tylko do odczytu. */
  onSelectPaymentPlan?: (planId: string) => void;
  vatDeclaration: ContractVatDeclaration;
  /** Gdy pominięte, deklaracja VAT jest tylko do odczytu. */
  onChangeVatDeclaration?: (next: ContractVatDeclaration) => void;
  moduleSettings: ContractModuleSettings;
}) {
  const selectionOverrides = Object.fromEntries(Array.from(selectedKeys).map((key) => [key, true]));
  const effectivePlan: ContractPaymentPlan | null =
    contract.paymentPlans.find((plan) => plan.id === selectedPaymentPlanId) ?? contract.paymentPlans[0] ?? null;

  const totals = calculateContractTotals(contract.sections, { selectionOverrides, paymentPlan: effectivePlan });
  const vatBreakdown = calculateVatBreakdown(totals.totalNet, vatDeclaration, moduleSettings);
  const scaleToFinal = totals.totalNet > 0 ? vatBreakdown.finalTotal / totals.totalNet : 1;
  const scheduleAmounts = effectivePlan ? calculatePaymentPlanInstallmentAmounts(effectivePlan, totals) : [];

  const baseNet = totals.mainNet + totals.optionsNet;
  const totalDiscounts = totals.categoryDiscountNet + totals.planDiscountNet + vatBreakdown.inneDiscount;

  return (
    <div className="grid min-w-0 gap-3">
      {/* Pasek podsumowania — zakotwiczony u góry widoku */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-accent/30 bg-surface-elevated/95 px-4 py-2.5 shadow-soft backdrop-blur">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Cena bazowa (netto)</p>
          <p className="text-sm font-medium text-foreground">{formatMoney(baseNet)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Udzielone rabaty</p>
          <p className="text-sm font-medium text-emerald-400">
            {totalDiscounts > 0 ? `−${formatMoney(totalDiscounts)}` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted">Cena końcowa</p>
          <p className="text-base font-bold text-accent">{formatMoney(vatBreakdown.finalTotal)}</p>
        </div>
      </div>

      <div className="shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-surface-elevated shadow-soft print:rounded-none print:border-0 print:shadow-none">
        {/* Letterhead — strony umowy */}
        <div className="border-b border-border/60 bg-gradient-to-br from-accent-soft/25 via-surface-muted/20 to-transparent p-5 sm:p-8">
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.displayName} className="mb-4 h-10 w-auto object-contain" />
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{contract.title || "Umowa"}</h1>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Wykonawca</p>
              <p className="mt-1 font-medium text-foreground">{company?.displayName || "—"}</p>
              {company?.footerLines.map((line) => (
                <p key={line} className="text-sm text-muted">
                  {line}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Zamawiający</p>
              <p className="mt-1 font-medium text-foreground">{contract.client.fullName || "—"}</p>
              {contract.client.companyName ? <p className="text-sm text-muted">{contract.client.companyName}</p> : null}
              {contract.client.nip ? <p className="text-sm text-muted">NIP: {contract.client.nip}</p> : null}
              {contract.client.location ? <p className="text-sm text-muted">{contract.client.location}</p> : null}
              {[contract.client.email, contract.client.phone].filter(Boolean).join(" · ") ? (
                <p className="text-sm text-muted">{[contract.client.email, contract.client.phone].filter(Boolean).join(" · ")}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-8 p-5 sm:p-8">
          {/* Tekst i tabele umowy */}
          <div className="grid min-w-0 gap-4">
            {contract.sections.map((section) => {
              if (isContractTextSection(section)) {
                const renderedContent = renderContractText(section.content, contract);
                return (
                  <details
                    key={section.id}
                    className={cn(
                      "group min-w-0 border-l-2 pl-4",
                      section.struck ? "border-l-border/40" : "border-l-accent/40",
                    )}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted transition group-open:rotate-90" />
                      <span
                        className={cn(
                          "font-semibold text-foreground",
                          section.struck && "text-muted line-through",
                        )}
                      >
                        {section.title || "Treść umowy"}
                      </span>
                    </summary>
                    <p
                      className={cn(
                        "mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90",
                        section.struck && "text-muted line-through",
                      )}
                    >
                      {renderedContent}
                    </p>
                  </details>
                );
              }

              if (!isContractTableSection(section)) {
                return null;
              }

              const isOption = section.group === "option";
              const isDodatki = isOption && section.category === "dodatki";
              const wholeTableSelected = isOption && !isDodatki ? selectedKeys.has(section.id) : false;
              const activeRows = section.rows.filter((row) => row.active);
              const tableDiscount = calculateTableDiscountAmount(section);
              const categoryLabel = section.category ? CONTRACT_OPTION_CATEGORY_LABELS[section.category] : null;
              const anySelected = isDodatki
                ? activeRows.some((row) => selectedKeys.has(contractRowSelectionKey(section.id, row.id)))
                : wholeTableSelected;

              return (
                <div
                  key={section.id}
                  className={cn(
                    "min-w-0 rounded-2xl border p-4 sm:p-5",
                    isOption
                      ? anySelected
                        ? "border-l-4 border-l-accent border-y-accent/40 border-r-accent/40 bg-accent-soft/10"
                        : "border-dashed border-border/70 bg-surface-muted/10 opacity-80"
                      : "border-border/60 bg-surface-muted/10",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{section.title || "Tabela pozycji"}</p>
                        {categoryLabel ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium",
                              anySelected ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted",
                            )}
                          >
                            {categoryLabel}
                            {!isDodatki && section.categoryDiscountPercent > 0 ? ` — rabat ${section.categoryDiscountPercent}%` : ""}
                          </span>
                        ) : null}
                      </div>
                      {section.description ? <p className="mt-1 text-sm text-muted">{section.description}</p> : null}
                    </div>
                    {isOption && !isDodatki ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={wholeTableSelected}
                          disabled={!onToggleSelection}
                          onChange={(event) => onToggleSelection?.(section.id, event.target.checked)}
                          className="h-4 w-4 rounded border-border"
                        />
                        Dołącz do umowy
                      </label>
                    ) : null}
                  </div>

                  {activeRows.length > 0 ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[460px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-surface-muted/40 text-left text-[11px] uppercase tracking-wide text-muted">
                            {isDodatki ? <th className="w-8 py-1.5 pl-2" /> : null}
                            <th className="py-1.5 pr-2 font-medium">Pozycja</th>
                            <th className="py-1.5 pr-2 text-right font-medium">Ilość</th>
                            <th className="py-1.5 pr-2 text-right font-medium">Cena netto</th>
                            <th className="py-1.5 pr-2 text-right font-medium">Rabat</th>
                            <th className="py-1.5 pr-2 text-right font-medium">Wartość netto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeRows.map((row) => {
                            const discount = calculateRowDiscountAmount(row);
                            const rowKey = contractRowSelectionKey(section.id, row.id);
                            const rowSelected = isDodatki ? selectedKeys.has(rowKey) : true;
                            return (
                              <tr
                                key={row.id}
                                className={cn(
                                  "border-b border-border/40 last:border-0 even:bg-surface-muted/10",
                                  isDodatki && !rowSelected && "opacity-60",
                                )}
                              >
                                {isDodatki ? (
                                  <td className="py-1.5 pl-2">
                                    <input
                                      type="checkbox"
                                      checked={rowSelected}
                                      disabled={!onToggleSelection}
                                      onChange={(event) => onToggleSelection?.(rowKey, event.target.checked)}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                  </td>
                                ) : null}
                                <td className="max-w-[220px] break-words py-1.5 pr-2 text-foreground/90">
                                  {row.name}
                                  {row.showDescription && row.description ? (
                                    <span className="block text-xs text-muted">{row.description}</span>
                                  ) : null}
                                </td>
                                <td className="py-1.5 pr-2 text-right tabular-nums text-muted">
                                  {row.quantity} {row.unit}
                                </td>
                                <td className="py-1.5 pr-2 text-right tabular-nums text-muted">
                                  {formatMoney(row.netUnitPrice)}
                                </td>
                                <td className="py-1.5 pr-2 text-right tabular-nums text-muted">
                                  {discount > 0 ? `−${formatMoney(discount)}` : "—"}
                                </td>
                                <td className="py-1.5 pr-2 text-right tabular-nums font-medium text-foreground">
                                  {formatMoney(computeFixedPriceRowNetValue(row))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <p className="mt-3 text-right text-sm text-muted">
                    Suma tabeli netto: <span className="font-semibold text-foreground">{formatMoney(calculateTableNetTotal(section))}</span>
                    {tableDiscount > 0 ? (
                      <span className="ml-2 text-xs text-muted">(w tym rabat na pozycjach: {formatMoney(tableDiscount)})</span>
                    ) : null}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Podsumowanie (netto) */}
          <div className="min-w-0 rounded-2xl border border-accent/30 bg-accent-soft/10 p-4 sm:p-5">
            <p className="font-semibold text-foreground">Podsumowanie (netto)</p>
            <div className="mt-3 grid gap-1.5 text-sm">
              {contract.sections.map((section) => {
                if (!isContractTableSection(section)) {
                  return null;
                }
                const isDodatki = section.group === "option" && section.category === "dodatki";
                const included = section.group === "main"
                  ? true
                  : isDodatki
                    ? section.rows.some((row) => row.active && selectedKeys.has(contractRowSelectionKey(section.id, row.id)))
                    : selectedKeys.has(section.id);
                if (!included) {
                  return null;
                }
                const includedNet = isDodatki
                  ? section.rows
                      .filter((row) => row.active && selectedKeys.has(contractRowSelectionKey(section.id, row.id)))
                      .reduce((sum, row) => sum + computeFixedPriceRowNetValue(row), 0)
                  : calculateTableNetTotal(section);
                return (
                  <div key={section.id} className="flex items-center justify-between gap-3">
                    <span className="text-foreground/90">
                      {section.title || "Tabela pozycji"}
                      {section.category ? (
                        <span className="text-xs text-muted"> ({CONTRACT_OPTION_CATEGORY_LABELS[section.category]})</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-muted">{formatMoney(includedNet)}</span>
                  </div>
                );
              })}
              {totals.itemDiscountNet > 0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-1.5">
                  <span className="text-foreground/90">Rabat na pozycjach</span>
                  <span className="tabular-nums text-muted">−{formatMoney(totals.itemDiscountNet)}</span>
                </div>
              ) : null}
              {totals.categoryDiscountNet > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground/90">Rabat za wybrane kategorie</span>
                  <span className="tabular-nums text-muted">−{formatMoney(totals.categoryDiscountNet)}</span>
                </div>
              ) : null}
              {effectivePlan && effectivePlan.discountPercent > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground/90">
                    Rabat za wariant płatności „{effectivePlan.label}” ({effectivePlan.discountPercent}%)
                  </span>
                  <span className="tabular-nums text-muted">−{formatMoney(totals.planDiscountNet)}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 border-t border-accent/30 pt-3">
              <p className="text-lg font-bold text-accent">Wartość umowy: {formatMoney(totals.totalNet)} netto</p>
              <p className="text-sm text-muted">VAT i ewentualny rabat „inne” — patrz sekcja Rozliczenie VAT poniżej.</p>
            </div>
          </div>

          {/* Sposób płatności — tylko gdy jest z czego wybierać */}
          {contract.paymentPlans.length > 1 ? (
            <div className="min-w-0">
              <p className="mb-3 font-semibold text-foreground">Wariant harmonogramu spłat</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {contract.paymentPlans.map((plan) => {
                  const isSelected = plan.id === effectivePlan?.id;
                  const finalNet = calculatePaymentPlanFinalNet(contract.sections, plan, { selectionOverrides });
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      disabled={!onSelectPaymentPlan}
                      onClick={() => onSelectPaymentPlan?.(plan.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        isSelected
                          ? "border-accent bg-accent-soft/15 ring-1 ring-accent/40"
                          : "border-border/70 bg-surface-muted/10 hover:border-accent/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{plan.label || "Wariant"}</p>
                        {plan.discountPercent > 0 ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                            −{plan.discountPercent}%
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {plan.installments.map((item) => `${item.percent}%`).join(" / ") || "Bez rat"}
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">{formatMoney(finalNet)} netto</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Rozliczenie VAT */}
          <div className="min-w-0 rounded-2xl border border-border/60 bg-surface-muted/10 p-4 sm:p-5">
            <p className="font-semibold text-foreground">Rozliczenie VAT</p>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTRACT_PAYER_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={!onChangeVatDeclaration}
                    onClick={() => onChangeVatDeclaration?.({ ...vatDeclaration, payerType: type })}
                    className={cn(
                      "rounded-xl border p-3 text-left text-sm transition",
                      vatDeclaration.payerType === type
                        ? "border-accent bg-accent-soft/15 text-foreground"
                        : "border-border/70 bg-surface-muted/10 text-muted hover:text-foreground",
                    )}
                  >
                    {CONTRACT_PAYER_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              {vatDeclaration.payerType === "osoba_prywatna" ? (
                <div className="grid gap-3 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CONTRACT_BUILDING_TYPES.map((buildingType) => (
                      <button
                        key={buildingType}
                        type="button"
                        disabled={!onChangeVatDeclaration}
                        onClick={() => onChangeVatDeclaration?.({ ...vatDeclaration, buildingType })}
                        className={cn(
                          "rounded-xl border p-3 text-left text-xs transition",
                          vatDeclaration.buildingType === buildingType
                            ? "border-accent bg-accent-soft/15 text-foreground"
                            : "border-border/70 bg-surface-muted/10 text-muted hover:text-foreground",
                        )}
                      >
                        {CONTRACT_BUILDING_TYPE_LABELS[buildingType]}
                      </button>
                    ))}
                  </div>
                  <Field label="Powierzchnia użytkowa (m²)" className="sm:max-w-xs">
                    <NumericInput
                      value={vatDeclaration.areaM2 ?? 0}
                      disabled={!onChangeVatDeclaration}
                      onChange={(value) => onChangeVatDeclaration?.({ ...vatDeclaration, areaM2: value > 0 ? value : null })}
                    />
                  </Field>
                  {vatBreakdown.needsAreaDeclaration ? (
                    <p className="text-xs text-amber-400">
                      Uzupełnij typ budynku i powierzchnię, żeby poprawnie wyliczyć VAT — do tego czasu liczone
                      konserwatywnie wg stawki 23%.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Field
                label={`% kwoty rozliczane jako „inne” — gotówka, 0% VAT, rabat ${moduleSettings.inneDiscountPercent}%`}
                className="sm:max-w-sm"
              >
                <NumericInput
                  value={vatDeclaration.innePercent}
                  disabled={!onChangeVatDeclaration}
                  onChange={(value) =>
                    onChangeVatDeclaration?.({ ...vatDeclaration, innePercent: Math.min(100, Math.max(0, value)) })
                  }
                />
              </Field>

              <div className="grid gap-1 rounded-xl border border-border/60 bg-surface-muted/20 p-3 text-sm">
                {vatBreakdown.inneNet > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-foreground/90">
                      Część „inne” (0% VAT, rabat {vatBreakdown.inneDiscountPercent}%)
                    </span>
                    <span className="tabular-nums text-foreground">{formatMoney(vatBreakdown.inneFinal)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground/90">
                    Część rozliczana normalnie (VAT {vatBreakdown.normalVatRatePercent}%)
                  </span>
                  <span className="tabular-nums text-foreground">{formatMoney(vatBreakdown.normalGross)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-1.5 text-base font-bold text-accent">
                  <span>Razem do zapłaty</span>
                  <span className="tabular-nums">{formatMoney(vatBreakdown.finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Harmonogram spłat wybranego wariantu, w kwotach po rozliczeniu VAT */}
          {effectivePlan && effectivePlan.installments.length > 0 ? (
            <div className="min-w-0">
              <p className="mb-2 font-semibold text-foreground">
                Harmonogram spłat
                {contract.paymentPlans.length > 1 ? ` — ${effectivePlan.label || "wybrany wariant"}` : ""}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-surface-muted/40 text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-1.5 pl-2 pr-2 font-medium">Rata</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Udział</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Kwota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleAmounts.map((item) => {
                      const amountFinal = roundToCents(item.amountNet * scaleToFinal);
                      const perMonthFinal = item.perMonthNet != null ? roundToCents(item.perMonthNet * scaleToFinal) : null;
                      return (
                        <tr key={item.id} className="border-b border-border/40 last:border-0 even:bg-surface-muted/10">
                          <td className="py-1.5 pl-2 pr-2 text-foreground/90">
                            {item.label || "Rata"}
                            {item.note ? <span className="block text-xs text-muted">{item.note}</span> : null}
                            {perMonthFinal != null ? (
                              <span className="block text-xs text-muted">
                                {item.splitOverMonths}× {formatMoney(perMonthFinal)} miesięcznie
                              </span>
                            ) : null}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums text-muted">{item.percent}%</td>
                          <td className="py-1.5 pr-2 text-right tabular-nums font-medium text-foreground">
                            {formatMoney(amountFinal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Podpisy */}
          {contract.clientSignature || contract.companySignature ? (
            <div className="grid gap-4 border-t border-border/50 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Zamawiający</p>
                {contract.clientSignature ? (
                  <>
                    <p className="mt-2 font-medium italic text-foreground">{contract.clientSignature.signerName}</p>
                    <p className="text-xs text-muted">{formatDateTime(contract.clientSignature.signedAt)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">Brak podpisu</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Wykonawca</p>
                {contract.companySignature ? (
                  <>
                    <p className="mt-2 font-medium italic text-foreground">{contract.companySignature.signerName}</p>
                    <p className="text-xs text-muted">{formatDateTime(contract.companySignature.signedAt)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">Brak podpisu</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

/** Wygodny re-eksport dla wywołujących, którzy chcą pełny zestaw kluczy "zaznacz wszystko" (podgląd admina). */
export { allSelectionKeys };
