"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
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
  const [saving, setSaving] = useState(false);
  const status = getMilestoneDateStatus(date);
  const classes = MILESTONE_DATE_STATUS_CLASSES[status];
  const formatted = formatMilestoneDate(date);
  const label = formatted ?? "Ustaw datę";
  const isDisabled = disabled || saving;

  async function handleChange(value: string) {
    if (!onSave) {
      return;
    }
    setSaving(true);
    try {
      await onSave(inputToMilestoneDate(value));
    } finally {
      setSaving(false);
    }
  }

  function openPicker(event: MouseEvent | PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (isDisabled) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    // Desktop Chrome często nie otwiera pickera przy opacity:0 na samym kliknięciu labela.
    try {
      if (typeof input.showPicker === "function") {
        void input.showPicker();
        return;
      }
    } catch {
      // fallback poniżej
    }
    input.focus();
    input.click();
  }

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
    <button
      type="button"
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition",
        classes.badge,
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:brightness-110",
      )}
      title="Kliknij, aby ustawić datę kamienia milowego"
      disabled={isDisabled}
      onClick={openPicker}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />
      <CalendarDays className="h-3 w-3" />
      <span>{saving ? "Zapisywanie…" : label}</span>
      <input
        ref={inputRef}
        type="date"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        value={milestoneDateToInput(date)}
        disabled={isDisabled}
        aria-label="Planowana data kamienia milowego"
        onChange={(event) => void handleChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      />
    </button>
  );
}
