import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "green" | "amber" | "red" | "slate";
  size?: "default" | "hero" | "compact";
};

const accentBar = {
  default: "bg-stone-300",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-stone-400",
};

export function MetricCard({
  label,
  value,
  helper,
  tone = "default",
  size = "default",
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden",
        size === "compact" && "min-w-[140px] shrink-0",
        size === "hero" && "shadow-card",
      )}
    >
      <div className={cn("h-1 w-full", accentBar[tone])} aria-hidden />
      <CardContent className={cn(size === "hero" && "py-5", size === "compact" && "py-3")}>
        <p
          className={cn(
            "font-medium uppercase tracking-[0.12em] text-muted",
            size === "hero" ? "text-xs" : "text-[11px]",
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            "mt-2 flex items-end justify-between gap-2",
            size === "hero" && "mt-3",
          )}
        >
          <p
            className={cn(
              "font-semibold tracking-tight text-foreground",
              size === "hero" ? "text-4xl" : size === "compact" ? "text-xl" : "text-2xl sm:text-3xl",
            )}
          >
            {value}
          </p>
          {helper ? (
            <p className="text-right text-[11px] leading-4 text-muted">{helper}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
