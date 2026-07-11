"use client";

import {
  calculateFixedPriceBreakdown,
  computeFixedPriceRowNetValue,
} from "@/lib/service/fixed-price";
import type { ServiceRecord } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

export function FixedPriceOfferReport({
  service,
  variant = "client",
}: {
  service: ServiceRecord;
  variant?: "client" | "internal";
}) {
  const breakdown = calculateFixedPriceBreakdown(
    service.fixedPriceTables,
    service.estimateDiscounts,
  );

  const isClient = variant === "client";

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
      </div>

      <div className="grid gap-6 px-6 py-6">
        {breakdown.tables.map(({ table, netTotal, grossTotal, vatLines }) => {
          const activeRows = table.rows.filter((row) => row.active && row.name.trim());

          return (
            <section key={table.id} id={`fixed-table-${table.id}`} className="scroll-mt-24">
              <h3 className="text-base font-semibold">{table.title || "Tabela pozycji"}</h3>
              {table.description ? (
                <p className={cn("mt-1 whitespace-pre-wrap", isClient ? "text-zinc-400" : "text-muted")}>
                  {table.description}
                </p>
              ) : null}

              <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className={isClient ? "bg-zinc-950/60 text-zinc-500" : "bg-surface-muted text-muted"}>
                    <tr>
                      <th className="px-3 py-2">Pozycja</th>
                      <th className="px-3 py-2">Ilość</th>
                      <th className="px-3 py-2 text-right">Netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activeRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{row.name}</p>
                          {(row.showDescription || table.showProductDescriptions) && row.description ? (
                            <p className={cn("mt-1 text-xs", isClient ? "text-zinc-500" : "text-muted")}>
                              {row.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {row.quantity} {row.unit}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(computeFixedPriceRowNetValue(row))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                  Brutto: <strong>{formatMoney(grossTotal)}</strong>
                </span>
              </div>
            </section>
          );
        })}

        <div
          className={cn(
            "rounded-xl border px-4 py-4",
            isClient ? "border-zinc-700 bg-zinc-950/50" : "border-border/80 bg-surface-muted/30",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Podsumowanie</p>
          <div className="mt-3 grid gap-1 text-sm">
            <p>
              Netto: <span className="font-semibold">{formatMoney(breakdown.netTotal)}</span>
            </p>
            <p>
              VAT: <span className="font-semibold">{formatMoney(breakdown.vatTotal)}</span>
            </p>
            <p className="text-lg font-bold">
              Brutto: {formatMoney(breakdown.grossTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
