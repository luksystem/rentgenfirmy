"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { XpSummaryCard } from "@/components/xp/xp-summary-card";
import { fetchMyXpSummary } from "@/lib/supabase/xp-repository";
import type { XpEmployeeSummary } from "@/lib/xp/types";

export function MyXpWidget() {
  const [summary, setSummary] = useState<XpEmployeeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchMyXpSummary()
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">Wczytywanie…</CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return <XpSummaryCard summary={summary} />;
}
