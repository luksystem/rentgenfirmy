"use client";

import { useCallback, useEffect, useState } from "react";
import { ContractDocumentView } from "@/components/contracts/contract-document-view";
import { OfferValidityCountdown } from "@/components/service/offer-validity-countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { resolveCompanyProfileDocument, type CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { contractRowSelectionKey } from "@/lib/contracts/totals";
import {
  emptyContractVatDeclaration,
  isContractTableSection,
  CONTRACT_STATUS_LABELS,
  type Contract,
  type ContractVatDeclaration,
} from "@/lib/contracts/types";
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [selectedPaymentPlanId, setSelectedPaymentPlanId] = useState<string | null>(null);
  const [vatDeclaration, setVatDeclaration] = useState<ContractVatDeclaration>(emptyContractVatDeclaration());

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
      const keys = new Set<string>();
      for (const section of loaded.contract.sections) {
        if (!isContractTableSection(section) || section.group !== "option") {
          continue;
        }
        if (section.category === "dodatki") {
          for (const rowId of section.selectedRowIds) {
            keys.add(contractRowSelectionKey(section.id, rowId));
          }
        } else if (section.selected) {
          keys.add(section.id);
        }
      }
      setSelectedKeys(keys);
      setSelectedPaymentPlanId(
        loaded.contract.selectedPaymentPlanId ?? loaded.contract.paymentPlans[0]?.id ?? null,
      );
      setVatDeclaration(loaded.contract.vatDeclaration ?? emptyContractVatDeclaration());
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
          selectedKeys: action === "sign" ? Array.from(selectedKeys) : undefined,
          selectedPaymentPlanId: action === "sign" ? selectedPaymentPlanId : undefined,
          vatDeclaration: action === "sign" ? vatDeclaration : undefined,
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
    <div className="min-h-screen bg-surface-muted/20 px-4 py-8 sm:px-8 sm:py-12 print:bg-white print:p-0">
      <div className="mx-auto grid max-w-4xl min-w-0 gap-6 print:max-w-none print:gap-0">
        <div className="text-center sm:text-left print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Umowa do podpisania</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{contract.title || "Umowa"}</h1>
          <p className="mt-1 text-sm text-muted">{CONTRACT_STATUS_LABELS[contract.status]}</p>
          {canRespond && contract.tokenExpiresAt ? (
            <OfferValidityCountdown expiresAt={contract.tokenExpiresAt} kind="estimate" />
          ) : null}
        </div>

        <ContractDocumentView
          contract={contract}
          selectedKeys={selectedKeys}
          company={company}
          selectedPaymentPlanId={selectedPaymentPlanId}
          onSelectPaymentPlan={canInteract ? setSelectedPaymentPlanId : undefined}
          onToggleSelection={
            canInteract
              ? (key, checked) => {
                  setSelectedKeys((prev) => {
                    const next = new Set(prev);
                    if (checked) {
                      next.add(key);
                    } else {
                      next.delete(key);
                    }
                    return next;
                  });
                }
              : undefined
          }
          vatDeclaration={vatDeclaration}
          onChangeVatDeclaration={canInteract ? setVatDeclaration : undefined}
        />

        {canInteract ? (
          <Card className="print:hidden">
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
