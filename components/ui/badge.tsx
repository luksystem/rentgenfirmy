import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "active" | "waiting" | "critical" | "closed" | "neutral" | "blue";
  className?: string;
};

const toneClasses = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  waiting: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  closed: "border-slate-200 bg-slate-100 text-slate-600",
  neutral: "border-slate-200 bg-white text-slate-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
