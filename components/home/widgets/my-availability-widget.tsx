"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useLeaveStore } from "@/store/leave-store";

export function MyAvailabilityWidget() {
  const myRequests = useLeaveStore((state) => state.myRequests);
  const myRequestsLoading = useLeaveStore((state) => state.myRequestsLoading);
  const ensureMyRequests = useLeaveStore((state) => state.ensureMyRequests);

  useEffect(() => {
    void ensureMyRequests();
  }, [ensureMyRequests]);

  const { pendingCount, nextApproved } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pending = myRequests.filter((request) => request.status === "pending");
    const upcomingApproved = myRequests
      .filter((request) => request.status === "approved" && request.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    return { pendingCount: pending.length, nextApproved: upcomingApproved[0] ?? null };
  }, [myRequests]);

  return (
    <Link href="/moja-praca/dostepnosc" className="block min-w-0">
      <Card className="cursor-pointer transition hover:border-accent/40 hover:shadow-md">
        <CardContent className="grid gap-2 py-4">
          <p className="font-semibold text-foreground">Moja dostępność</p>
          {myRequestsLoading && !myRequests.length ? (
            <p className="text-sm text-muted">Wczytywanie…</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Wnioski oczekujące: <span className="font-medium text-foreground">{pendingCount}</span>
              </p>
              <p className="text-sm text-muted">
                {nextApproved
                  ? `Najbliższy urlop: ${nextApproved.startDate} – ${nextApproved.endDate}`
                  : "Brak zaplanowanego urlopu"}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
