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
  size?: "xs" | "sm" | "md";
}) {
  const iconClass =
    size === "xs"
      ? "h-3 w-3 sm:h-3.5 sm:w-3.5"
      : size === "sm"
        ? "h-4 w-4"
        : "h-6 w-6";
  const scoreClass = size === "xs" ? "ml-1.5 text-xs text-muted" : "ml-2 text-sm font-medium text-foreground";

  return (
    <div className={cn("flex flex-wrap items-center", size === "xs" ? "gap-0.5" : "gap-1")}>
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
      <span className={scoreClass}>
        {value > 0 ? `${value}/${max}` : "—"}
      </span>
    </div>
  );
}

export function StarRatingDisplay({
  value,
  max = 10,
  size = "sm",
  subtle = false,
  showScore = true,
}: {
  value: number;
  max?: number;
  size?: "xs" | "sm" | "md";
  subtle?: boolean;
  showScore?: boolean;
}) {
  const iconClass =
    size === "xs"
      ? "h-2 w-2 sm:h-2.5 sm:w-2.5"
      : size === "sm"
        ? "h-3.5 w-3.5"
        : "h-5 w-5";
  const scoreClass =
    size === "xs" ? "ml-1 text-[10px] sm:text-[11px]" : "ml-1.5 text-xs";

  return (
    <div className="inline-flex items-center gap-px sm:gap-0.5">
      {Array.from({ length: max }, (_, index) => {
        const score = index + 1;
        const active = score <= value;
        return (
          <Star
            key={score}
            className={cn(
              iconClass,
              active
                ? subtle
                  ? "fill-amber-400/70 text-amber-400/70"
                  : "fill-amber-400 text-amber-400"
                : "text-muted/25",
            )}
          />
        );
      })}
      {showScore && value > 0 ? (
        <span className={cn(scoreClass, "font-medium text-muted")}>
          {value}/{max}
        </span>
      ) : null}
    </div>
  );
}
