import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalsSummaryDashboard } from "@/components/goals/goals-summary-dashboard";
import { PageHeader } from "@/components/page-header";

export default function GoalsSummaryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Podsumowanie realizacji"
        description="Stan bieżącego okresu: realizacja per zespół/osoba/typ tablicy oraz cele wymagające uwagi."
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
      <GoalsSummaryDashboard />
    </>
  );
}
