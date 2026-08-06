"use client";

import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import {
  calculateContractTotals,
  calculatePaymentPlanFinalGross,
  calculatePaymentPlanInstallmentAmounts,
  calculateRowDiscountAmount,
  calculateTableDiscountAmount,
  calculateTableGrossTotal,
  calculateTableNetTotal,
} from "@/lib/contracts/totals";
import {
  isContractTableSection,
  isContractTextSection,
  type Contract,
  type ContractPaymentPlan,
} from "@/lib/contracts/types";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

/**
 * Treść dokumentu umowy — dane stron, sekcje (tekst/tabele), podsumowanie z rabatami, wariant
 * płatności i harmonogram, podpisy. Stylizowana jak jeden ciągły dokument (nie zestaw osobnych
 * kart), żeby wyglądała jak realna umowa, a nie panel administracyjny. Współdzielona przez
 * publiczną stronę podpisu (`ClientContractPage`) i podgląd w panelu admina
 * (`ContractPreviewDialog`).
 */
export function ContractDocumentView({
  contract,
  selectedOptionIds,
  onToggleOption,
  company,
  selectedPaymentPlanId,
  onSelectPaymentPlan,
}: {
  contract: Contract;
  selectedOptionIds: Set<string>;
  /** Gdy pominięte, checkboxy opcji są tylko do odczytu (podgląd bez interakcji). */
  onToggleOption?: (sectionId: string, checked: boolean) => void;
  company?: CompanyProfileDocument | null;
  selectedPaymentPlanId?: string | null;
  /** Gdy pominięte, karty wariantów płatności są tylko do odczytu. */
  onSelectPaymentPlan?: (planId: string) => void;
}) {
  const optionOverrides = Object.fromEntries(Array.from(selectedOptionIds).map((id) => [id, true]));
  const effectivePlan: ContractPaymentPlan | null =
    contract.paymentPlans.find((plan) => plan.id === selectedPaymentPlanId) ?? contract.paymentPlans[0] ?? null;

  const totals = calculateContractTotals(contract.sections, { optionOverrides, paymentPlan: effectivePlan });
  const scheduleAmounts = effectivePlan ? calculatePaymentPlanInstallmentAmounts(effectivePlan, totals) : [];

  const countedTables = contract.sections.filter(
    (section) => isContractTableSection(section) && (section.group === "main" || selectedOptionIds.has(section.id)),
  );

  return (
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Zleceniobiorca</p>
            <p className="mt-1 font-medium text-foreground">{company?.displayName || "—"}</p>
            {company?.footerLines.map((line) => (
              <p key={line} className="text-sm text-muted">
                {line}
              </p>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Zleceniodawca</p>
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

      <div className="grid gap-8 p-5 sm:p-8">
        {/* Tekst i tabele umowy */}
        <div className="grid gap-6">
          {contract.sections.map((section) => {
            if (isContractTextSection(section)) {
              return (
                <div
                  key={section.id}
                  className={cn(
                    "border-l-2 pl-4",
                    section.struck ? "border-l-border/40" : "border-l-accent/40",
                  )}
                >
                  {section.title ? (
                    <p className={cn("font-semibold text-foreground", section.struck && "text-muted line-through")}>
                      {section.title}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90",
                      section.struck && "text-muted line-through",
                    )}
                  >
                    {section.content}
                  </p>
                </div>
              );
            }

            if (!isContractTableSection(section)) {
              return null;
            }

            const isOption = section.group === "option";
            const selected = isOption ? selectedOptionIds.has(section.id) : true;
            const activeRows = section.rows.filter((row) => row.active);
            const tableDiscount = calculateTableDiscountAmount(section);

            return (
              <div
                key={section.id}
                className={cn(
                  "rounded-2xl border p-4 sm:p-5",
                  isOption
                    ? selected
                      ? "border-l-4 border-l-accent border-y-accent/40 border-r-accent/40 bg-accent-soft/10"
                      : "border-dashed border-border/70 bg-surface-muted/10 opacity-80"
                    : "border-border/60 bg-surface-muted/10",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{section.title || "Tabela pozycji"}</p>
                      {isOption ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            selected ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted",
                          )}
                        >
                          {selected ? "Opcja uwzględniona" : "Opcja dodatkowa"}
                        </span>
                      ) : null}
                    </div>
                    {section.description ? <p className="mt-1 text-sm text-muted">{section.description}</p> : null}
                  </div>
                  {isOption ? (
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!onToggleOption}
                        onChange={(event) => onToggleOption?.(section.id, event.target.checked)}
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
                          <th className="py-1.5 pl-2 pr-2 font-medium">Pozycja</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Ilość</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Cena netto</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Rabat</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Wartość netto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRows.map((row) => {
                          const discount = calculateRowDiscountAmount(row);
                          return (
                            <tr key={row.id} className="border-b border-border/40 last:border-0 even:bg-surface-muted/10">
                              <td className="py-1.5 pl-2 pr-2 text-foreground/90">
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
                  Suma: <span className="font-semibold text-foreground">{formatMoney(calculateTableNetTotal(section))} netto</span>
                  {" · "}
                  <span className="font-semibold text-foreground">{formatMoney(calculateTableGrossTotal(section))} brutto</span>
                  {tableDiscount > 0 ? (
                    <span className="ml-2 text-xs text-muted">(w tym rabat: {formatMoney(tableDiscount)})</span>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>

        {/* Podsumowanie */}
        <div className="rounded-2xl border border-accent/30 bg-accent-soft/10 p-4 sm:p-5">
          <p className="font-semibold text-foreground">Podsumowanie</p>
          <div className="mt-3 grid gap-1.5 text-sm">
            {countedTables.map((section) => {
              if (!isContractTableSection(section)) {
                return null;
              }
              return (
                <div key={section.id} className="flex items-center justify-between gap-3">
                  <span className="text-foreground/90">
                    {section.title || "Tabela pozycji"}
                    {section.group === "option" ? <span className="text-xs text-muted"> (opcja)</span> : null}
                  </span>
                  <span className="tabular-nums text-muted">{formatMoney(calculateTableGrossTotal(section))}</span>
                </div>
              );
            })}
            {totals.itemDiscountNet > 0 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-1.5">
                <span className="text-foreground/90">Rabat na pozycjach</span>
                <span className="tabular-nums text-muted">−{formatMoney(totals.itemDiscountNet)}</span>
              </div>
            ) : null}
            {effectivePlan && effectivePlan.discountPercent > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-foreground/90">
                  Rabat za wariant płatności „{effectivePlan.label}” ({effectivePlan.discountPercent}%)
                </span>
                <span className="tabular-nums text-muted">−{formatMoney(totals.planDiscountGross)}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-3 border-t border-accent/30 pt-3">
            <p className="text-lg font-bold text-accent">Wartość umowy: {formatMoney(totals.totalGross)} brutto</p>
            <p className="text-sm text-muted">(netto: {formatMoney(totals.totalNet)})</p>
          </div>
        </div>

        {/* Sposób płatności — tylko gdy jest z czego wybierać */}
        {contract.paymentPlans.length > 1 ? (
          <div>
            <p className="mb-3 font-semibold text-foreground">Sposób płatności</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {contract.paymentPlans.map((plan) => {
                const isSelected = plan.id === effectivePlan?.id;
                const finalGross = calculatePaymentPlanFinalGross(contract.sections, plan, { optionOverrides });
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
                    <p className="mt-2 text-base font-semibold text-foreground">{formatMoney(finalGross)} brutto</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Harmonogram spłat wybranego wariantu */}
        {effectivePlan && effectivePlan.installments.length > 0 ? (
          <div>
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
                    <th className="py-1.5 pr-2 text-right font-medium">Kwota brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleAmounts.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 last:border-0 even:bg-surface-muted/10">
                      <td className="py-1.5 pl-2 pr-2 text-foreground/90">
                        {item.label || "Rata"}
                        {item.note ? <span className="block text-xs text-muted">{item.note}</span> : null}
                        {item.perMonthGross != null ? (
                          <span className="block text-xs text-muted">
                            {item.splitOverMonths}× {formatMoney(item.perMonthGross)} miesięcznie
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-muted">{item.percent}%</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-medium text-foreground">
                        {formatMoney(item.amountGross)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Podpisy */}
        {contract.clientSignature || contract.companySignature ? (
          <div className="grid gap-4 border-t border-border/50 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Zleceniodawca</p>
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Zleceniobiorca</p>
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
  );
}
