import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MonthlyReviewAiReportContent } from "@/lib/monthly-reviews/types";
import { MONTHLY_REVIEW_DECISION_STATUS_LABELS } from "@/lib/monthly-reviews/types";
import { cn } from "@/lib/utils";

function ReportList({ title, items, tone }: { title: string; items: string[]; tone?: "warning" }) {
  if (!items.length) {
    return null;
  }
  return (
    <div>
      <p
        className={cn(
          "mb-1 text-xs font-semibold uppercase tracking-wide",
          tone === "warning" ? "text-amber-400" : "text-muted",
        )}
      >
        {title}
      </p>
      <ul className="grid gap-1 text-sm text-foreground/90">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-muted">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiReportPanel({ report }: { report: MonthlyReviewAiReportContent }) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Raport AI — zestawienie ocen</p>
        </div>

        <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>

        <ReportList title="Zgodności" items={report.agreements} />
        <ReportList title="Rozbieżności" items={report.discrepancies} tone="warning" />
        <ReportList title="Ryzyka" items={report.risks} tone="warning" />

        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone="blue">
              {MONTHLY_REVIEW_DECISION_STATUS_LABELS[report.recommendation.tier] ?? report.recommendation.label}
            </Badge>
          </div>
          <p className="text-sm text-foreground/90">{report.recommendation.rationale}</p>
        </div>
      </CardContent>
    </Card>
  );
}
