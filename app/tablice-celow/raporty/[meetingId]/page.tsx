import { GoalReviewReportDetail } from "@/components/goals/review-meeting/goal-review-report-detail";
import { PageHeader } from "@/components/page-header";

export default async function GoalReviewReportDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  return (
    <>
      <PageHeader
        eyebrow="Raporty"
        title="Raport przeglądu celów"
        description="Zarchiwizowane podsumowanie SI, notatki i zadania ze spotkania."
      />
      <GoalReviewReportDetail meetingId={meetingId} />
    </>
  );
}
