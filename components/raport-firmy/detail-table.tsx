import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DetailRow } from "@/lib/report-kpi/types";

const SEVERITY_DOT: Record<NonNullable<DetailRow["severity"]>, string> = {
  good: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-rose-400",
};

export function DetailTable({ title, rows }: { title: string; rows: DetailRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1 py-2">
        {rows.map((row) => {
          const content = (
            <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted">
              <div className="flex items-center gap-2 min-w-0">
                {row.severity ? (
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_DOT[row.severity])} aria-hidden />
                ) : null}
                <span className="truncate font-medium text-foreground">{row.label}</span>
              </div>
              {row.sublabel ? (
                <span className="shrink-0 text-sm text-muted">{row.sublabel}</span>
              ) : null}
            </div>
          );

          return row.href ? (
            <Link key={row.id} href={row.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={row.id}>{content}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
