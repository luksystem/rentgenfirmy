"use client";

import { useMemo } from "react";
import {
  calculateOptionalItemsBreakdown,
  optionalItemAmounts,
} from "@/lib/service/optional-items";
import type { ServiceOptionalItem } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

export function ClientOptionalItemsPicker({
  items,
  selectedIds,
  onChange,
  interactive,
}: {
  items: ServiceOptionalItem[];
  selectedIds: ReadonlySet<string>;
  onChange: (selectedIds: Set<string>) => void;
  interactive: boolean;
}) {
  const visibleItems = items.filter((item) => item.title.trim() && item.netAmount > 0);

  const selectionBreakdown = useMemo(
    () =>
      calculateOptionalItemsBreakdown(visibleItems, (item) => selectedIds.has(item.id)),
    [visibleItems, selectedIds],
  );

  if (visibleItems.length === 0) {
    return null;
  }

  function toggleItem(id: string) {
    if (!interactive) {
      return;
    }

    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  return (
    <section
      id="offer-optional-items"
      className="overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 shadow-lg shadow-amber-500/5"
    >
      <div className="border-b border-amber-500/20 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
          Do wyboru · opcjonalne pozycje
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-50">
          Zaznacz dodatkowe prace, które chcesz uwzględnić
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
          Poniższe pozycje nie wchodzą w podstawową wycenę. Zaznacz checkbox przy wybranych
          pozycjach — ich kwota zostanie doliczona do oferty przy akceptacji. Możesz zaakceptować
          ofertę bez żadnej z nich.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        {visibleItems.map((item) => {
          const selected = selectedIds.has(item.id);
          const { vatAmount, grossAmount } = optionalItemAmounts(item);

          return (
            <label
              key={item.id}
              className={cn(
                "grid cursor-pointer gap-3 rounded-xl border p-4 transition sm:grid-cols-[auto_1fr_auto]",
                interactive && "hover:border-amber-400/50",
                selected
                  ? "border-amber-400/60 bg-amber-500/10 ring-1 ring-amber-400/30"
                  : "border-zinc-700 bg-zinc-950/50",
                !interactive && "cursor-default",
              )}
            >
              <div className="flex items-start pt-0.5">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={!interactive}
                  onChange={() => toggleItem(item.id)}
                  className="h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400/40 disabled:opacity-70"
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-50">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-zinc-500">
                  netto {formatMoney(item.netAmount)} · VAT {item.vatRate}% (
                  {formatMoney(vatAmount)})
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Brutto</p>
                <p className="text-lg font-bold tabular-nums text-zinc-50">{formatMoney(grossAmount)}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="border-t border-amber-500/20 bg-zinc-950/40 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-400">Wybrane pozycje opcjonalne</p>
            <p className="mt-1 text-xs text-zinc-500">
              {selectedIds.size > 0
                ? `${selectedIds.size} z ${visibleItems.length} pozycji zaznaczonych`
                : "Nie zaznaczono żadnej pozycji opcjonalnej"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Doliczone brutto
            </p>
            <p className="text-2xl font-bold tabular-nums text-amber-200">
              +{formatMoney(selectionBreakdown.grossTotal)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClientOptionalItemsSummary({
  items,
}: {
  items: ServiceOptionalItem[];
}) {
  const selected = items.filter((item) => item.clientSelected && item.title.trim());

  if (selected.length === 0) {
    return null;
  }

  const breakdown = calculateOptionalItemsBreakdown(selected, () => true);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-lg font-semibold text-zinc-100">Wybrane pozycje opcjonalne</h2>
      <ul className="mt-3 grid gap-2">
        {breakdown.lines.map(({ item, grossAmount }) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm"
          >
            <span className="text-zinc-200">{item.title}</span>
            <span className="font-semibold tabular-nums text-zinc-50">{formatMoney(grossAmount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-right text-sm text-zinc-400">
        Razem brutto pozycji opcjonalnych:{" "}
        <span className="font-semibold text-zinc-100">{formatMoney(breakdown.grossTotal)}</span>
      </p>
    </section>
  );
}
