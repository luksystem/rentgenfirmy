"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StarRatingDisplay } from "@/components/dashboard/star-rating-input";
import { HoursContextCard } from "@/components/monthly-reviews/hours-context-card";
import { SelfAssessmentForm } from "@/components/monthly-reviews/self-assessment-form";
import { ManagerAssessmentView } from "@/components/monthly-reviews/manager-assessment-view";
import { AiReportPanel } from "@/components/monthly-reviews/ai-report-panel";
import { fetchMyMonthlyReview } from "@/lib/supabase/monthly-review-repository";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";
import type { MonthlyReviewSelfView } from "@/lib/monthly-reviews/types";

export default function MonthlyReviewPage() {
  const [view, setView] = useState<MonthlyReviewSelfView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchMyMonthlyReview()
      .then(setView)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać oceny.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const periodMonthLabel = view ? formatPeriodMonthLabel(view.periodMonth) : "";

  return (
    <>
      <PageHeader
        eyebrow="Moja praca"
        title="Oceny miesięczne"
        description="Co miesiąc oceniasz sam siebie — Twój przełożony robi to niezależnie, bez wglądu w Twoją samoocenę."
      />

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Wczytywanie…
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-rose-400">{error}</CardContent>
        </Card>
      ) : !view?.participates ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted">
            Nie uczestniczysz w cyklu ocen miesięcznych. Jeśli to pomyłka, skontaktuj się z
            administratorem.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <HoursContextCard />

          {view.selfAssessment ? (
            <Card>
              <CardContent className="grid gap-3 pt-6">
                <p className="text-sm font-semibold text-foreground">
                  Twoja samoocena — {periodMonthLabel}
                </p>
                <StarRatingDisplay value={view.selfAssessment.rating} max={10} size="md" />
                <p className="text-sm leading-relaxed text-foreground/90">
                  {view.selfAssessment.comment}
                </p>
                <p className="text-xs text-muted">
                  {view.review?.managerSubmittedAt
                    ? "Przełożony również już ocenił ten miesiąc."
                    : "Czekamy jeszcze na ocenę przełożonego."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <SelfAssessmentForm periodMonthLabel={periodMonthLabel} onSubmitted={setView} />
          )}

          {view.managerAssessment ? (
            <ManagerAssessmentView assessment={view.managerAssessment} />
          ) : null}

          {view.aiReport ? <AiReportPanel report={view.aiReport} /> : null}
        </div>
      )}
    </>
  );
}
