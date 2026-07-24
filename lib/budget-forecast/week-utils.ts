const MONTH_LABELS_PL = [
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
