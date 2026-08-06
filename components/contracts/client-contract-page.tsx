"use client";

import { useCallback, useEffect, useState } from "react";
import { ContractDocumentView } from "@/components/contracts/contract-document-view";
import { OfferValidityCountdown } from "@/components/service/offer-validity-countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { resolveCompanyProfileDocument, type CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { isContractTableSection, CONTRACT_STATUS_LABELS, type Contract } from "@/lib/contracts/types";
import { fetchCompanyProfile } from "@/lib/supabase/company-profile-repository";

type LoadState = {
  contract: Contract;
  statusLabel: string;
  isExpired: boolean;
  canRespond: boolean;
};

export function ClientContractPage({ token }: { token: string }) {
  const [state, setState] = useState<LoadState | null>(null);
  const [company, setCompany] = useState<CompanyProfileDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void fetchCompanyProfile()
      .then((profile) => setCompany(resolveCompanyProfileDocument(profile)))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/podpisz-umowe/${token}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać umowy.");
      }
      const loaded = payload as LoadState;
      setState(loaded);
      setSelectedOptionIds(
        new Set(
          loaded.contract.sections
            .filter((section) => isContractTableSection(section) && section.group === "option" && section.selected)
            .map((section) => section.id),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać umowy.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(action: "sign" | "reject") {
    if (action === "sign") {
      if (!signerName.trim()) {
        setError("Podaj imię i nazwisko.");
        return;
      }
      if (!confirmed) {
        setError("Zaznacz potwierdzenie akceptacji treści umowy.");
        return;
      }
    } else if (!window.confirm("Na pewno odrzucić tę umowę?")) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/podpisz-umowe/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          signerName: action === "sign" ? signerName.trim() : undefined,
          selectedOptionSectionIds: action === "sign" ? Array.from(selectedOptionIds) : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać decyzji.");
      }
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się zapisać decyzji.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !state) {
    return <p className="p-8 text-center text-sm text-muted">Wczytywanie umowy…</p>;
  }

  if (error && !state) {
    return <p className="p-8 text-center text-sm text-rose-400">{error}</p>;
  }

  if (!state) {
    return null;
  }

  const { contract, canRespond, isExpired } = state;
  const canInteract = canRespond && !isExpired;

  return (
    <div className="min-h-screen bg-surface-muted/20 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-3xl gap-6">
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Umowa do podpisania</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{contract.title || "Umowa"}</h1>
          <p className="mt-1 text-sm text-muted">{CONTRACT_STATUS_LABELS[contract.status]}</p>
          {canRespond && contract.tokenExpiresAt ? (
            <OfferValidityCountdown expiresAt={contract.tokenExpiresAt} kind="estimate" />
          ) : null}
        </div>

        <ContractDocumentView
          contract={contract}
          selectedOptionIds={selectedOptionIds}
          company={company}
          onToggleOption={
            canInteract
              ? (sectionId, checked) => {
                  setSelectedOptionIds((prev) => {
                    const next = new Set(prev);
                    if (checked) {
                      next.add(sectionId);
                    } else {
                      next.delete(sectionId);
                    }
                    return next;
                  });
                }
              : undefined
          }
        />

        {canInteract ? (
          <Card>
            <CardContent className="grid gap-3 pt-5">
              <p className="font-semibold text-foreground">Podpisz umowę</p>
              <Field label="Imię i nazwisko">
                <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span className="text-muted">Potwierdzam zapoznanie się z treścią umowy i akceptuję jej warunki.</span>
              </label>

              {error ? <p className="text-sm text-rose-400">{error}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={submitting} onClick={() => void submit("sign")}>
                  {submitting ? "Zapisywanie…" : "Podpisz umowę"}
                </Button>
                <Button type="button" variant="outline" disabled={submitting} onClick={() => void submit("reject")}>
                  Odrzuć
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isExpired && canRespond ? (
          <p className="text-sm text-rose-400">
            Link do podpisania umowy wygasł. Skontaktuj się z firmą, aby uzyskać nowy link.
          </p>
        ) : null}
      </div>
    </div>
  );
}
