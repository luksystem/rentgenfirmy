"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAdminMonthlyReviewList } from "@/lib/supabase/monthly-review-repository";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";
import { MONTHLY_REVIEW_DECISION_STATUS_LABELS, type MonthlyReviewAdminListRow } from "@/lib/monthly-reviews/types";

export default function AdminMonthlyReviewListPage() {
  const [rows, setRows] = useState<MonthlyReviewAdminListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchAdminMonthlyReviewList()
      .then(setRows)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać listy.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = rows[0] ? formatPeriodMonthLabel(rows[0].review.periodMonth) : "bieżący miesiąc";

  return (
    <>
      <PageHeader
        eyebrow="Administracja"
        title="Oceny miesięczne"
        description={`Zestawienie samoocen i ocen przełożonych — ${periodLabel}.`}
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
      ) : !rows.length ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak ocen za bieżący miesiąc — pojawią się tu, gdy pracownicy zaczną składać samooceny.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Link key={row.review.id} href={`/admin/oceny-miesieczne/${row.review.id}`}>
              <Card className="transition hover:border-accent/40 hover:bg-surface-muted/20">
                <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-foreground">{row.employeeName}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={row.review.selfSubmittedAt ? "active" : "waiting"}>
                      {row.review.selfSubmittedAt ? "Samoocena" : "Brak samooceny"}
                    </Badge>
                    <Badge tone={row.review.managerSubmittedAt ? "active" : "waiting"}>
                      {row.review.managerSubmittedAt ? "Ocena managera" : "Brak oceny managera"}
                    </Badge>
                    <Badge tone={row.decisionStatus && row.decisionStatus !== "pending" ? "active" : "neutral"}>
                      {row.decisionStatus
                        ? MONTHLY_REVIEW_DECISION_STATUS_LABELS[row.decisionStatus]
                        : "Bez decyzji"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
