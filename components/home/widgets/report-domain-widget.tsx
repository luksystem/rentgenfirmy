"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DomainTile } from "@/components/raport-firmy/domain-tile";
import { useRaportFirmyData } from "@/hooks/use-raport-firmy-data";
import type { DomainReport } from "@/lib/report-kpi/types";

const SUBTITLES: Record<DomainReport["domain"], string> = {
  team: "Zadania, plan pracy, urlopy, nadgodziny — cała firma",
  growth: "Ranking XP, oceny miesięczne, cele managerów",
  sales: "Oferty, rozliczenia, zapotrzebowania",
  service: "Zgłoszenia serwisowe i przeglądy",
  deployment: "Tablice kanban i kamienie milowe procesów",
  budget: "Przychód, prognoza płynności, faktury",
};

export function ReportDomainWidget({ domain }: { domain: DomainReport["domain"] }) {
  const router = useRouter();
  const { data, isLoading, error } = useRaportFirmyData();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">Wczytywanie…</CardContent>
      </Card>
    );
  }

  const report = data?.[domain];
  if (error || !report) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-rose-400">
          {error ?? "Brak danych dla tego widżetu."}
        </CardContent>
      </Card>
    );
  }

  return (
    <DomainTile report={report} subtitle={SUBTITLES[domain]} onOpen={() => router.push("/raport")} />
  );
}
