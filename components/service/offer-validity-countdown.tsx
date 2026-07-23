"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatOfferCountdown,
  getOfferRemainingMs,
} from "@/lib/service/offer-validity";
import { cn, formatDate } from "@/lib/utils";

export function OfferValidityCountdown({
  expiresAt,
  kind = "estimate",
}: {
  expiresAt: string;
  /** Dla rozliczenia link nie wygasa — po terminie następuje automatyczna akceptacja. */
  kind?: "estimate" | "settlement";
}) {
  const [remainingMs, setRemainingMs] = useState(() => getOfferRemainingMs(expiresAt));
  const isSettlement = kind === "settlement";

  useEffect(() => {
    setRemainingMs(getOfferRemainingMs(expiresAt));

    const timer = window.setInterval(() => {
      setRemainingMs(getOfferRemainingMs(expiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const isUrgent = remainingMs > 0 && remainingMs <= 1000 * 60 * 60 * 24;
  const expired = remainingMs <= 0;

  return (
    <div
      className={cn(
        "mt-3 inline-flex max-w-sm items-start gap-3 rounded-xl border px-3.5 py-3",
        expired
          ? "border-zinc-700/80 bg-zinc-800/40"
          : isUrgent
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-zinc-700 bg-zinc-800/60",
      )}
    >
      <Clock3
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          expired ? "text-zinc-500" : isUrgent ? "text-amber-400" : "text-zinc-400",
        )}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {isSettlement ? "Termin automatycznej akceptacji" : "Ważność oferty"}
        </p>
        {expired ? (
          <p className="mt-1 text-sm text-zinc-400">
            {isSettlement
              ? `Termin minął (${formatDate(expiresAt)}) — rozliczenie zostanie automatycznie uznane za zaakceptowane, jeśli jeszcze nie zareagowałeś/-aś.`
              : `Oferta wygasła · była ważna do ${formatDate(expiresAt)}`}
          </p>
        ) : (
          <>
            <p
              className={cn(
                "mt-1 text-base font-semibold tabular-nums tracking-tight",
                isUrgent ? "text-amber-200" : "text-zinc-100",
              )}
            >
              {formatOfferCountdown(remainingMs)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {isSettlement
                ? `Zdecyduj do ${formatDate(expiresAt)} — brak reakcji oznacza automatyczną akceptację`
                : `Ważna do ${formatDate(expiresAt)}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
