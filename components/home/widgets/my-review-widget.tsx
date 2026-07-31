"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { fetchMyMonthlyReview } from "@/lib/supabase/monthly-review-repository";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";
import type { MonthlyReviewSelfView } from "@/lib/monthly-reviews/types";

function summarize(view: MonthlyReviewSelfView | null): string {
  if (!view || !view.participates) {
    return "Nie uczestniczysz w cyklu ocen miesięcznych.";
  }
  const monthLabel = formatPeriodMonthLabel(view.periodMonth);
  if (view.managerAssessment) {
    return `Ocena za ${monthLabel}: oceniona przez przełożonego.`;
  }
  if (view.selfAssessment) {
    return `Ocena za ${monthLabel}: wysłana, czeka na przełożonego.`;
  }
  return `Ocena za ${monthLabel}: czeka na Twoją samoocenę.`;
}

export function MyReviewWidget() {
  const [view, setView] = useState<MonthlyReviewSelfView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchMyMonthlyReview()
      .then((result) => {
        if (!cancelled) {
          setView(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setView(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href="/moja-praca/oceny" className="block min-w-0">
      <Card className="cursor-pointer transition hover:border-accent/40 hover:shadow-md">
        <CardContent className="grid gap-2 py-4">
          <p className="font-semibold text-foreground">Ocena miesięczna</p>
          <p className="text-sm text-muted">{loading ? "Wczytywanie…" : summarize(view)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
