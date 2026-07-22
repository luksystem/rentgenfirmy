"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XpCriteriaEditor } from "@/components/xp/xp-criteria-editor";
import { fetchXpAdminEmployeeList } from "@/lib/supabase/xp-repository";
import type { XpLeaderboardRow } from "@/lib/xp/types";

export default function AdminXpListPage() {
  const [employees, setEmployees] = useState<XpLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchXpAdminEmployeeList()
      .then(setEmployees)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać listy.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Administracja"
        title="Punkty XP"
        description="Kryteria naliczania punktów, saldo pracowników i wymiana punktów na premię."
        action={
          <Button variant="secondary" asChild>
            <Link href="/admin/punkty-xp/ustawienia">
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        <XpCriteriaEditor />

        <Card>
          <CardContent className="grid gap-3 pt-6">
            <p className="text-sm font-semibold text-foreground">Pracownicy</p>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Wczytywanie…
              </p>
            ) : error ? (
              <p className="text-sm text-rose-400">{error}</p>
            ) : (
              <div className="grid gap-2">
                {employees.map((row) => (
                  <Link key={row.employeeId} href={`/admin/punkty-xp/${row.employeeId}`}>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2.5 text-sm transition hover:border-accent/40">
                      <span className="text-foreground/90">{row.employeeName}</span>
                      <span className="font-semibold text-foreground">{row.totalPoints} XP</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
