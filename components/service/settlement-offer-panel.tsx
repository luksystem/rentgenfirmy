"use client";

import { useEffect, useMemo, useState } from "react";
import { AcceptedOfferPdfButton } from "@/components/work-order/accepted-offer-pdf-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildClientOfferMailtoUrl,
  canShareClientOffer,
  shareClientOffer,
} from "@/lib/service/client-offer-delivery";
import {
  canGenerateSettlementOffer,
  canSendSettlementOffer,
  getSettlementOfferGenerateBlockReason,
  getSettlementOfferUrl,
  isSettlementOfferActive,
} from "@/lib/service/settlement-offer";
import { CLIENT_OFFER_STATUS_LABELS } from "@/lib/service/client-offer";
import type { ServiceRecord } from "@/lib/service/types";
import { generateSettlementOfferForService } from "@/lib/supabase/client-offer-repository";
import { useServiceStore } from "@/store/service-store";
import { formatDate, formatMoney } from "@/lib/utils";

export function SettlementOfferPanel({
  service,
  onServiceUpdated,
}: {
  service: ServiceRecord;
  onServiceUpdated: (service: ServiceRecord) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const replaceService = useServiceStore((state) => state.replaceService);

  const offerUrl = useMemo(
    () => (service.settlementOffer.token ? getSettlementOfferUrl(service.settlementOffer.token) : null),
    [service.settlementOffer.token],
  );

  const mailtoUrl = useMemo(
    () => (offerUrl ? buildClientOfferMailtoUrl(service, offerUrl, "settlement") : null),
    [offerUrl, service],
  );

  const canGenerate = canGenerateSettlementOffer(service);
  const canSend = canSendSettlementOffer(service);
  const offerActive = isSettlementOfferActive(service);
  const generateBlockReason = getSettlementOfferGenerateBlockReason(service);

  useEffect(() => {
    setCanShare(canShareClientOffer());
  }, []);

  async function handleGenerate() {
    if (service.settlementOffer.token) {
      const confirmed = window.confirm(
        "Wygenerować nowy link rozliczenia? Poprzedni link przestanie działać.",
      );
      if (!confirmed) {
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const updated = await generateSettlementOfferForService(service);
      replaceService(updated);
      onServiceUpdated(updated);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Nie udało się wygenerować linku rozliczenia.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!offerUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(offerUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Nie udało się skopiować linku.");
    }
  }

  async function handleShare() {
    if (!offerUrl) {
      return;
    }

    setError(null);

    try {
      await shareClientOffer(service, offerUrl);
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        return;
      }

      setError(
        shareError instanceof Error ? shareError.message : "Nie udało się udostępnić linku.",
      );
    }
  }

  if (service.pricingModel !== "hourly") {
    return null;
  }

  return (
    <Card className="border-sky-500/20 bg-sky-500/5">
      <CardContent className="grid gap-3 py-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Link rozliczenia dla klienta</h3>
          <p className="mt-1 text-sm text-muted">
            Po rozliczeniu wyślij klientowi koszty rzeczywiste do akceptacji. Po akceptacji
            powiązane zlecenie zostanie zaktualizowane nowym dokumentem PDF.
          </p>
        </div>

        {service.settlementOffer.lastClientMessage ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Ostatnia wiadomość klienta</p>
            <p className="mt-1 whitespace-pre-wrap text-muted">
              {service.settlementOffer.lastClientMessage}
            </p>
          </div>
        ) : null}

        {service.settlementOffer.status ? (
          <div className="rounded-xl border border-border/80 bg-surface-muted/40 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">
              {CLIENT_OFFER_STATUS_LABELS[service.settlementOffer.status]}
            </p>
            {service.settlementOffer.message ? (
              <p className="mt-1 whitespace-pre-wrap text-muted">{service.settlementOffer.message}</p>
            ) : null}
            {service.settlementOffer.respondedAt ? (
              <p className="mt-1 text-xs text-muted">
                Odpowiedź klienta: {formatDate(service.settlementOffer.respondedAt)}
              </p>
            ) : null}
            {service.settlementOffer.expiresAt ? (
              <p className="mt-1 text-xs text-muted">
                Ważność linku: {formatDate(service.settlementOffer.expiresAt)}
                {offerActive ? "" : " · wygasł — wygeneruj nowy link"}
              </p>
            ) : null}
          </div>
        ) : null}

        {offerUrl ? (
          <div className="grid gap-2 rounded-xl border border-border/80 bg-surface px-3 py-3">
            <p className="break-all text-sm text-foreground">{offerUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopy()}>
                {copied ? "Skopiowano" : "Kopiuj link"}
              </Button>
              {mailtoUrl ? (
                <Button type="button" variant="secondary" size="sm" asChild>
                  <a href={mailtoUrl}>Wyślij e-mailem</a>
                </Button>
              ) : null}
              {canShare ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => void handleShare()}>
                  Udostępnij
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canGenerate || isGenerating}
            onClick={() => void handleGenerate()}
          >
            {isGenerating
              ? "Generowanie…"
              : service.settlementOffer.token
                ? "Wygeneruj nowy link rozliczenia"
                : "Wygeneruj link rozliczenia"}
          </Button>
          {service.settlementOfferAcceptedDocument ? (
            <AcceptedOfferPdfButton document={service.settlementOfferAcceptedDocument} />
          ) : null}
        </div>

        {service.settlementOfferAcceptedDocument ? (
          <p className="text-xs text-muted">
            Zaakceptowano {formatDate(service.settlementOfferAcceptedDocument.acceptedAt)} · brutto{" "}
            {formatMoney(service.settlementOfferAcceptedDocument.grossTotal)} — dokument rozliczenia
            zamrożony w momencie akceptacji.
          </p>
        ) : null}

        {!canGenerate && generateBlockReason ? (
          <p className="text-xs text-muted">{generateBlockReason}</p>
        ) : null}

        {canSend ? (
          <p className="text-xs text-muted">
            Link pokazuje koszty rzeczywiste po serwisie — klient może zaakceptować, odrzucić lub
            poprosić o konsultację.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
