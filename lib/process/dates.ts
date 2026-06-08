export function milestoneDateToInput(date: string | null | undefined) {
  if (!date) {
    return "";
  }

  return date.slice(0, 10);
}

export function inputToMilestoneDate(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  return value;
}

export function formatMilestoneDate(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
