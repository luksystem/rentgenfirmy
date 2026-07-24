export const MONTH_LABELS_PL = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

/** Parsuje "YYYY-MM-DD" jako lokalną północ (bez przesunięć strefy czasowej). */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateOnly(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

/** Poniedziałek tygodnia zawierającego podaną datę. */
export function mondayOf(value: string): string {
  const date = parseDateOnly(value);
  const day = date.getDay(); // 0=niedziela..6=sobota
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return toDateOnly(date);
}

export function compareDateOnly(a: string, b: string): number {
  return a.localeCompare(b);
}

export type WeekColumn = {
  /** Poniedziałek tygodnia — klucz kolumny w widoku tygodniowym. */
  weekStart: string;
  weekEnd: string;
  weekIndex: number;
  monthLabel: string;
  isFirstWeekOfMonth: boolean;
};

/**
 * Buduje kolumny tygodni (poniedziałek-niedziela) pokrywające cały rok kalendarzowy —
 * od poniedziałku tygodnia zawierającego 1 stycznia, do niedzieli tygodnia zawierającego 31 grudnia.
 */
export function buildYearWeeks(year: number): WeekColumn[] {
  const firstMonday = mondayOf(`${year}-01-01`);
  const lastMonday = mondayOf(`${year}-12-31`);

  const weeks: WeekColumn[] = [];
  let cursor = firstMonday;
  let index = 0;
  let lastMonth = -1;

  while (compareDateOnly(cursor, lastMonday) <= 0) {
    const cursorDate = parseDateOnly(cursor);
    const month = cursorDate.getMonth();
    const isFirstWeekOfMonth = month !== lastMonth;
    lastMonth = month;

    weeks.push({
      weekStart: cursor,
      weekEnd: addDaysToDateOnly(cursor, 6),
      weekIndex: index,
      monthLabel: MONTH_LABELS_PL[month],
      isFirstWeekOfMonth,
    });

    cursor = addDaysToDateOnly(cursor, 7);
    index += 1;
  }

  return weeks;
}

export function formatWeekStartLabel(weekStart: string): string {
  const date = parseDateOnly(weekStart);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

export const MONTH_SHORT_LABELS_PL = [
  "Sty",
  "Lut",
  "Mar",
  "Kwi",
  "Maj",
  "Cze",
  "Lip",
  "Sie",
  "Wrz",
  "Paź",
  "Lis",
  "Gru",
];

export const QUARTER_LABELS_PL = ["I kwartał", "II kwartał", "III kwartał", "IV kwartał"];

export type TimesheetGranularity = "week" | "month";

/** Ujednolicona kolumna okresu — tydzień albo miesiąc, do wspólnego renderowania siatki. */
export type PeriodColumn = {
  /** Poniedziałek tygodnia albo pierwszy dzień miesiąca — klucz okresu. */
  periodStart: string;
  periodEnd: string;
  index: number;
  /** Krótka etykieta kolumny (data początku tygodnia albo skrót miesiąca). */
  label: string;
  /** Etykieta grupy w nagłówku — miesiąc (dla tygodni) albo kwartał (dla miesięcy). */
  groupLabel: string;
  isFirstOfGroup: boolean;
};

export function buildYearWeekColumns(year: number): PeriodColumn[] {
  return buildYearWeeks(year).map((week) => ({
    periodStart: week.weekStart,
    periodEnd: week.weekEnd,
    index: week.weekIndex,
    label: formatWeekStartLabel(week.weekStart),
    groupLabel: week.monthLabel,
    isFirstOfGroup: week.isFirstWeekOfMonth,
  }));
}

export function buildYearMonthColumns(year: number): PeriodColumn[] {
  return Array.from({ length: 12 }, (_, month) => {
    const periodStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const periodEnd = toDateOnly(new Date(year, month + 1, 0));
    return {
      periodStart,
      periodEnd,
      index: month,
      label: MONTH_SHORT_LABELS_PL[month],
      groupLabel: QUARTER_LABELS_PL[Math.floor(month / 3)],
      isFirstOfGroup: month % 3 === 0,
    };
  });
}

export function buildYearPeriodColumns(year: number, granularity: TimesheetGranularity): PeriodColumn[] {
  return granularity === "week" ? buildYearWeekColumns(year) : buildYearMonthColumns(year);
}

/** Poniedziałek tygodnia (granularity="week") albo pierwszy dzień miesiąca (granularity="month") danej daty. */
export function snapDateToGranularity(value: string, granularity: TimesheetGranularity): string {
  if (granularity === "week") {
    return mondayOf(value);
  }
  return `${value.slice(0, 7)}-01`;
}
