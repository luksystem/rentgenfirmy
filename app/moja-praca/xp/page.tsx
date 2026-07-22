"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { XpSummaryCard } from "@/components/xp/xp-summary-card";
import { XpHistoryList } from "@/components/xp/xp-history-list";
import { XpLeaderboard } from "@/components/xp/xp-leaderboard";
import { xpIcon } from "@/components/xp/xp-icon-map";
import {
  fetchMyXpSummary,
  fetchXpCriteriaPublic,
  fetchXpLeaderboard,
} from "@/lib/supabase/xp-repository";
import type { XpCriterion, XpEmployeeSummary, XpLeaderboardRow } from "@/lib/xp/types";
import { useAuthStore } from "@/store/auth-store";

export default function XpPage() {
  const profile = useAuthStore((state) => state.profile);
  const [summary, setSummary] = useState<XpEmployeeSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<XpLeaderboardRow[]>([]);
  const [criteria, setCriteria] = useState<XpCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchMyXpSummary(), fetchXpLeaderboard(), fetchXpCriteriaPublic()])
      .then(([summaryResult, leaderboardResult, criteriaResult]) => {
        if (cancelled) return;
        setSummary(summaryResult);
        setLeaderboard(leaderboardResult);
        setCriteria(criteriaResult);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać punktów XP.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Moja praca"
        title="Punkty XP"
        description="Punkty naliczają się automatycznie — za oceny miesięczne, terminowe godziny i zadania, jakość pracy i dopięte cele."
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
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            {summary ? <XpSummaryCard summary={summary} /> : null}
            {summary ? <XpHistoryList history={summary.history} /> : null}
          </div>
          <div className="grid gap-4">
            <XpLeaderboard rows={leaderboard} highlightEmployeeId={profile?.id} />
            {criteria.length ? (
              <Card>
                <CardContent className="grid gap-2 pt-6">
                  <p className="text-sm font-semibold text-foreground">Jak zdobyć punkty</p>
                  <ul className="grid gap-2">
                    {criteria.map((criterion) => {
                      const Icon = xpIcon("sparkles");
                      return (
                        <li key={criterion.id} className="flex items-start gap-2 text-sm">
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span className="text-foreground/90">
                            {criterion.label}
                            <span className="text-muted"> — +{criterion.points} pkt</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
