"use client";

import { useMemo } from "react";
import { buildWeekTimeReport } from "@/lib/time-tracking/reports";
import { buildWorkPeriodBalance } from "@/lib/time-tracking/period-balance";
import type { TimeEntryView, TimesheetPeriodType } from "@/lib/time-tracking/types";
import { TimePeriodBalanceCard } from "@/components/time-tracking/time-period-balance-card";
import { useAuthStore } from "@/store/auth-store";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export function TimeEntriesPeriodBalance({
  entries,
  periodType,
}: {
  entries: TimeEntryView[];
  periodType: TimesheetPeriodType;
}) {
  const meta = useTimeTrackingStore((state) => state.meta);
  const entriesPeriod = useTimeTrackingStore((state) => state.entriesPeriod);
  const dailyHoursLimit = useAuthStore((state) => state.profile?.dailyHoursLimit);

  const balance = useMemo(() => {
    if (!meta) {
      return null;
    }
    const report = buildWeekTimeReport(
      entries,
      meta.entryTypes.map((item) => ({
        id: item.id,
        name: item.name,
        countsAsWork: item.countsAsWork,
        countsAsAbsence: item.countsAsAbsence,
      })),
    );
    return buildWorkPeriodBalance(
      report,
      entriesPeriod.dateFrom,
      entriesPeriod.dateTo,
      dailyHoursLimit,
    );
  }, [entries, meta, entriesPeriod.dateFrom, entriesPeriod.dateTo, dailyHoursLimit]);

  return <TimePeriodBalanceCard balance={balance} periodType={periodType} />;
}
