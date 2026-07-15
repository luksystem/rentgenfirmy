import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReviewMeetingSummary } from "@/components/goals/review-meeting/review-meeting-summary";
import { PageHeader } from "@/components/page-header";

export default async function GoalReviewMeetingSummaryPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  return (
    <>
      <PageHeader
        eyebrow="Przegląd celów"
        title="Podsumowanie spotkania"
        description="AI przygotuje raport z notatek, ocen i zadań — potem trafi do archiwum Raporty."
        action={
          <Link
            href="/tablice-celow/raporty"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Raporty
          </Link>
        }
      />
      <ReviewMeetingSummary meetingId={meetingId} />
    </>
  );
}
