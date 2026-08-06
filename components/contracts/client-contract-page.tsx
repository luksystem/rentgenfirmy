"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OfferValidityCountdown } from "@/components/service/offer-validity-countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import {
  calculateContractTotals,
  calculatePaymentScheduleAmounts,
  calculateTableGrossTotal,
  calculateTableNetTotal,
} from "@/lib/contracts/totals";
import {
  CONTRACT_STATUS_LABELS,
  isContractTableSection,
  isContractTextSection,
  type Contract,
} from "@/lib/contracts/types";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

type LoadState = {
  contract: Contract;
  statusLabel: string;
  isExpired: boolean;
  canRespond: boolean;
};

export function ClientContractPage({ token }: { token: string }) {
  const [state, setState] = useState<LoadState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(() => new Set());

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

  const totals = useMemo(() => {
    if (!state) {
      return null;
    }
    return calculateContractTotals(state.contract.sections, {
      optionOverrides: Object.fromEntries(Array.from(selectedOptionIds).map((id) => [id, true])),
    });
  }, [state, selectedOptionIds]);

  const scheduleAmounts = useMemo(() => {
    if (!state || !totals) {
      return [];
    }
    return calculatePaymentScheduleAmounts(state.contract.paymentSchedule, totals);
  }, [state, totals]);

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

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-4 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Umowa</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{contract.title || "Umowa"}</h1>
        <p className="mt-1 text-sm text-muted">{CONTRACT_STATUS_LABELS[contract.status]}</p>
        {canRespond && contract.tokenExpiresAt ? (
          <OfferValidityCountdown expiresAt={contract.tokenExpiresAt} kind="estimate" />
        ) : null}
      </div>

      <Card>
        <CardContent className="grid gap-1 pt-5 text-sm text-muted">
          <p className="font-medium text-foreground">{contract.client.fullName}</p>
          {contract.client.companyName ? <p>{contract.client.companyName}</p> : null}
          {contract.client.nip ? <p>NIP: {contract.client.nip}</p> : null}
          {contract.client.location ? <p>{contract.client.location}</p> : null}
          {[contract.client.email, contract.client.phone].filter(Boolean).join(" · ")}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {contract.sections.map((section) => {
          if (isContractTextSection(section)) {
            return (
              <Card key={section.id}>
                <CardContent className="pt-5">
                  {section.title ? (
                    <p className={cn("font-semibold text-foreground", section.struck && "line-through text-muted")}>
                      {section.title}
                    </p>
                  ) : null}
                  <p className={cn("mt-1 whitespace-pre-line text-sm text-foreground/90", section.struck && "line-through text-muted")}>
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            );
          }

          if (!isContractTableSection(section)) {
            return null;
          }

          const isOption = section.group === "option";
          const selected = isOption ? selectedOptionIds.has(section.id) : true;

          return (
            <Card key={section.id} className={cn(isOption && !selected && "opacity-70")}>
              <CardContent className="grid gap-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{section.title || "Tabela pozycji"}</p>
                    {section.description ? <p className="mt-1 text-sm text-muted">{section.description}</p> : null}
                  </div>
                  {isOption ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!canRespond || isExpired}
                        onChange={(event) => {
                          const next = new Set(selectedOptionIds);
                          if (event.target.checked) {
                            next.add(section.id);
                          } else {
                            next.delete(section.id);
                          }
                          setSelectedOptionIds(next);
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      Opcja dodatkowa — dołącz do umowy
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-2 text-sm">
                  {section.rows
                    .filter((row) => row.active)
                    .map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                        <span className="text-foreground/90">
                          {row.name} <span className="text-muted">— {row.quantity} {row.unit}</span>
                        </span>
                        <span className="tabular-nums text-foreground">{formatMoney(computeFixedPriceRowNetValue(row))} netto</span>
                      </div>
                    ))}
                </div>

                <p className="text-sm text-muted">
                  Suma: <span className="font-semibold text-foreground">{formatMoney(calculateTableNetTotal(section))} netto</span>
                  {" · "}
                  <span className="font-semibold text-foreground">{formatMoney(calculateTableGrossTotal(section))} brutto</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totals ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-base font-semibold text-foreground">
              Wartość umowy: {formatMoney(totals.totalGross)} brutto
            </p>
            <p className="text-sm text-muted">(netto: {formatMoney(totals.totalNet)})</p>
          </CardContent>
        </Card>
      ) : null}

      {contract.paymentSchedule.length > 0 ? (
        <Card>
          <CardContent className="grid gap-2 pt-5">
            <p className="font-semibold text-foreground">Harmonogram spłat</p>
            {scheduleAmounts.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground/90">
                  {item.label || "Rata"} <span className="text-muted">({item.percent}%)</span>
                  {item.note ? <span className="text-muted"> — {item.note}</span> : null}
                </span>
                <span className="tabular-nums font-medium text-foreground">{formatMoney(item.amountGross)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {contract.clientSignature || contract.companySignature ? (
        <Card>
          <CardContent className="grid gap-1 pt-5 text-sm text-muted">
            {contract.clientSignature ? (
              <p>
                Podpis klienta: {contract.clientSignature.signerName} — {formatDateTime(contract.clientSignature.signedAt)}
              </p>
            ) : null}
            {contract.companySignature ? (
              <p>
                Podpis firmy: {contract.companySignature.signerName} — {formatDateTime(contract.companySignature.signedAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canRespond && !isExpired ? (
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
        <p className="text-sm text-rose-400">Link do podpisania umowy wygasł. Skontaktuj się z firmą, aby uzyskać nowy link.</p>
      ) : null}
    </div>
  );
}
