import { formatDate } from "@/lib/utils";

export function toDateKey(value: Date | string = new Date()) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekRangeFromMonday(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const from = date.toISOString().slice(0, 10);
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return { from, to: end.toISOString().slice(0, 10) };
}

export function currentWeekMonday(reference: Date | string = new Date()) {
  return weekRangeFromMonday(toDateKey(reference)).from;
}

export function formatWeekRangeLabel(from: string, to: string) {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function buildWeekPlanOptions(weeksAhead = 8) {
  const startMonday = currentWeekMonday();
  const options: { value: string; label: string; from: string; to: string }[] = [];

  for (let offset = 0; offset <= weeksAhead; offset += 1) {
    const monday = addDays(startMonday, offset * 7);
    const { from, to } = weekRangeFromMonday(monday);
    const rangeLabel = formatWeekRangeLabel(from, to);
    let label = rangeLabel;
    if (offset === 0) {
      label = `Bieżący tydzień (${rangeLabel})`;
    } else if (offset === 1) {
      label = `Następny tydzień (${rangeLabel})`;
    }
    options.push({ value: from, label, from, to });
  }

  return options;
}
