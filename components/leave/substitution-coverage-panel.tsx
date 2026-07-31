"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TeamProfileSelect } from "@/components/process/team-profile-select";
import type { LeaveSubstitutionSlot } from "@/lib/leave/substitution-types";
import { correctSubstitutionSlot, fetchSubstitutionSlots } from "@/lib/supabase/leave-request-repository";
import { useLeaveStore } from "@/store/leave-store";

const ROLE_LABELS: Record<string, string> = {
  wlasciciel: "Właściciel",
  opiekun_projektu: "Opiekun Projektu",
  koordynator_operacyjny: "Koordynator Operacyjny",
  koordynator_techniczny: "Koordynator Techniczny",
  projektant: "Projektant",
  wdrozeniowiec: "Wdrożeniowiec",
  lider_montazu: "Lider Montażu",
  instalator: "Instalator",
  asystent_procesu: "Asystent Procesu",
};

function statusLabel(status: LeaveSubstitutionSlot["status"]) {
  switch (status) {
    case "proponowany":
      return "Propozycja wysłana — czeka na akceptację kandydata";
    case "skorygowany":
      return "Skorygowano — czeka na akceptację kandydata";
    case "zaakceptowany":
      return "Zaakceptowano";
    case "luka":
      return "Luka — brak kandydata";
  }
}

/** Faza 13 Krok 1 (docs/role/04 §6.2) — lista pokrycia pod wnioskiem z requiresSubstitutionPlanning. */
export function SubstitutionCoveragePanel({ leaveRequestId }: { leaveRequestId: string }) {
  const teamProfiles = useLeaveStore((state) => state.teamProfiles);
  const [slots, setSlots] = useState<LeaveSubstitutionSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSubstitutionSlots(leaveRequestId)
      .then((items) => {
        if (!cancelled) setSlots(items);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : "Błąd wczytywania.");
      });
    return () => {
      cancelled = true;
    };
  }, [leaveRequestId]);

  async function handleCorrect(slotId: string, selectedUserId: string) {
    if (!selectedUserId) return;
    setCorrectingId(slotId);
    try {
      const items = await correctSubstitutionSlot(slotId, selectedUserId);
      setSlots(items);
    } catch (correctError) {
      setError(correctError instanceof Error ? correctError.message : "Nie udało się skorygować.");
    } finally {
      setCorrectingId(null);
    }
  }

  if (error) {
    return <p className="mt-2 text-xs text-rose-400">{error}</p>;
  }
  if (!slots) {
    return <p className="mt-2 text-xs text-muted">Wczytywanie listy pokrycia…</p>;
  }
  if (slots.length === 0) {
    return null;
  }

  return (
    <Card className="mt-2 border-dashed">
      <CardContent className="space-y-3 py-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Users className="h-3.5 w-3.5" />
          Lista pokrycia na czas nieobecności
        </p>
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {slot.projectName ?? "Projekt"} — {ROLE_LABELS[slot.roleCode] ?? slot.roleCode}
              </span>
              <span
                className={`flex items-center gap-1 text-xs ${
                  slot.status === "luka" ? "text-amber-300" : "text-muted"
                }`}
              >
                {slot.status === "zaakceptowany" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : slot.status === "luka" ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : null}
                {statusLabel(slot.status)}
              </span>
            </div>

            {slot.status === "luka" ? (
              <p className="mt-1 text-xs text-amber-300">{slot.gapReason}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Zastępca: {slot.selectedUserName ?? slot.proposedUserName ?? "—"}
                {slot.proposedVia === "fallback" ? " (wg zastępstwa roli)" : slot.proposedVia === "ranking" ? " (wg rankingu)" : ""}
              </p>
            )}

            {slot.status === "proponowany" || slot.status === "skorygowany" ? (
              <div className="mt-2 max-w-xs">
                <TeamProfileSelect
                  value={slot.selectedUserId ?? ""}
                  disabled={correctingId === slot.id}
                  placeholder="— skoryguj kandydata —"
                  teamProfiles={teamProfiles}
                  onChange={(nextId) => void handleCorrect(slot.id, nextId)}
                />
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
