import { Card, CardContent } from "@/components/ui/card";
import { StarRatingDisplay } from "@/components/dashboard/star-rating-input";
import type { MonthlyManagerAssessment } from "@/lib/monthly-reviews/types";

export function ManagerAssessmentView({ assessment }: { assessment: MonthlyManagerAssessment }) {
  return (
    <Card>
      <CardContent className="grid gap-3 pt-6">
        <p className="text-sm font-semibold text-foreground">Ocena przełożonego</p>
        <StarRatingDisplay value={assessment.rating} max={10} size="md" />
        <p className="text-sm leading-relaxed text-foreground/90">{assessment.comment}</p>
      </CardContent>
    </Card>
  );
}
