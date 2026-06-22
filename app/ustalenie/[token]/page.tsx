"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AgreementCollaborationPanel } from "@/components/dashboard/agreement-collaboration-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  AGREEMENT_WORKFLOW_PHASE_LABELS,
  getAgreementWorkflowPhase,
  type AgreementCollaborationBundle,
} from "@/lib/dashboard/agreement-collaboration-types";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  PROJECT_AGREEMENT_STATUS_LABELS,
  formatAgreementCost,
} from "@/lib/dashboard/agreement-types";

export default function PublicAgreementPage() {
  const params = useParams();
  const token = String(params.token ?? "");
  const [bundle, setBundle] = useState<AgreementCollaborationBundle | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/ustalenie/${encodeURIComponent(token)}`);
    const payload = (await response.json()) as AgreementCollaborationBundle & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Nie udało się załadować ustalenia.");
    }
    setBundle(payload);
  }, [token]);

  useEffect(() => {
    if (!token || token === "undefined") {
      setError("Nieprawidłowy link.");
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-sm text-muted">Ładowanie ustalenia…</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card>
          <CardContent className="py-8 text-sm text-rose-200">
            {error ?? "Nie znaleziono ustalenia."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const agreement = bundle.activeVersion ?? bundle.agreement;
  const phase = getAgreementWorkflowPhase(bundle.agreement);
  const costLabel = formatAgreementCost(agreement);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Ustalenie projektowe
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{agreement.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category]} ·{" "}
          {AGREEMENT_WORKFLOW_PHASE_LABELS[phase]}
        </p>

        <Card className="mt-5">
          <CardContent className="grid gap-4 py-6">
            <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-4">
              {agreement.body ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{agreement.body}</p>
              ) : (
                <p className="text-sm text-muted">Brak opisu w tej wersji.</p>
              )}
              {costLabel ? (
                <p className="mt-3 text-sm font-medium text-foreground">Koszt: {costLabel}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                Status: {PROJECT_AGREEMENT_STATUS_LABELS[bundle.agreement.status]}
              </p>
            </div>

            <label className="grid gap-1.5 text-sm">
              <span className="text-muted">Twoje imię / firma (do komentarzy i akceptacji)</span>
              <input
                className="rounded-xl border border-border bg-surface px-3 py-2"
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                placeholder="np. Jan Kowalski / Firma XYZ"
              />
            </label>

            <AgreementCollaborationPanel
              agreementId={bundle.agreement.id}
              mode="external"
              authorName={authorName || "Gość"}
              publicToken={token}
              onChanged={refresh}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
