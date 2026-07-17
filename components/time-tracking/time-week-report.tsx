"use client";

import { useMemo } from "react";
import { buildWeekTimeReport } from "@/lib/time-tracking/reports";
import type { TimeEntryView, TimesheetPeriodType } from "@/lib/time-tracking/types";
import { TimePeriodReport } from "@/components/time-tracking/time-period-report";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export function TimeWeekReport({ entries }: { entries: TimeEntryView[] }) {
  const meta = useTimeTrackingStore((state) => state.meta);
  const periodType = useTimeTrackingStore((state) => state.entriesPeriod.periodType);

  const report = useMemo(() => {
    if (!meta) {
      return null;
    }
    return buildWeekTimeReport(
      entries,
      meta.entryTypes.map((item) => ({
        id: item.id,
        name: item.name,
        countsAsWork: item.countsAsWork,
        countsAsAbsence: item.countsAsAbsence,
      })),
    );
  }, [entries, meta]);

  const title = periodType === "month" ? "Raport miesiąca" : "Raport tygodnia";
  const description =
    periodType === "month"
      ? "Miesięczne podsumowanie wg kategorii i typów wpisów."
      : "Tygodniowe podsumowanie wg kategorii i typów wpisów.";

  return <TimePeriodReport report={report} title={title} description={description} />;
}

export function TimePeriodReportFromEntries({
  entries,
  periodType,
}: {
  entries: TimeEntryView[];
  periodType: TimesheetPeriodType;
}) {
  const meta = useTimeTrackingStore((state) => state.meta);

  const report = useMemo(() => {
    if (!meta) {
      return null;
    }
    return buildWeekTimeReport(
      entries,
      meta.entryTypes.map((item) => ({
        id: item.id,
        name: item.name,
        countsAsWork: item.countsAsWork,
        countsAsAbsence: item.countsAsAbsence,
      })),
    );
  }, [entries, meta]);

  const title = periodType === "month" ? "Raport miesiąca" : "Raport tygodnia";

  return (
    <TimePeriodReport
      report={report}
      title={title}
      description={
        periodType === "month"
          ? "Miesięczne podsumowanie wg kategorii i typów wpisów."
          : "Tygodniowe podsumowanie wg kategorii i typów wpisów."
      }
    />
  );
}
