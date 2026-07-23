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

export type MilestoneDateStatus = "none" | "ok" | "warning30" | "warning7" | "overdue";

export function getMilestoneDateStatus(date: string | null | undefined): MilestoneDateStatus {
  if (!date) {
    return "none";
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const deadline = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(deadline.getTime())) {
    return "none";
  }

  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 7) {
    return "warning7";
  }
  if (diffDays <= 30) {
    return "warning30";
  }
  return "ok";
}

export const MILESTONE_DATE_STATUS_CLASSES: Record<
  MilestoneDateStatus,
  { badge: string; dot: string }
> = {
  none: {
    badge: "border-dashed border-accent/50 bg-accent/5 text-accent hover:border-accent hover:bg-accent/10",
    dot: "bg-accent/70",
  },
  ok: {
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/50",
    dot: "bg-emerald-400",
  },
  warning30: {
    badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200 hover:border-yellow-400/50",
    dot: "bg-yellow-400",
  },
  warning7: {
    badge: "border-orange-500/40 bg-orange-500/10 text-orange-200 hover:border-orange-400/50",
    dot: "bg-orange-400",
  },
  overdue: {
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:border-rose-400/50",
    dot: "bg-rose-400",
  },
};

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
