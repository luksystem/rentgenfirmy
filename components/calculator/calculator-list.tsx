"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { calculateCalculatorTotals } from "@/lib/calculator/engine";
import { CALCULATOR_OFFER_STATUS_LABELS, type CalculatorOfferStatus } from "@/lib/calculator/types";
import { useCalculatorStore } from "@/store/calculator-store";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const STATUS_TONE: Record<CalculatorOfferStatus, string> = {
  draft: "bg-surface-muted text-muted",
  ready: "bg-sky-500/15 text-sky-300",
  converted: "bg-emerald-500/15 text-emerald-300",
};

export function CalculatorList() {
  const offers = useCalculatorStore((state) => state.offers);
  const removeOffer = useCalculatorStore((state) => state.removeOffer);

  const rows = useMemo(
    () =>
      offers.map((offer) => ({
        offer,
        totals: calculateCalculatorTotals(offer.answers, DEFAULT_CALCULATOR_SETTINGS),
      })),
    [offers],
  );

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak kalkulacji. Użyj przycisku „Nowa kalkulacja”, aby zacząć wycenę.
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map(({ offer, totals }) => (
        <Card key={offer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{offer.title || "Kalkulacja bez tytułu"}</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[offer.status])}>
                {CALCULATOR_OFFER_STATUS_LABELS[offer.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{offer.client.fullName || "Brak klienta"}</p>
            <p className="mt-0.5 text-xs text-muted">
              {formatDate(offer.createdAt)} · Wartość: {formatMoney(totals.totalNet)} netto
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/kalkulacje/${offer.id}`}>Edytuj</Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!window.confirm("Usunąć tę kalkulację?")) {
                  return;
                }
                try {
                  await removeOffer(offer.id);
                } catch {
                  window.alert("Nie udało się usunąć kalkulacji.");
                }
              }}
            >
              Usuń
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
