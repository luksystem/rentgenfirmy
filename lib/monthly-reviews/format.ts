export function formatPeriodMonthLabel(periodMonth: string): string {
  const date = new Date(`${periodMonth}T12:00:00`);
  const formatter = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });
  const label = formatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
