// Polskie dni ustawowo wolne od pracy — używane do wyszarzania osi czasu w Gantcie
// Planu Zasobów. Święta o dacie stałej + święta ruchome liczone względem Wielkanocy
// (algorytm Meeusa/Jonesa/Butchera, kalendarz gregoriański).

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDaysToDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const holidayCache = new Map<number, Map<string, string>>();

function buildHolidaysForYear(year: number): Map<string, string> {
  const easter = easterSunday(year);
  const entries: Array<[Date, string]> = [
    [new Date(year, 0, 1), "Nowy Rok"],
    [new Date(year, 0, 6), "Trzech Króli"],
    [addDaysToDate(easter, 1), "Poniedziałek Wielkanocny"],
    [new Date(year, 4, 1), "Święto Pracy"],
    [new Date(year, 4, 3), "Święto Konstytucji 3 Maja"],
    [addDaysToDate(easter, 49), "Zielone Świątki"],
    [addDaysToDate(easter, 60), "Boże Ciało"],
    [new Date(year, 7, 15), "Wniebowzięcie Najświętszej Maryi Panny"],
    [new Date(year, 10, 1), "Wszystkich Świętych"],
    [new Date(year, 10, 11), "Święto Niepodległości"],
    [new Date(year, 11, 25), "Boże Narodzenie (1. dzień)"],
    [new Date(year, 11, 26), "Boże Narodzenie (2. dzień)"],
  ];
  const map = new Map<string, string>();
  entries.forEach(([date, name]) => map.set(dateKey(date), name));
  return map;
}

function holidaysForYear(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const built = buildHolidaysForYear(year);
  holidayCache.set(year, built);
  return built;
}

/** Zwraca nazwę święta dla danego dnia albo null, jeśli to dzień roboczy. */
export function getPolishHolidayName(date: Date): string | null {
  return holidaysForYear(date.getFullYear()).get(dateKey(date)) ?? null;
}
