"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** xs = dashboard (najmniejsze), sm = standard UI, md = rzadko — większe akcenty */
const INPUT_ICON_CLASS = {
  xs: "h-2.5 w-2.5 sm:h-3 sm:w-3",
  sm: "h-3.5 w-3.5 sm:h-4 sm:w-4",
  md: "h-5 w-5",
} as const;

const DISPLAY_ICON_CLASS = {
  xs: "h-2 w-2 sm:h-2.5 sm:w-2.5",
  sm: "h-3 w-3 sm:h-3.5 sm:w-3.5",
  md: "h-4 w-4",
} as const;

export function StarRatingInput({
  value,
  onChange,
  max = 10,
  disabled,
  size = "sm",
  subtle = false,
}: {
  value: number;
  onChange: (score: number) => void;
  max?: number;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  subtle?: boolean;
}) {
  const iconClass = INPUT_ICON_CLASS[size];
  const scoreClass =
    size === "xs"
      ? "ml-1.5 text-xs text-muted"
      : size === "sm"
        ? "ml-1.5 text-xs font-medium text-foreground sm:text-sm"
        : "ml-2 text-sm font-medium text-foreground";

  return (
    <div className={cn("flex flex-wrap items-center", size === "xs" ? "gap-px" : "gap-0.5 sm:gap-1")}>
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
              "rounded-md p-0.5 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? subtle
                  ? "text-amber-400/75"
                  : "text-amber-400"
                : "text-muted/40 hover:text-amber-300/70",
            )}
            onClick={() => onChange(score === value ? 0 : score)}
          >
            <Star
              className={cn(
                iconClass,
                active && (subtle ? "fill-amber-400/70" : "fill-current"),
              )}
            />
          </button>
        );
      })}
      <span className={scoreClass}>{value > 0 ? `${value}/${max}` : "—"}</span>
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
  const iconClass = DISPLAY_ICON_CLASS[size];
  const scoreClass =
    size === "xs" ? "ml-1 text-[10px] sm:text-[11px]" : "ml-1.5 text-[11px] sm:text-xs";

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
