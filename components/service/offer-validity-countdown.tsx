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
    <p className="mt-2 text-xs text-zinc-500">
      {remainingMs > 0 ? (
        <>
          Ważna jeszcze{" "}
          <span
            className={cn(
              "tabular-nums",
              isUrgent ? "text-amber-500/80" : "text-zinc-400",
            )}
          >
            {formatOfferCountdown(remainingMs)}
          </span>
          {" · "}do {formatDate(expiresAt)}
        </>
      ) : (
        <>Oferta wygasła · była ważna do {formatDate(expiresAt)}</>
      )}
    </p>
  );
}
