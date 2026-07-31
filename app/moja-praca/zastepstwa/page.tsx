"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { MySubstitutionProposal } from "@/lib/leave/substitution-types";
import { acceptSubstitutionSlot, fetchMySubstitutionProposals } from "@/lib/supabase/leave-request-repository";

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

/** Faza 13 Krok 1 (docs/role/04 §6.2 pkt 3, §6.4) — karty przekazania do akceptacji. */
export default function SubstitutionsPage() {
  const [proposals, setProposals] = useState<MySubstitutionProposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const items = await fetchMySubstitutionProposals();
      setProposals(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać propozycji.");
    }
  }

  async function handleAccept(slotId: string) {
    setAcceptingId(slotId);
    try {
      await acceptSubstitutionSlot(slotId);
      await load();
    } catch (acceptError) {
      window.alert(acceptError instanceof Error ? acceptError.message : "Nie udało się zaakceptować.");
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Moja praca"
        title="Zastępstwa"
        description="Karty przekazania — sloty przejmowane na czas nieobecności innych osób."
      />

      {error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : proposals === null ? (
        <p className="text-sm text-muted">Wczytywanie…</p>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Nie masz obecnie żadnych propozycji zastępstwa.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <Card key={proposal.slotId}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      PRZEKAZANIE: {proposal.requesterName ?? "wnioskujący"} → Ty,{" "}
                      {formatDate(proposal.startDate)} – {formatDate(proposal.endDate)}
                    </p>
                    <p className="text-sm text-muted">
                      Slot przejmowany: {proposal.projectName ?? "Projekt"} /{" "}
                      {ROLE_LABELS[proposal.roleCode] ?? proposal.roleCode}
                    </p>
                  </div>
                  {proposal.status === "zaakceptowany" ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Zaakceptowano
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={acceptingId === proposal.slotId}
                      onClick={() => void handleAccept(proposal.slotId)}
                    >
                      Akceptuję
                    </Button>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted">Zobowiązania w okresie:</p>
                  {proposal.commitments.length === 0 ? (
                    <p className="text-xs text-muted">Brak zobowiązań z terminem w tym okresie.</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted">
                      {proposal.commitments.map((commitment, index) => (
                        <li key={index}>
                          {commitment.title} ({formatDate(commitment.windowStart)}–{formatDate(commitment.windowEnd)})
                          {commitment.kind === "niezaplanowany" ? " — niezaplanowane" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
