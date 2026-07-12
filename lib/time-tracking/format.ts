export function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return "0 min";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const hoursOnly = /^(\d+(?:[.,]\d+)?)\s*h(?:ours?)?$/.exec(trimmed);
  if (hoursOnly) {
    const hours = Number.parseFloat(hoursOnly[1].replace(",", "."));
    return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null;
  }

  const minutesOnly = /^(\d+)\s*m(?:in(?:utes?)?)?$/.exec(trimmed);
  if (minutesOnly) {
    const minutes = Number.parseInt(minutesOnly[1], 10);
    return minutes > 0 ? minutes : null;
  }

  const combined = /^(\d+)\s*h\s*(\d+)\s*m(?:in)?$/.exec(trimmed);
  if (combined) {
    const hours = Number.parseInt(combined[1], 10);
    const minutes = Number.parseInt(combined[2], 10);
    const total = hours * 60 + minutes;
    return total > 0 ? total : null;
  }

  const decimalHours = Number.parseFloat(trimmed.replace(",", "."));
  if (Number.isFinite(decimalHours) && decimalHours > 0) {
    return Math.round(decimalHours * 60);
  }

  return null;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfWeekSunday(monday: Date): Date {
  const copy = new Date(monday);
  copy.setDate(copy.getDate() + 6);
  return copy;
}
