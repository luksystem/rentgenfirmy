"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TeamReviewQueue } from "@/components/monthly-reviews/team-review-queue";
import { ManagerRatingDialog } from "@/components/monthly-reviews/manager-rating-dialog";
import { fetchTeamMonthlyReviewQueue } from "@/lib/supabase/monthly-review-repository";
import { hasFullAppAccess } from "@/lib/auth/types";
import type { MonthlyReviewTeamQueueRow } from "@/lib/monthly-reviews/types";
import { useAuthStore } from "@/store/auth-store";

export default function MonthlyReviewTeamQueuePage() {
  const profile = useAuthStore((state) => state.profile);
  const [rows, setRows] = useState<MonthlyReviewTeamQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<MonthlyReviewTeamQueueRow | null>(null);

  const allowed = Boolean(profile) && hasFullAppAccess(profile!.role);

  const load = useCallback(() => {
    if (!allowed) {
      return Promise.resolve();
    }
    setLoading(true);
    setError(null);
    return fetchTeamMonthlyReviewQueue()
      .then(setRows)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać kolejki ocen.");
      })
      .finally(() => setLoading(false));
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile) {
    return null;
  }

  if (!allowed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted">
          Nie masz uprawnień do oceniania pracowników.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Pracownicy"
        title="Oceny miesięczne"
        description="Oceń pracowników za bieżący miesiąc — nie widzisz treści ich samooceny, żeby Twoja ocena była niezależna."
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
      ) : (
        <TeamReviewQueue rows={rows} onRate={setRating} />
      )}

      {rating ? (
        <ManagerRatingDialog
          row={rating}
          open={Boolean(rating)}
          onOpenChange={(open) => {
            if (!open) {
              setRating(null);
            }
          }}
          onSubmitted={() => void load()}
        />
      ) : null}
    </>
  );
}
