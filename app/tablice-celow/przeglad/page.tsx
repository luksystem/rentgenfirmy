import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReviewMeetingWizard } from "@/components/goals/review-meeting/review-meeting-wizard";
import { PageHeader } from "@/components/page-header";

export default async function GoalReviewMeetingWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ boardId?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Przegląd celów"
        description="Kreator spotkania: uczestnicy, czas, deep-dive, potem fokus na jeden cel z timerem."
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
      <ReviewMeetingWizard initialBoardId={params.boardId} />
    </>
  );
}
