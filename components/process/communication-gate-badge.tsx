"use client";

import { Info } from "lucide-react";
import type { ProjectCommunicationGate } from "@/lib/supabase/communication-gate-repository";
import { cn } from "@/lib/utils";

/**
 * D19 §6 / faza 11a — reżim komunikacji projektu, TYLKO brama (bez modyfikatorów, bez
 * egzekwowania bezpiecznika ciszy — to faza 11b, "silnik"). Świadomie oznaczone jako wartość
 * bazowa, żeby nikt nie przeczytał tego jako ostateczną, uwzględnioną-we-wszystkim fazę.
 */
const REGIME_LABELS: Record<ProjectCommunicationGate["regime"], string> = {
  brak_komunikacji: "Brak komunikacji",
  tryb_serwisowy: "Tryb serwisowy",
  nieustalona: "Nieustalona — brak etapu aktywnego",
  CZUWANIE: "Czuwanie",
  STANDARD: "Standard",
  INTENSYWNA: "Intensywna",
  KRYTYCZNA: "Krytyczna",
};

const REGIME_TONE: Record<ProjectCommunicationGate["regime"], string> = {
  brak_komunikacji: "bg-zinc-500/15 text-zinc-300",
  tryb_serwisowy: "bg-sky-500/15 text-sky-300",
  nieustalona: "bg-amber-500/15 text-amber-300",
  CZUWANIE: "bg-zinc-500/15 text-zinc-300",
  STANDARD: "bg-emerald-500/15 text-emerald-300",
  INTENSYWNA: "bg-amber-400/15 text-amber-300",
  KRYTYCZNA: "bg-rose-500/15 text-rose-300",
};

export function CommunicationGateBadge({ gate }: { gate: ProjectCommunicationGate | null }) {
  if (!gate) {
    return null;
  }

  const isUnmodifiedStagePhase = gate.gateNumber === 5 && gate.modifiersEnabled;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/20 px-3 py-2 text-sm">
      <span className="text-muted">Faza komunikacji:</span>
      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", REGIME_TONE[gate.regime])}>
        {REGIME_LABELS[gate.regime]}
      </span>
      {gate.silenceBreakerDays ? (
        <span className="text-xs text-muted">bezpiecznik {gate.silenceBreakerDays} dni</span>
      ) : null}
      {isUnmodifiedStagePhase ? (
        <span
          className="flex items-center gap-1 text-xs text-muted"
          title="Faza bazowa etapu bez modyfikatorów (spotkanie ekipy, blokada, ROT po terminie…) — silnik modyfikatorów to osobna faza."
        >
          <Info className="h-3.5 w-3.5" />
          bez modyfikatorów
        </span>
      ) : null}
    </div>
  );
}
