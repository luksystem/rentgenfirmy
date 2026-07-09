import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalsHistoryInsights } from "@/components/goals/goals-history-insights";
import { PageHeader } from "@/components/page-header";

export default function GoalsHistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Historia i wnioski"
        description="Kto dowozi cele, jakie cele nie są dowożone, kto w ogóle ustala sobie cele i jak zmienia się to w czasie."
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
      <GoalsHistoryInsights />
    </>
  );
}
