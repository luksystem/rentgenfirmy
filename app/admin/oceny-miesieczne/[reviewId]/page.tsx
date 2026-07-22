"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminReviewDetail } from "@/components/monthly-reviews/admin-review-detail";
import { fetchAdminMonthlyReviewDetail } from "@/lib/supabase/monthly-review-repository";
import type { MonthlyReviewAdminDetail } from "@/lib/monthly-reviews/types";

export default function AdminMonthlyReviewDetailPage() {
  const params = useParams();
  const reviewId = String(params.reviewId);
  const [detail, setDetail] = useState<MonthlyReviewAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchAdminMonthlyReviewDetail(reviewId)
      .then(setDetail)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać oceny.");
      })
      .finally(() => setLoading(false));
  }, [reviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Administracja"
        title="Ocena miesięczna"
        action={
          <Button variant="secondary" asChild>
            <Link href="/admin/oceny-miesieczne">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do listy
            </Link>
          </Button>
        }
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
      ) : detail ? (
        <AdminReviewDetail detail={detail} onChange={() => void load()} />
      ) : null}
    </>
  );
}
