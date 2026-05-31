import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "active" | "waiting" | "critical" | "closed" | "neutral" | "blue";
  className?: string;
};

const toneClasses = {
  active: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  waiting: "border-amber-200/80 bg-amber-50 text-amber-800",
  critical: "border-rose-200/80 bg-rose-50 text-rose-800",
  closed: "border-stone-200 bg-stone-100 text-stone-600",
  neutral: "border-border bg-surface text-stone-700",
  blue: "border-teal-200/80 bg-teal-50 text-teal-800",
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
          tone === "active" && "bg-emerald-500",
          tone === "waiting" && "bg-amber-500",
          tone === "critical" && "bg-rose-500",
          tone === "closed" && "bg-stone-400",
          tone === "neutral" && "bg-stone-400",
          tone === "blue" && "bg-teal-500",
        )}
        aria-hidden
      />
      {children}
    </span>
  );
}
