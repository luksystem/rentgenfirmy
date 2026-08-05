"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  fetchProjectReadiness,
  type ProjectReadinessRow,
  type ProjectReadinessStatus,
} from "@/lib/supabase/project-readiness-repository";
import { useAuthStore } from "@/store/auth-store";

const READINESS_COLUMNS: { key: keyof ProjectReadinessRow; label: string }[] = [
  { key: "etapAktualny", label: "Etap aktualny" },
  { key: "slotyObsadzone", label: "Sloty obsadzone" },
  { key: "liderEtapu", label: "Lider etapu" },
  { key: "profilKlienta", label: "Profil klienta" },
  { key: "kanalKomunikacji", label: "Kanał komunikacji" },
  { key: "rotPrzeniesioneZWlascicielemIDataKontroli", label: "ROT — bez zaległości (data kontroli)" },
  { key: "podmiotyZewnetrzneKtoZatrudnia", label: "Podmioty zewnętrzne — kto zatrudnia" },
  { key: "dataOstatniegoKontaktu", label: "Data ostatniego kontaktu" },
];

function StatusIcon({ status }: { status: ProjectReadinessStatus }) {
  if (status === "spełnione") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="spełnione" />;
  }
  if (status === "nie_spełnione") {
    return <AlertTriangle className="h-4 w-4 text-rose-400" aria-label="nie spełnione" />;
  }
  return <HelpCircle className="h-4 w-4 text-muted" aria-label="niedostępne — pole nie istnieje jeszcze w schemacie" />;
}

export default function ProjectReadinessPage() {
  const profile = useAuthStore((state) => state.profile);
  const allowed = profile ? hasFullAppAccess(profile.role) : false;

  const [rows, setRows] = useState<ProjectReadinessRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    void fetchProjectReadiness()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się wczytać raportu gotowości.");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">Ta strona jest dostępna tylko dla administratorów i managerów.</p>
      </div>
    );
  }

  const checkableCount = rows ? (rows.length > 0 ? 3 : 0) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        eyebrow="Test gotowości projektu"
        title="Gotowość projektów"
        description="report_project_readiness() (docs/09) — 5 z 8 pozycji są dziś sprawdzalne (etap aktualny, sloty obsadzone, lider etapu, ROT bez zaległości, data ostatniego kontaktu). ROT mierzy ZALEGŁOŚĆ (czy któraś otwarta pozycja jest po dacie kontroli — review_date albo sugerowana, gdy ręcznej brak), nie aktywność. Pozostałe 3 zwracają „niedostępne” — profil klienta i kanał komunikacji jako decyzja nie istnieją w schemacie, „kto zatrudnia” istnieje jako pole, ale jest w praktyce puste. „Niedostępne” świadomie NIE jest tym samym co „nie spełnione”."
      />

      {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
      {checkableCount > 0 ? null : rows === null ? (
        <p className="text-sm text-muted">Ładowanie…</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <Card>
          <CardContent className="overflow-x-auto py-4">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted">
                  <th className="py-2 pr-3">Projekt</th>
                  <th className="py-2 pr-3">Status</th>
                  {READINESS_COLUMNS.map((col) => (
                    <th key={col.key} className="py-2 pr-3 text-center">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.projectId} className="border-b border-border/40">
                    <td className="py-2 pr-3 font-medium text-foreground">{row.projectName}</td>
                    <td className="py-2 pr-3">
                      <Badge tone="neutral" className="text-[10px]">
                        {row.flowStatus}
                      </Badge>
                    </td>
                    {READINESS_COLUMNS.map((col) => (
                      <td key={col.key} className="py-2 pr-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <StatusIcon status={row[col.key] as ProjectReadinessStatus} />
                          {col.key === "rotPrzeniesioneZWlascicielemIDataKontroli" &&
                          row.rotPozycjiPoTerminie > 0 ? (
                            <span className="text-xs text-rose-400">{row.rotPozycjiPoTerminie}</span>
                          ) : null}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : rows && rows.length === 0 ? (
        <p className="text-sm text-muted">Brak projektów.</p>
      ) : null}
    </div>
  );
}
