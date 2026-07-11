"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FixedPriceOfferReport } from "@/components/service/fixed-price-offer-report";
import { ServiceReport } from "@/components/service/service-report";
import {
  ClientOptionalItemsPicker,
  ClientOptionalItemsSummary,
} from "@/components/service/client-optional-items-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import {
  type ClientOfferAction,
} from "@/lib/service/client-offer";
import { OfferValidityCountdown } from "@/components/service/offer-validity-countdown";
import {
  getServiceCombinedBilling,
  getServiceReportDocumentMeta,
} from "@/lib/service/report-document";
import { hasOptionalItems } from "@/lib/service/optional-items";
import type { ServiceRecord } from "@/lib/service/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

type OfferMeta = {
  status: string | null;
  statusLabel: string | null;
  message: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
  canRespond: boolean;
  canAskQuestion: boolean;
  isExpired: boolean;
};

type OfferKind = "estimate" | "settlement";

const SECTION_LINKS = [
  { href: "#offer-optional-items", label: "Opcje dodatkowe" },
  { href: "#offer-scope", label: "Zakres prac" },
  { href: "#offer-details", label: "Szczegóły" },
  { href: "#offer-pricing", label: "Wycena" },
] as const;

export function ClientOfferPage({ token }: { token: string }) {
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [offer, setOffer] = useState<OfferMeta | null>(null);
  const [offerKind, setOfferKind] = useState<OfferKind>("estimate");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<Set<string>>(() => new Set());

  const loadOffer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/oferta/${token}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać oferty.");
      }

      setService(payload.service as ServiceRecord);
      setOffer(payload.offer as OfferMeta);
      setOfferKind((payload.kind as OfferKind) ?? "estimate");
      const loaded = payload.service as ServiceRecord;
      setSelectedOptionalIds(
        new Set(loaded.optionalItems.filter((item) => item.clientSelected).map((item) => item.id)),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać oferty.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  const pricing = useMemo(() => {
    if (!service) {
      return null;
    }

    const previewSelection = offer?.canRespond ? selectedOptionalIds : null;
    const combined = getServiceCombinedBilling(service, previewSelection);
    const meta = getServiceReportDocumentMeta(service);
    return { combined, meta };
  }, [offer?.canRespond, selectedOptionalIds, service]);

  const isSettlementView = offerKind === "settlement";
  const isFixedPriceEstimate = !isSettlementView && service?.pricingModel === "fixed_price";
  const showHourlyEstimateBanner =
    !isSettlementView && service?.pricingModel === "hourly" && offer?.canRespond;

  const showOptionalPicker = Boolean(
    service && offer?.canRespond && hasOptionalItems(service.optionalItems),
  );

  async function submitAction(action: ClientOfferAction) {
    if (action === "negotiate" && !negotiationMessage.trim()) {
      setError("Wpisz wiadomość przy konsultacji.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/oferta/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          message: action === "negotiate" ? negotiationMessage : responseNote.trim() || undefined,
          selectedOptionalItemIds:
            action === "accept" ? Array.from(selectedOptionalIds) : undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać decyzji.");
      }

      await loadOffer();
      setSuccess(
        action === "accept"
          ? isSettlementView
            ? "Dziękujemy — rozliczenie zostało zaakceptowane."
            : "Dziękujemy — oferta została zaakceptowana."
          : action === "reject"
            ? isSettlementView
              ? "Rozliczenie zostało odrzucone."
              : "Oferta została odrzucona."
            : "Wiadomość negocjacyjna została wysłana.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Nie udało się wysłać decyzji.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted">
        Wczytywanie oferty…
      </div>
    );
  }

  if (error && !service) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardContent className="py-8 text-center text-sm text-rose-300">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!service || !offer || !pricing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {offer.canRespond ? (
        <div
          className="fixed inset-x-0 top-0 z-50 border-b border-zinc-700/80 bg-zinc-950/98 shadow-lg shadow-black/40 backdrop-blur-md"
          role="region"
          aria-label="Decyzja dotycząca oferty"
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-3.5">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="min-w-0 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Kwota brutto
                </p>
                <p className="text-xl font-bold tabular-nums leading-tight text-zinc-50 sm:text-2xl">
                  {formatMoney(pricing.combined.grossTotal)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  netto {formatMoney(pricing.combined.netTotal)}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  className="h-9 px-4 text-sm"
                  onClick={() => void submitAction("accept")}
                >
                  Akceptuj
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={submitting}
                  className="h-9 px-4 text-sm"
                  onClick={() => void submitAction("negotiate")}
                >
                  Konsultacja
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  className="h-9 px-4 text-sm"
                  onClick={() => void submitAction("reject")}
                >
                  Odrzuć
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                placeholder="Notatka (opcjonalnie)…"
                className="h-9 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              <input
                value={negotiationMessage}
                onChange={(event) => setNegotiationMessage(event.target.value)}
                placeholder="Wiadomość przy konsultacji…"
                className="h-9 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "px-4 py-4 sm:px-6 sm:py-8",
          offer.canRespond && "pt-[9.75rem] sm:pt-[8.75rem]",
        )}
      >
      <div className="mx-auto grid w-full min-w-0 max-w-4xl gap-4 sm:gap-5">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Rentgen firmy · {isSettlementView ? "rozliczenie serwisu" : "wycena serwisu"}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                {service.title}
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400">
                {service.client.fullName}
                {service.client.location ? ` · ${service.client.location}` : ""}
              </p>
              {offer.expiresAt && offer.canRespond ? (
                <OfferValidityCountdown expiresAt={offer.expiresAt} />
              ) : offer.expiresAt ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Oferta ważna była do: {formatDate(offer.expiresAt)}
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                "shrink-0 text-left sm:text-right",
                offer.canRespond && "hidden sm:block",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                {pricing.meta.grossTotalLabel}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-50">
                {formatMoney(pricing.combined.grossTotal)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                netto {formatMoney(pricing.combined.netTotal)}
                {pricing.combined.optional.grossTotal > 0 ? (
                  <>
                    <span className="mx-1.5 text-zinc-700">·</span>
                    w tym opcje +{formatMoney(pricing.combined.optional.grossTotal)} brutto
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </header>

        {(success || error || offer.statusLabel) && (
          <div className="grid gap-3">
            {offer.statusLabel ? (
              <Card className="border-zinc-800 bg-zinc-900/60">
                <CardContent className="py-4 text-sm">
                  <p className="font-medium text-zinc-100">{offer.statusLabel}</p>
                  {offer.message ? (
                    <p className="mt-2 whitespace-pre-wrap text-zinc-400">{offer.message}</p>
                  ) : null}
                  {offer.respondedAt ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Odpowiedź z dnia {formatDate(offer.respondedAt)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {success ? (
              <Card className="border-emerald-500/30 bg-emerald-500/10">
                <CardContent className="py-4 text-sm text-emerald-200">{success}</CardContent>
              </Card>
            ) : null}

            {error ? (
              <Card className="border-rose-500/30 bg-rose-500/10">
                <CardContent className="py-4 text-sm text-rose-300">{error}</CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {showHourlyEstimateBanner ? (
          <Card className="border-sky-500/30 bg-sky-500/10">
            <CardContent className="py-4 text-sm text-sky-100">
              To wstępna wycena na podstawie stawek godzinowych i przewidywanych kosztów przed
              wyjazdem. Po wykonaniu prac otrzymasz osobny link z rozliczeniem kosztów
              rzeczywistych.
            </CardContent>
          </Card>
        ) : null}

        <nav
          aria-label="Nawigacja po ofercie"
          className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2"
        >
          {SECTION_LINKS.filter((link) =>
            link.href === "#offer-optional-items"
              ? hasOptionalItems(service.optionalItems)
              : true,
          ).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition",
                "hover:bg-zinc-800 hover:text-zinc-50",
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {showOptionalPicker ? (
          <ClientOptionalItemsPicker
            items={service.optionalItems}
            selectedIds={selectedOptionalIds}
            onChange={setSelectedOptionalIds}
            interactive
          />
        ) : null}

        {!offer.canRespond && service.clientOffer.status === "accepted" ? (
          <ClientOptionalItemsSummary items={service.optionalItems} />
        ) : null}

        <div className="min-w-0 max-w-full overflow-hidden">
          {isFixedPriceEstimate ? (
            <FixedPriceOfferReport service={service} variant="client" />
          ) : (
            <ServiceReport
              service={service}
              variant="client"
              optionalItemSelection={offer.canRespond ? selectedOptionalIds : undefined}
            />
          )}
        </div>

        {offer.canAskQuestion ? (
          <Card className="border-amber-500/30 bg-zinc-900 shadow-xl shadow-black/20">
            <CardContent className="grid gap-4 py-5">
              <div>
                <p className="text-sm font-medium text-amber-200">Oferta straciła ważność</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Akceptacja i odrzucenie nie są już dostępne. Możesz wysłać pytanie do zespołu —
                  skontaktujemy się w sprawie aktualnej wyceny.
                </p>
              </div>
              <div className="grid gap-3 rounded-xl border border-zinc-700 bg-zinc-950/40 p-4">
                <Field label="Pytanie do oferty">
                  <Textarea
                    value={negotiationMessage}
                    onChange={(event) => setNegotiationMessage(event.target.value)}
                    placeholder="Napisz, o co chcesz zapytać…"
                  />
                </Field>
                <Button
                  type="button"
                  disabled={submitting || !negotiationMessage.trim()}
                  onClick={() => void submitAction("negotiate")}
                >
                  Wyślij pytanie
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
      </div>
    </div>
  );
}
