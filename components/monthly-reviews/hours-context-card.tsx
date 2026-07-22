"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchMonthlyReviewHoursContext,
  type MonthlyReviewHoursContext,
} from "@/lib/supabase/monthly-review-repository";

export function HoursContextCard({ employeeId }: { employeeId?: string } = {}) {
  const [context, setContext] = useState<MonthlyReviewHoursContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMonthlyReviewHoursContext(employeeId)
      .then((result) => {
        if (!cancelled) {
          setContext(result);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać godzin.");
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
  }, [employeeId]);

  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-6">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Godziny — {context?.periodMonthLabel ?? "bieżący miesiąc"}
          </p>
          {loading ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Wczytywanie…
            </p>
          ) : error ? (
            <p className="mt-1 text-sm text-rose-400">{error}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">{context?.text}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
