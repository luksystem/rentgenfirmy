import type { ServiceMaterialItem } from "@/lib/service/types";
import type { ServiceWorkTimeBreakdown } from "@/lib/service/report-document";
import type { ServiceWarrantyHours } from "@/lib/service/types";
import { sumMaterialItemsCost } from "@/lib/service/material-items";
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

export function buildMaterialItemsCompareRows(
  predictedItems: ServiceMaterialItem[],
  actualItems: ServiceMaterialItem[],
): ReportCompareRow[] {
  const predictedVisible = predictedItems.filter(
    (item) => item.billable && (item.title.trim() || item.netAmount > 0),
  );
  const actualById = new Map(actualItems.map((item) => [item.id, item]));

  if (predictedVisible.length === 0) {
    const actualVisible = actualItems.filter(
      (item) => item.billable && (item.title.trim() || item.netAmount > 0),
    );
    if (actualVisible.length === 0) {
      return buildMaterialsCompareRows(0, 0);
    }

    return [
      ...actualVisible.map((item) => ({
        label: item.title.trim() || "Materiał",
        predicted: "—",
        settled: formatMoney(item.netAmount),
        detail: true,
      })),
      {
        label: "Suma materiałów",
        predicted: "—",
        settled: formatMoney(sumMaterialItemsCost(actualVisible)),
        group: true,
      },
    ];
  }

  const rows: ReportCompareRow[] = predictedVisible.map((item) => {
    const actual = actualById.get(item.id);
    return {
      label: item.title.trim() || "Materiał",
      predicted: formatMoney(item.netAmount),
      settled: actual ? formatMoney(actual.netAmount) : "—",
      detail: true,
    };
  });

  rows.push({
    label: "Suma materiałów",
    predicted: formatMoney(sumMaterialItemsCost(predictedVisible)),
    settled: formatMoney(sumMaterialItemsCost(actualItems)),
    group: true,
  });

  return rows;
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

export function buildTripCountCompareRows(
  predictedCount: number,
  settledCount: number,
): ReportCompareRow[] {
  return [
    {
      label: "Ilość wyjazdów",
      predicted: formatCount(predictedCount),
      settled: formatCount(settledCount),
      group: true,
    },
  ];
}

export function buildWarrantyHoursReportRows(warrantyHours: ServiceWarrantyHours): ReportCompareRow[] {
  const rows: ReportCompareRow[] = [];

  function add(label: string, value: number) {
    if (value > 0) {
      rows.push({
        label,
        predicted: formatHours(value),
        settled: "",
        group: true,
      });
    }
  }

  add("Godziny nadzoru", warrantyHours.supervisionHours);
  add("Godziny programisty", warrantyHours.programmerHours);
  add("Godziny instalatora", warrantyHours.installerHours);
  add("Godziny pomocnika", warrantyHours.helperHours);
  add("Godziny w aucie", warrantyHours.carHours);

  return rows;
}
