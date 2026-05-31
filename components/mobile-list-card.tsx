import { cn } from "@/lib/utils";

type MobileListCardProps = {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  badges?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  accent?: "default" | "green" | "amber" | "red";
};

const accentBar = {
  default: "bg-stone-300",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};

export function MobileListCard({
  title,
  subtitle,
  onClick,
  badges,
  children,
  footer,
  className,
  accent = "default",
}: MobileListCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "w-full overflow-hidden rounded-3xl border border-border/80 bg-surface text-left shadow-soft",
        onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card",
        className,
      )}
    >
      <div className={cn("h-1 w-full", accentBar[accent])} aria-hidden />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground">{title}</p>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {badges ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">{badges}</div>
          ) : null}
        </div>
        <div className="grid gap-2 text-sm text-stone-600">{children}</div>
        {footer ? <div className="mt-3 border-t border-border/60 pt-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function MobileField({
  label,
  value,
  stack = false,
}: {
  label: string;
  value: React.ReactNode;
  stack?: boolean;
}) {
  if (stack) {
    return (
      <div className="grid gap-1">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-stone-800">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-stone-800">{value}</span>
    </div>
  );
}
