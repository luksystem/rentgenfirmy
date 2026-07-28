"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCompetencyGapMap, type CompetencyGap } from "@/lib/supabase/operational-role-competency-repository";

/** Faza 3 (Kompetencje, docs/04 §3.3) — widok dla właściciela: role/etapy, gdzie <2 osoby mają wymaganą kompetencję na najwyższym poziomie. */
export function CompetencyGapMapCard() {
  const [gaps, setGaps] = useState<CompetencyGap[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchCompetencyGapMap()
      .then((rows) => {
        if (!cancelled) setGaps(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Błąd wczytywania mapy luk.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Mapa luk kompetencji
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p className="text-xs text-muted">
          Role i etapy z wymaganą kompetencją, dla których mniej niż dwie osoby mają ją na
          najwyższym zdefiniowanym poziomie. Puste — bo nie ma wymagania, nie dlatego że nie ma
          luki: zdefiniuj wymagania w Ustawienia → Plan Zasobów → Role operacyjne albo w edytorze
          etapu szablonu.
        </p>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {gaps === null ? (
          <p className="text-sm text-muted">Ładowanie…</p>
        ) : gaps.length === 0 ? (
          <p className="text-sm text-muted">Brak wykrytych luk.</p>
        ) : (
          <div className="grid gap-1.5">
            {gaps.map((gap, index) => (
              <div
                key={`${gap.kind}-${gap.subjectLabel}-${gap.competencyLabel}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-foreground">{gap.subjectLabel}</span>
                  <span className="text-muted">
                    {" "}
                    ({gap.kind}) — {gap.competencyLabel}, min. {gap.requiredLevelLabel}
                  </span>
                </span>
                <span className="text-xs font-medium text-amber-300">{gap.qualifiedPeopleCount}/2 osób</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
