import { cn } from "@/lib/utils";

type MobileListCardProps = {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  badges?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function MobileListCard({
  title,
  subtitle,
  onClick,
  badges,
  children,
  footer,
  className,
}: MobileListCardProps) {
  const Comp = onClick ? "div" : "div";

  return (
    <Comp
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
        "w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm",
        onClick && "transition hover:border-slate-300 hover:bg-slate-50/50",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-950">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {badges ? <div className="flex shrink-0 flex-wrap justify-end gap-1">{badges}</div> : null}
      </div>
      <div className="grid gap-2 text-sm text-slate-600">{children}</div>
      {footer ? <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div> : null}
    </Comp>
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
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-800">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
