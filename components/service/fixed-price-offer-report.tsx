"use client";

import {
  calculateFixedPriceBreakdown,
  computeFixedPriceRowNetValue,
} from "@/lib/service/fixed-price";
import { hasOptionalItems, optionalItemAmounts } from "@/lib/service/optional-items";
import {
  getServiceCombinedBilling,
  getServiceReportWorkNote,
} from "@/lib/service/report-document";
import type { ServiceRecord } from "@/lib/service/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { RichHtml } from "@/components/ui/rich-html";

export function FixedPriceOfferReport({
  service,
  variant = "client",
  optionalItemSelection,
}: {
  service: ServiceRecord;
  variant?: "client" | "internal";
  optionalItemSelection?: ReadonlySet<string>;
}) {
  const breakdown = calculateFixedPriceBreakdown(
    service.fixedPriceTables,
    service.estimateDiscounts,
  );
  const combined = getServiceCombinedBilling(service, optionalItemSelection ?? null);
  const workNote = getServiceReportWorkNote(service, false);
  const isClient = variant === "client";
  const showOptionalSummary = hasOptionalItems(service.optionalItems);

  return (
    <div
      className={cn(
        "rounded-2xl border text-sm",
        isClient ? "border-zinc-800 bg-zinc-900/60 text-zinc-100" : "border-border bg-surface",
      )}
    >
      <div className={cn("border-b px-6 py-5", isClient ? "border-zinc-800" : "border-border/80")}>
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.16em]",
            isClient ? "text-zinc-500" : "text-muted",
          )}
        >
          Oferta ryczałtowa
        </p>
        <h2 className="mt-2 text-xl font-semibold">{service.title}</h2>
        <p className={cn("mt-1", isClient ? "text-zinc-400" : "text-muted")}>
          {service.client.fullName}
          {service.client.location ? ` · ${service.client.location}` : ""}
        </p>
        <p className={cn("mt-2 text-xs", isClient ? "text-zinc-500" : "text-muted")}>
          Data wyceny: {formatDate(service.updatedAt)}
        </p>
      </div>

      <div className="grid gap-8 px-6 py-6">
        <section id="offer-scope" className="scroll-mt-24">
          <h3 className="text-base font-semibold">Zakres prac</h3>
          <div className="mt-3">
            <RichHtml
              html={workNote}
              fallback="Brak opisu prac."
              className={isClient ? "text-zinc-300" : "text-foreground"}
            />
          </div>
        </section>

        {breakdown.tables.length === 0 ? (
          <p className={cn("text-sm", isClient ? "text-zinc-400" : "text-muted")}>
            Brak zdefiniowanych tabel pozycji w ofercie ryczałtowej.
          </p>
        ) : (
          <section id="offer-tables" className="scroll-mt-24 grid gap-8">
            {breakdown.tables.map(({ table, netTotal, grossTotal, vatLines }) => {
              const activeRows = table.rows.filter((row) => row.active && row.name.trim());

              return (
                <div key={table.id} id={`offer-table-${table.id}`}>
                  <h3 className="text-base font-semibold">{table.title || "Tabela pozycji"}</h3>
                  {table.description ? (
                    <p
                      className={cn(
                        "mt-1 whitespace-pre-wrap",
                        isClient ? "text-zinc-400" : "text-muted",
                      )}
                    >
                      {table.description}
                    </p>
                  ) : null}

                  {activeRows.length === 0 ? (
                    <p className={cn("mt-3 text-sm", isClient ? "text-zinc-500" : "text-muted")}>
                      Brak aktywnych pozycji w tej tabeli.
                    </p>
                  ) : (
                    <div
                      className={cn(
                        "mt-4 overflow-x-auto rounded-xl border",
                        isClient ? "border-zinc-700" : "border-border/60",
                      )}
                    >
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead
                          className={
                            isClient ? "bg-zinc-950/60 text-zinc-500" : "bg-surface-muted text-muted"
                          }
                        >
                          <tr>
                            <th className="px-3 py-2">Pozycja</th>
                            <th className="px-3 py-2">Ilość</th>
                            <th className="px-3 py-2">J.m.</th>
                            <th className="px-3 py-2 text-right">Cena netto</th>
                            <th className="px-3 py-2 text-right">Rabat</th>
                            <th className="px-3 py-2 text-right">Netto po rabacie</th>
                          </tr>
                        </thead>
                        <tbody
                          className={cn(
                            "divide-y",
                            isClient ? "divide-zinc-800" : "divide-border/50",
                          )}
                        >
                          {activeRows.map((row) => (
                            <tr key={row.id}>
                              <td className="px-3 py-2">
                                <p className="font-medium">{row.name}</p>
                                {(row.showDescription || table.showProductDescriptions) &&
                                row.description ? (
                                  <p
                                    className={cn(
                                      "mt-1 text-xs",
                                      isClient ? "text-zinc-500" : "text-muted",
                                    )}
                                  >
                                    {row.description}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 tabular-nums">{row.quantity}</td>
                              <td className="px-3 py-2">{row.unit}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatMoney(row.netUnitPrice)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {row.percentDiscount > 0 ? `${row.percentDiscount}%` : "—"}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatMoney(computeFixedPriceRowNetValue(row))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span>
                      Netto tabeli: <strong>{formatMoney(netTotal)}</strong>
                    </span>
                    {vatLines.map((line) => (
                      <span key={line.vatRate}>
                        VAT {line.vatRate}%: {formatMoney(line.vatAmount)}
                      </span>
                    ))}
                    <span>
                      Brutto tabeli: <strong>{formatMoney(grossTotal)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {showOptionalSummary ? (
          <section id="offer-optional-items" className="scroll-mt-24">
            <h3 className="text-base font-semibold">Pozycje opcjonalne</h3>
            <p className={cn("mt-1 text-sm", isClient ? "text-zinc-400" : "text-muted")}>
              Klient może zaznaczyć wybrane opcje — ich kwota doliczy się do oferty.
            </p>
            <ul className="mt-3 grid gap-2">
              {service.optionalItems
                .filter((item) => item.title.trim() || item.netAmount > 0)
                .map((item) => {
                  const selected = optionalItemSelection?.has(item.id) ?? item.clientSelected;
                  const { grossAmount } = optionalItemAmounts(item);
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2",
                        isClient ? "border-zinc-700" : "border-border/60",
                        selected && "ring-1 ring-emerald-500/40",
                      )}
                    >
                      <span>
                        {item.title || "Opcja"}
                        {selected ? (
                          <span className="ml-2 text-xs text-emerald-400">(wybrana)</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums font-medium">+{formatMoney(grossAmount)} brutto</span>
                    </li>
                  );
                })}
            </ul>
          </section>
        ) : null}

        <section
          id="offer-summary"
          className={cn(
            "scroll-mt-24 rounded-xl border px-4 py-4",
            isClient ? "border-zinc-700 bg-zinc-950/50" : "border-border/80 bg-surface-muted/30",
          )}
        >
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.14em]",
              isClient ? "text-zinc-500" : "text-muted",
            )}
          >
            Podsumowanie oferty
          </p>
          <div className="mt-3 grid gap-1 text-sm">
            <p>
              Suma pozycji przed rabatami:{" "}
              <span className="font-semibold">{formatMoney(breakdown.grossNetTotal)}</span>
            </p>
            {breakdown.totalDiscountAmount > 0 ? (
              <p>
                Udzielony rabat:{" "}
                <span className="font-semibold text-emerald-400">
                  −{formatMoney(breakdown.totalDiscountAmount)} ({breakdown.totalDiscountPercentOfTotal}% całości)
                </span>
              </p>
            ) : null}
            <p>
              Netto: <span className="font-semibold">{formatMoney(breakdown.netTotal)}</span>
            </p>
            <p>
              VAT: <span className="font-semibold">{formatMoney(breakdown.vatTotal)}</span>
            </p>
            <p>
              Brutto oferty: <span className="font-semibold">{formatMoney(breakdown.grossTotal)}</span>
            </p>
            {combined.optional.grossTotal > 0 ? (
              <p>
                Opcje dodatkowe:{" "}
                <span className="font-semibold">+{formatMoney(combined.optional.grossTotal)}</span>
              </p>
            ) : null}
            <p className="text-lg font-bold">
              Razem brutto: {formatMoney(combined.grossTotal)}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
