"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XpHistoryList } from "@/components/xp/xp-history-list";
import { XpRedemptionForm } from "@/components/xp/xp-redemption-form";
import { XpRedemptionHistory } from "@/components/xp/xp-redemption-history";
import { fetchXpEmployeeDetailAdmin } from "@/lib/supabase/xp-repository";
import type { XpEmployeeAdminDetail } from "@/lib/xp/types";

export default function AdminXpEmployeeDetailPage() {
  const params = useParams();
  const employeeId = String(params.employeeId);
  const [detail, setDetail] = useState<XpEmployeeAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchXpEmployeeDetailAdmin(employeeId)
      .then(setDetail)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać danych.");
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Administracja"
        title={detail ? detail.employeeName : "Punkty XP"}
        description={detail ? `Saldo: ${detail.totalPoints} pkt` : undefined}
        action={
          <Button variant="secondary" asChild>
            <Link href="/admin/punkty-xp">
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
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <XpRedemptionForm
              employeeId={employeeId}
              totalPoints={detail.totalPoints}
              onCreated={() => void load()}
            />
            <XpRedemptionHistory
              employeeId={employeeId}
              redemptions={detail.redemptions}
              onChange={() => void load()}
            />
          </div>
          <XpHistoryList history={detail.history} />
        </div>
      ) : null}
    </>
  );
}
