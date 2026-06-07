"use client";

import { useEffect, useState } from "react";
import {
  formatOfferCountdown,
  getOfferRemainingMs,
} from "@/lib/service/offer-validity";
import { cn, formatDate } from "@/lib/utils";

export function OfferValidityCountdown({ expiresAt }: { expiresAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() => getOfferRemainingMs(expiresAt));

  useEffect(() => {
    setRemainingMs(getOfferRemainingMs(expiresAt));

    const timer = window.setInterval(() => {
      setRemainingMs(getOfferRemainingMs(expiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const isUrgent = remainingMs > 0 && remainingMs <= 1000 * 60 * 60 * 24;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isUrgent
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-emerald-500/30 bg-emerald-500/10",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
        Ważność oferty
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          isUrgent ? "text-amber-200" : "text-emerald-200",
        )}
      >
        {remainingMs > 0 ? formatOfferCountdown(remainingMs) : "Oferta wygasła"}
      </p>
      <p className="mt-1 text-xs text-zinc-500">Oferta ważna do {formatDate(expiresAt)}</p>
    </div>
  );
}
