"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { KpiSettingsTable } from "@/components/raport-firmy/kpi-settings-table";
import { fetchReportKpiConfigAdmin } from "@/lib/supabase/report-kpi-config-repository";
import type { ReportKpiConfigRow } from "@/lib/report-kpi/types";

export default function ReportKpiSettingsPage() {
  const [items, setItems] = useState<ReportKpiConfigRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportKpiConfigAdmin()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Nie udało się wczytać danych."));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Raport firmowy"
        title="Konfiguracja KPI"
        description="Wybierz, które wskaźniki widać na kafelkach, ustaw progi warn/crit i okres odniesienia dla każdego z nich."
      />

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-rose-400">{error}</CardContent>
        </Card>
      ) : !items ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">Wczytywanie...</CardContent>
        </Card>
      ) : (
        <KpiSettingsTable items={items} />
      )}
    </>
  );
}
