"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRatingInput({
  value,
  onChange,
  max = 10,
  disabled,
  size = "md",
}: {
  value: number;
  onChange: (score: number) => void;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: max }, (_, index) => {
        const score = index + 1;
        const active = score <= value;

        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            title={`${score}/${max}`}
            className={cn(
              "rounded-md p-0.5 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50",
              active ? "text-amber-400" : "text-muted/40 hover:text-amber-300/70",
            )}
            onClick={() => onChange(score === value ? 0 : score)}
          >
            <Star className={cn(iconClass, active && "fill-current")} />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-medium text-foreground">
        {value > 0 ? `${value}/${max}` : "—"}
      </span>
    </div>
  );
}

export function StarRatingDisplay({
  value,
  max = 10,
  size = "sm",
}: {
  value: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, index) => {
        const score = index + 1;
        const active = score <= value;
        return (
          <Star
            key={score}
            className={cn(iconClass, active ? "fill-amber-400 text-amber-400" : "text-muted/30")}
          />
        );
      })}
      {value > 0 ? (
        <span className="ml-1.5 text-xs font-medium text-muted">{value}/{max}</span>
      ) : null}
    </div>
  );
}
