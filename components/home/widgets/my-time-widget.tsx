"use client";

import { useEffect } from "react";
import { TimePeriodBalanceCard } from "@/components/time-tracking/time-period-balance-card";
import { Card, CardContent } from "@/components/ui/card";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export function MyTimeWidget() {
  const summary = useTimeTrackingStore((state) => state.summary);
  const summaryHydrated = useTimeTrackingStore((state) => state.summaryHydrated);
  const summaryLoading = useTimeTrackingStore((state) => state.summaryLoading);
  const ensureTimesheetSummary = useTimeTrackingStore((state) => state.ensureTimesheetSummary);

  useEffect(() => {
    void ensureTimesheetSummary();
  }, [ensureTimesheetSummary]);

  if (summaryLoading && !summaryHydrated) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">Wczytywanie…</CardContent>
      </Card>
    );
  }

  return <TimePeriodBalanceCard balance={summary?.balance ?? null} periodType="week" />;
}
