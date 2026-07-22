"use client";

import { useState } from "react";
import { Share2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRatingDisplay } from "@/components/dashboard/star-rating-input";
import { AiReportPanel } from "@/components/monthly-reviews/ai-report-panel";
import { DecisionForm } from "@/components/monthly-reviews/decision-form";
import {
  resetManagerAssessment,
  shareAiReportWithEmployee,
} from "@/lib/supabase/monthly-review-repository";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";
import type { MonthlyReviewAdminDetail } from "@/lib/monthly-reviews/types";

export function AdminReviewDetail({
  detail,
  onChange,
}: {
  detail: MonthlyReviewAdminDetail;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setBusy(true);
    setError(null);
    try {
      await shareAiReportWithEmployee(detail.review.id);
      onChange();
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Nie udało się udostępnić raportu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Cofnąć ocenę przełożonego? Będzie mógł ocenić ponownie od zera.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetManagerAssessment(detail.review.id);
      onChange();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Nie udało się cofnąć oceny.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">{detail.employeeName}</h2>
        <Badge tone="neutral">{formatPeriodMonthLabel(detail.review.periodMonth)}</Badge>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6">
          <p className="text-sm font-semibold text-foreground">Samoocena pracownika</p>
          {detail.selfAssessment ? (
            <>
              <StarRatingDisplay value={detail.selfAssessment.rating} max={10} size="md" />
              <p className="text-sm leading-relaxed text-foreground/90">{detail.selfAssessment.comment}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Jeszcze nie złożona.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Ocena przełożonego {detail.managerName ? `— ${detail.managerName}` : ""}
            </p>
            {detail.managerAssessment ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleReset()}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Cofnij
              </Button>
            ) : null}
          </div>
          {detail.managerAssessment ? (
            <>
              <StarRatingDisplay value={detail.managerAssessment.rating} max={10} size="md" />
              <p className="text-sm leading-relaxed text-foreground/90">{detail.managerAssessment.comment}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Jeszcze nie złożona.</p>
          )}
        </CardContent>
      </Card>

      {detail.aiReport?.report ? (
        <div className="grid gap-2">
          <AiReportPanel report={detail.aiReport.report} />
          <div className="flex items-center gap-2">
            {detail.aiReport.sharedWithEmployeeAt ? (
              <Badge tone="active">Udostępniono pracownikowi</Badge>
            ) : (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void handleShare()}>
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Udostępnij pracownikowi
              </Button>
            )}
          </div>
        </div>
      ) : detail.aiReport?.status === "error" ? (
        <Card>
          <CardContent className="pt-6 text-sm text-rose-400">
            Nie udało się wygenerować raportu AI: {detail.aiReport.errorMessage}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted">
            Raport AI pojawi się po złożeniu obu ocen.
          </CardContent>
        </Card>
      )}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <DecisionForm reviewId={detail.review.id} decision={detail.decision} onSaved={onChange} />
    </div>
  );
}
