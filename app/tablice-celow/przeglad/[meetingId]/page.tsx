import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReviewMeetingSession } from "@/components/goals/review-meeting/review-meeting-session";
import { PageHeader } from "@/components/page-header";

export default async function GoalReviewMeetingSessionPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  return (
    <>
      <PageHeader
        eyebrow="Przegląd celów"
        title="Sesja przeglądu"
        description="Jeden cel na ekranie — skupienie, timer i notatki."
        action={
          <Link
            href="/tablice-celow"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Hub
          </Link>
        }
      />
      <ReviewMeetingSession meetingId={meetingId} />
    </>
  );
}
