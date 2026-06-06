import type { ServiceWorkTimeBreakdown } from "@/lib/service/report-document";
import { formatCount, formatHours, formatMoney } from "@/lib/utils";

export type ReportCompareRow = {
  label: string;
  predicted: string;
  settled: string;
  group?: boolean;
  detail?: boolean;
};

export function buildWorkTimeCompareRows(
  predicted: ServiceWorkTimeBreakdown,
  actual: ServiceWorkTimeBreakdown,
  detailed: boolean,
): ReportCompareRow[] {
  if (detailed) {
    return [
      {
        label: "Logistyka i nadzór",
        predicted: formatHours(predicted.logisticsAndSupervisionTotal),
        settled: formatHours(actual.logisticsAndSupervisionTotal),
        group: true,
      },
      {
        label: "Godziny w aucie",
        predicted: formatHours(predicted.lines.logistics.carHours),
        settled: formatHours(actual.lines.logistics.carHours),
        detail: true,
      },
      {
        label: "Godziny nadzoru",
        predicted: formatHours(predicted.lines.logistics.supervisionHours),
        settled: formatHours(actual.lines.logistics.supervisionHours),
        detail: true,
      },
      {
        label: "Godziny pracy",
        predicted: formatHours(predicted.workHoursTotal),
        settled: formatHours(actual.workHoursTotal),
        group: true,
      },
      {
        label: "Godziny instalatora",
        predicted: formatHours(predicted.lines.work.installerHours),
        settled: formatHours(actual.lines.work.installerHours),
        detail: true,
      },
      {
        label: "Godziny pomocnika",
        predicted: formatHours(predicted.lines.work.helperHours),
        settled: formatHours(actual.lines.work.helperHours),
        detail: true,
      },
      {
        label: "Godziny programisty",
        predicted: formatHours(predicted.lines.work.programmerHours),
        settled: formatHours(actual.lines.work.programmerHours),
        detail: true,
      },
    ];
  }

  return [
    {
      label: "Logistyka i nadzór",
      predicted: formatHours(predicted.logisticsAndSupervisionTotal),
      settled: formatHours(actual.logisticsAndSupervisionTotal),
      group: true,
    },
    {
      label: "Godziny pracy",
      predicted: formatHours(predicted.workHoursTotal),
      settled: formatHours(actual.workHoursTotal),
      group: true,
    },
  ];
}

export function buildMaterialsCompareRows(
  predictedCost: number,
  settledCost: number,
): ReportCompareRow[] {
  return [
    {
      label: "Koszt materiałów",
      predicted: formatMoney(predictedCost),
      settled: formatMoney(settledCost),
      group: true,
    },
  ];
}

export function buildAccommodationsCompareRows(
  predictedCount: number,
  settledCount: number,
): ReportCompareRow[] {
  return [
    {
      label: "Ilość noclegów",
      predicted: formatCount(predictedCount),
      settled: formatCount(settledCount),
      group: true,
    },
  ];
}
