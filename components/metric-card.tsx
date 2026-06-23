import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "green" | "amber" | "red" | "slate";
  size?: "default" | "hero" | "compact";
  href?: string;
};

const accentBar = {
  default: "bg-zinc-600",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-zinc-500",
};

export function MetricCard({
  label,
  value,
  helper,
  tone = "default",
  size = "default",
  href,
}: MetricCardProps) {
  const card = (
    <Card
      className={cn(
        "overflow-hidden rounded-xl sm:rounded-2xl",
        size === "compact" && "min-w-[96px] shrink-0 sm:min-w-[140px]",
        size === "hero" && "border-accent/20 bg-surface-elevated",
        href &&
          "cursor-pointer transition hover:border-accent/35 hover:bg-surface-muted/20 hover:shadow-md",
      )}
    >
      <div className={cn("h-0.5 w-full sm:h-1", accentBar[tone])} aria-hidden />
      <CardContent
        className={cn(
          "p-2.5 sm:p-5",
          size === "hero" && "py-2 sm:py-5",
          size === "compact" && "py-2 sm:py-3",
          size === "default" && "py-3 sm:py-5",
        )}
      >
        <p
          className={cn(
            "font-medium uppercase leading-tight tracking-[0.1em] text-muted",
            size === "hero" && "text-[9px] sm:text-xs",
            size === "compact" && "text-[9px] sm:text-[11px]",
            size === "default" && "text-[10px] sm:text-[11px]",
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            "mt-1 flex items-end justify-between gap-1 sm:mt-2 sm:gap-2",
            size === "hero" && "sm:mt-3",
          )}
        >
          <p
            className={cn(
              "font-semibold leading-none tracking-tight text-foreground",
              size === "hero" && "text-2xl sm:text-4xl",
              size === "compact" && "text-lg sm:text-xl",
              size === "default" && "text-xl sm:text-2xl md:text-3xl",
            )}
          >
            {value}
          </p>
          {helper ? (
            <p className="hidden text-right text-[11px] leading-4 text-muted sm:block">{helper}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className="block min-w-0">
      {card}
    </Link>
  );
}
