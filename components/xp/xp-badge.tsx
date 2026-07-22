"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyXpSummary } from "@/lib/supabase/xp-repository";
import type { XpEmployeeSummary } from "@/lib/xp/types";
import { xpIcon } from "@/components/xp/xp-icon-map";
import { cn } from "@/lib/utils";

/** Mały, kompaktowy widget XP — do stopki sidebaru. Sam sobie dociąga dane. */
export function XpBadge({ className }: { className?: string }) {
  const [summary, setSummary] = useState<XpEmployeeSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMyXpSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary) {
    return null;
  }

  const Icon = xpIcon(summary.level.icon);

  return (
    <Link
      href="/moja-praca/xp"
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-sidebar-muted transition hover:bg-white/5 hover:text-sidebar-foreground",
        className,
      )}
      title={`Poziom ${summary.level.tier} — ${summary.level.label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span className="truncate">
        {summary.level.label} · {summary.totalPoints} XP
      </span>
    </Link>
  );
}
