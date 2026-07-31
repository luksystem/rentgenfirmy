"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  countOpenKanbanTasksForAssignee,
  countOverdueKanbanTasksForAssignee,
} from "@/lib/supabase/kanban-repository";
import { useAuthStore } from "@/store/auth-store";

export function MyKanbanWidget() {
  const userId = useAuthStore((state) => state.profile?.id);
  const [counts, setCounts] = useState<{ open: number; overdue: number } | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      countOpenKanbanTasksForAssignee(userId),
      countOverdueKanbanTasksForAssignee(userId),
    ])
      .then(([open, overdue]) => {
        if (!cancelled) {
          setCounts({ open, overdue });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCounts({ open: 0, overdue: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Link href="/tablice-wdrozen" className="block min-w-0">
      <Card className="cursor-pointer transition hover:border-accent/40 hover:shadow-md">
        <CardContent className="grid gap-3 py-4">
          <p className="font-semibold text-foreground">Moje zadania na tablicach</p>
          {counts === null ? (
            <p className="text-sm text-muted">Wczytywanie…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted">Otwarte</p>
                <p className="text-xl font-semibold text-foreground">{counts.open}</p>
              </div>
              <div>
                <p className="text-muted">Przeterminowane</p>
                <p
                  className={
                    counts.overdue > 0
                      ? "text-xl font-semibold text-rose-500"
                      : "text-xl font-semibold text-foreground"
                  }
                >
                  {counts.overdue}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
