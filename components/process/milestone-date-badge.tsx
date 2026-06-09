"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import {
  formatMilestoneDate,
  getMilestoneDateStatus,
  inputToMilestoneDate,
  MILESTONE_DATE_STATUS_CLASSES,
  milestoneDateToInput,
} from "@/lib/process/dates";
import { cn } from "@/lib/utils";

export function MilestoneDateBadge({
  date,
  editable = false,
  disabled = false,
  onSave,
}: {
  date: string | null | undefined;
  editable?: boolean;
  disabled?: boolean;
  onSave?: (date: string | null) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const status = getMilestoneDateStatus(date);
  const classes = MILESTONE_DATE_STATUS_CLASSES[status];
  const formatted = formatMilestoneDate(date);

  function openPicker() {
    if (!editable || disabled) {
      return;
    }
    inputRef.current?.showPicker?.();
    inputRef.current?.click();
  }

  async function handleChange(value: string) {
    if (!onSave) {
      return;
    }
    await onSave(inputToMilestoneDate(value));
  }

  const label = formatted ?? "Ustaw datę";

  if (!editable) {
    if (!formatted) {
      return null;
    }
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium",
          classes.badge,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />
        <CalendarDays className="h-3 w-3" />
        {formatted}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition",
          classes.badge,
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
        title="Kliknij, aby ustawić datę kamienia milowego"
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />
        <CalendarDays className="h-3 w-3" />
        {label}
      </button>
      <input
        ref={inputRef}
        type="date"
        className="sr-only"
        value={milestoneDateToInput(date)}
        disabled={disabled}
        onChange={(event) => void handleChange(event.target.value)}
      />
    </>
  );
}
