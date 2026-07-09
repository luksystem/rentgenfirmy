import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalCollectiveView } from "@/components/goals/goal-collective-view";
import { PageHeader } from "@/components/page-header";

export default function GoalCollectivePage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Widok zbiorczy"
        description="Wszystkie cele firmy, zespołów i pracowników w jednym miejscu."
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
      <GoalCollectiveView />
    </>
  );
}
