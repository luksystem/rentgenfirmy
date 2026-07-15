import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalReviewReportsList } from "@/components/goals/review-meeting/goal-review-reports-list";
import { PageHeader } from "@/components/page-header";

export default function GoalReviewReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Raporty przeglądów"
        description="Archiwum zakończonych spotkań przeglądu celów z podsumowaniem SI."
        action={
          <Link
            href="/tablice-celow"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć
          </Link>
        }
      />
      <GoalReviewReportsList />
    </>
  );
}
