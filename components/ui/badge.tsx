import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "active" | "waiting" | "critical" | "closed" | "neutral" | "blue";
  className?: string;
};

const toneClasses = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  waiting: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  closed: "border-border bg-surface-muted text-muted",
  neutral: "border-border bg-surface-muted text-foreground/80",
  blue: "border-teal-500/30 bg-teal-500/10 text-teal-300",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "active" && "bg-emerald-400",
          tone === "waiting" && "bg-amber-400",
          tone === "critical" && "bg-rose-400",
          tone === "closed" && "bg-zinc-500",
          tone === "neutral" && "bg-zinc-500",
          tone === "blue" && "bg-teal-400",
        )}
        aria-hidden
      />
      {children}
    </span>
  );
}
