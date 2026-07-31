"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { computeMyWorkDashboardMetrics } from "@/lib/my-work/dashboard-metrics";
import { useMyWorkStore } from "@/store/my-work-store";

export function MyTasksWidget() {
  const myItems = useMyWorkStore((state) => state.myItems);
  const myItemsLoading = useMyWorkStore((state) => state.myItemsLoading);
  const ensureMyItems = useMyWorkStore((state) => state.ensureMyItems);

  useEffect(() => {
    void ensureMyItems({ sync: false, showLoading: false });
  }, [ensureMyItems]);

  const metrics = useMemo(
    () =>
      computeMyWorkDashboardMetrics({ items: myItems, obstacles: [], weekPlans: [], profilesById: {} }),
    [myItems],
  );

  return (
    <Link href="/moja-praca/zadania" className="block min-w-0">
      <Card className="cursor-pointer transition hover:border-accent/40 hover:shadow-md">
        <CardContent className="grid gap-3 py-4">
          <p className="font-semibold text-foreground">Moje zadania</p>
          {myItemsLoading && !myItems.length ? (
            <p className="text-sm text-muted">Wczytywanie…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted">Otwarte</p>
                <p className="text-xl font-semibold text-foreground">{metrics.totalOpen}</p>
              </div>
              <div>
                <p className="text-muted">Przeterminowane</p>
                <p
                  className={
                    metrics.overdueCount > 0
                      ? "text-xl font-semibold text-rose-500"
                      : "text-xl font-semibold text-foreground"
                  }
                >
                  {metrics.overdueCount}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
