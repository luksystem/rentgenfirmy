import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "green" | "amber" | "red" | "slate";
};

const toneClasses = {
  default: "from-white to-slate-50",
  green: "from-emerald-50 to-white",
  amber: "from-amber-50 to-white",
  red: "from-rose-50 to-white",
  slate: "from-slate-100 to-white",
};

export function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className={cn("bg-gradient-to-br", toneClasses[tone])}>
      <CardContent>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {helper ? <p className="text-right text-xs text-slate-500">{helper}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
