"use client";

import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import {
  calculateContractTotals,
  calculatePaymentScheduleAmounts,
  calculateTableGrossTotal,
  calculateTableNetTotal,
} from "@/lib/contracts/totals";
import { isContractTableSection, isContractTextSection, type Contract } from "@/lib/contracts/types";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

/**
 * Treść dokumentu umowy — dane stron, sekcje (tekst/tabele), suma, harmonogram spłat i podpisy.
 * Stylizowana jak jeden ciągły dokument (nie zestaw osobnych kart), żeby wyglądała jak realna
 * umowa, a nie panel administracyjny. Współdzielona przez publiczną stronę podpisu
 * (`ClientContractPage`) i podgląd w panelu admina (`ContractPreviewDialog`).
 */
export function ContractDocumentView({
  contract,
  selectedOptionIds,
  onToggleOption,
  company,
}: {
  contract: Contract;
  selectedOptionIds: Set<string>;
  /** Gdy pominięte, checkboxy opcji są tylko do odczytu (podgląd bez interakcji). */
  onToggleOption?: (sectionId: string, checked: boolean) => void;
  company?: CompanyProfileDocument | null;
}) {
  const totals = calculateContractTotals(contract.sections, {
    optionOverrides: Object.fromEntries(Array.from(selectedOptionIds).map((id) => [id, true])),
  });
  const scheduleAmounts = calculatePaymentScheduleAmounts(contract.paymentSchedule, totals);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-surface-elevated shadow-soft">
      {/* Letterhead — strony umowy */}
      <div className="border-b border-border/60 bg-surface-muted/30 p-5 sm:p-8">
        {company?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={company.displayName} className="mb-4 h-10 w-auto object-contain" />
        ) : null}
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{contract.title || "Umowa"}</h1>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Zleceniobiorca</p>
            <p className="mt-1 font-medium text-foreground">{company?.displayName || "—"}</p>
            {company?.footerLines.map((line) => (
              <p key={line} className="text-sm text-muted">
                {line}
              </p>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Zleceniodawca</p>
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
                <div key={section.id} className="border-t border-border/50 pt-6 first:border-t-0 first:pt-0">
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

            return (
              <div
                key={section.id}
                className={cn(
                  "rounded-2xl border p-4 sm:p-5",
                  isOption
                    ? selected
                      ? "border-accent/50 bg-accent-soft/10"
                      : "border-dashed border-border/70 bg-surface-muted/10"
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
                            selected ? "bg-accent/15 text-accent" : "bg-surface-muted text-muted",
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
                    <table className="w-full min-w-[420px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted">
                          <th className="py-1.5 pr-2 font-medium">Pozycja</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Ilość</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Cena netto</th>
                          <th className="py-1.5 pl-2 text-right font-medium">Wartość netto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRows.map((row) => (
                          <tr key={row.id} className="border-b border-border/40 last:border-0">
                            <td className="py-1.5 pr-2 text-foreground/90">
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
                            <td className="py-1.5 pl-2 text-right tabular-nums font-medium text-foreground">
                              {formatMoney(computeFixedPriceRowNetValue(row))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <p className="mt-3 text-right text-sm text-muted">
                  Suma: <span className="font-semibold text-foreground">{formatMoney(calculateTableNetTotal(section))} netto</span>
                  {" · "}
                  <span className="font-semibold text-foreground">{formatMoney(calculateTableGrossTotal(section))} brutto</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Suma i harmonogram */}
        <div className="rounded-2xl border border-border/60 bg-surface-muted/20 p-4 sm:p-5">
          <p className="text-base font-semibold text-foreground">Wartość umowy: {formatMoney(totals.totalGross)} brutto</p>
          <p className="text-sm text-muted">(netto: {formatMoney(totals.totalNet)})</p>

          {contract.paymentSchedule.length > 0 ? (
            <div className="mt-4 border-t border-border/50 pt-4">
              <p className="mb-2 font-semibold text-foreground">Harmonogram spłat</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-1.5 pr-2 font-medium">Rata</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Udział</th>
                      <th className="py-1.5 pl-2 text-right font-medium">Kwota brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleAmounts.map((item) => (
                      <tr key={item.id} className="border-b border-border/40 last:border-0">
                        <td className="py-1.5 pr-2 text-foreground/90">
                          {item.label || "Rata"}
                          {item.note ? <span className="block text-xs text-muted">{item.note}</span> : null}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted">{item.percent}%</td>
                        <td className="py-1.5 pl-2 text-right tabular-nums font-medium text-foreground">
                          {formatMoney(item.amountGross)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

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
