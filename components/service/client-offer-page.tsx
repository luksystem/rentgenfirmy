"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ServiceReport } from "@/components/service/service-report";
import {
  ClientOptionalItemsPicker,
  ClientOptionalItemsSummary,
} from "@/components/service/client-optional-items-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import {
  CLIENT_OFFER_ACTION_LABELS,
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

const SECTION_LINKS = [
  { href: "#offer-optional-items", label: "Opcje dodatkowe" },
  { href: "#offer-scope", label: "Zakres prac" },
  { href: "#offer-details", label: "Szczegóły" },
  { href: "#offer-pricing", label: "Wycena" },
] as const;

export function ClientOfferPage({ token }: { token: string }) {
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [offer, setOffer] = useState<OfferMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<Set<string>>(() => new Set());
  const [showDecisionDetails, setShowDecisionDetails] = useState(false);

  const loadOffer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/oferta/${token}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać oferty.");
      }

      setService(payload.service as ServiceRecord);
      setOffer(payload.offer as OfferMeta);
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

  const showOptionalPicker = Boolean(
    service && offer?.canRespond && hasOptionalItems(service.optionalItems),
  );

  async function submitAction(action: ClientOfferAction) {
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
          ? "Dziękujemy — oferta została zaakceptowana."
          : action === "reject"
            ? "Oferta została odrzucona."
            : "Wiadomość negocjacyjna została wysłana.",
      );
      setShowNegotiation(false);
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
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full min-w-0 max-w-4xl gap-4 sm:gap-5">
        {offer.canRespond ? (
          <div className="sticky top-0 z-30 -mx-4 border-b border-zinc-800 bg-zinc-950/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="min-w-0 shrink">
                <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                  {pricing.meta.grossTotalLabel}
                </p>
                <p className="text-lg font-bold tabular-nums leading-tight text-zinc-50 sm:text-xl">
                  {formatMoney(pricing.combined.grossTotal)}
                </p>
              </div>
              <div className="ml-auto flex max-w-[62%] flex-wrap justify-end gap-1 sm:max-w-none sm:gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => void submitAction("accept")}
                >
                  Akceptuj
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={submitting}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setShowDecisionDetails((value) => !value)}
                >
                  {showDecisionDetails ? "Ukryj" : "Więcej"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => void submitAction("reject")}
                >
                  Odrzuć
                </Button>
              </div>
            </div>
            {showDecisionDetails ? (
              <div className="mt-2 grid gap-2 border-t border-zinc-800 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={submitting}
                  className="h-8 w-fit text-xs"
                  onClick={() => setShowNegotiation((value) => !value)}
                >
                  {CLIENT_OFFER_ACTION_LABELS.negotiate}
                </Button>
                <Field label="Notatka (opcjonalnie)">
                  <Textarea
                    value={responseNote}
                    onChange={(event) => setResponseNote(event.target.value)}
                    placeholder="Krótka uwaga…"
                    rows={2}
                    className="min-h-0 text-sm"
                  />
                </Field>
                {showNegotiation ? (
                  <div className="grid gap-2 rounded-lg border border-zinc-700 bg-zinc-950/40 p-3">
                    <Field label="Wiadomość do oferty">
                      <Textarea
                        value={negotiationMessage}
                        onChange={(event) => setNegotiationMessage(event.target.value)}
                        placeholder="Opisz, co chciałbyś zmienić…"
                        rows={3}
                        className="text-sm"
                      />
                    </Field>
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting || !negotiationMessage.trim()}
                      onClick={() => void submitAction("negotiate")}
                    >
                      Wyślij pytanie
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Rentgen firmy · wycena serwisu
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

        <ServiceReport
          service={service}
          variant="client"
          optionalItemSelection={offer.canRespond ? selectedOptionalIds : undefined}
        />

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
  );
}
