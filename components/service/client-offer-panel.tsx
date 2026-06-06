"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AcceptedOfferPdfButton } from "@/components/work-order/accepted-offer-pdf-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildClientOfferMailtoUrl,
  canShareClientOffer,
  getOfferRegenerationHint,
  getRegenerateOfferLabel,
  shareClientOffer,
  shouldConfirmOfferRegeneration,
} from "@/lib/service/client-offer-delivery";
import {
  canGenerateClientOffer,
  canSendClientOffer,
  CLIENT_OFFER_STATUS_LABELS,
  getClientOfferGenerateBlockReason,
  getClientOfferUrl,
  isClientOfferActive,
} from "@/lib/service/client-offer";
import type { ServiceRecord } from "@/lib/service/types";
import { generateClientOfferForService } from "@/lib/supabase/client-offer-repository";
import {
  createWorkOrderFromAcceptedServiceClient,
  fetchWorkOrderByServiceId,
} from "@/lib/supabase/work-order-repository";
import { useServiceStore } from "@/store/service-store";
import { useWorkOrderStore } from "@/store/work-order-store";
import { formatDate, formatMoney } from "@/lib/utils";

export function ClientOfferPanel({
  service,
  onServiceUpdated,
}: {
  service: ServiceRecord;
  onServiceUpdated: (service: ServiceRecord) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [isCheckingOrder, setIsCheckingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const router = useRouter();
  const replaceService = useServiceStore((state) => state.replaceService);
  const replaceOrder = useWorkOrderStore((state) => state.replaceOrder);
  const getOrderByServiceId = useWorkOrderStore((state) => state.getOrderByServiceId);
  const hydrateWorkOrders = useWorkOrderStore((state) => state.hydrate);

  const isAccepted = service.clientOffer.status === "accepted";

  useEffect(() => {
    setCanShare(canShareClientOffer());
  }, []);

  useEffect(() => {
    if (!isAccepted) {
      setLinkedOrderId(null);
      return;
    }

    const cached = getOrderByServiceId(service.id);
    if (cached) {
      setLinkedOrderId(cached.id);
      return;
    }

    let cancelled = false;
    setIsCheckingOrder(true);

    void (async () => {
      try {
        await hydrateWorkOrders();
        const fromStore = getOrderByServiceId(service.id);
        if (fromStore) {
          if (!cancelled) {
            setLinkedOrderId(fromStore.id);
          }
          return;
        }

        const fromDb = await fetchWorkOrderByServiceId(service.id);
        if (!cancelled) {
          if (fromDb) {
            replaceOrder(fromDb);
            setLinkedOrderId(fromDb.id);
          } else {
            setLinkedOrderId(null);
          }
        }
      } catch {
        if (!cancelled) {
          setLinkedOrderId(null);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingOrder(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getOrderByServiceId, hydrateWorkOrders, isAccepted, replaceOrder, service.id]);

  const offerUrl = useMemo(
    () => (service.clientOffer.token ? getClientOfferUrl(service.clientOffer.token) : null),
    [service.clientOffer.token],
  );

  const mailtoUrl = useMemo(
    () => (offerUrl ? buildClientOfferMailtoUrl(service, offerUrl) : null),
    [offerUrl, service],
  );

  async function handleGenerate() {
    if (shouldConfirmOfferRegeneration(service)) {
      const confirmed = window.confirm(
        "Wygenerować nowy link? Poprzedni link przestanie działać i klient będzie musiał użyć nowego adresu.",
      );
      if (!confirmed) {
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const updated = await generateClientOfferForService(service);
      replaceService(updated);
      onServiceUpdated(updated);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Nie udało się wygenerować linku.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreateWorkOrder() {
    setIsCreatingOrder(true);
    setError(null);

    try {
      const order = await createWorkOrderFromAcceptedServiceClient(service);
      replaceOrder(order);
      setLinkedOrderId(order.id);
      router.push(`/zlecenia/${order.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Nie udało się utworzyć zlecenia.",
      );
    } finally {
      setIsCreatingOrder(false);
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

  const canGenerate = canGenerateClientOffer(service);
  const canSend = canSendClientOffer(service);
  const offerActive = isClientOfferActive(service.clientOffer);
  const regenerationHint = getOfferRegenerationHint(service);
  const generateBlockReason = getClientOfferGenerateBlockReason(service);

  return (
    <Card className="border-accent/20 bg-accent-soft/20">
      <CardContent className="grid gap-3 py-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Link oferty dla klienta</h3>
          <p className="mt-1 text-sm text-muted">{regenerationHint}</p>
        </div>

        {service.clientOffer.lastClientMessage ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Ostatnia wiadomość klienta</p>
            <p className="mt-1 whitespace-pre-wrap text-muted">
              {service.clientOffer.lastClientMessage}
            </p>
          </div>
        ) : null}

        {service.clientOffer.status ? (
          <div className="rounded-xl border border-border/80 bg-surface-muted/40 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">
              {CLIENT_OFFER_STATUS_LABELS[service.clientOffer.status]}
            </p>
            {service.clientOffer.message ? (
              <p className="mt-1 whitespace-pre-wrap text-muted">{service.clientOffer.message}</p>
            ) : null}
            {service.clientOffer.respondedAt ? (
              <p className="mt-1 text-xs text-muted">
                Odpowiedź klienta: {formatDate(service.clientOffer.respondedAt)}
              </p>
            ) : null}
            {service.clientOffer.expiresAt ? (
              <p className="mt-1 text-xs text-muted">
                Ważność linku: {formatDate(service.clientOffer.expiresAt)}
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
              ) : (
                <Button type="button" variant="secondary" size="sm" disabled title="Brak e-maila klienta">
                  Wyślij e-mailem
                </Button>
              )}
              {canShare ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => void handleShare()}>
                  Udostępnij
                </Button>
              ) : null}
            </div>
            {!service.client.email.trim() ? (
              <p className="text-xs text-muted">
                Uzupełnij e-mail klienta w danych zgłoszenia, aby otworzyć gotową wiadomość w programie
                pocztowym. Możesz też skopiować link i wysłać go SMS-em lub WhatsApp.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canGenerate || isGenerating}
            onClick={() => void handleGenerate()}
          >
            {isGenerating ? "Generowanie…" : getRegenerateOfferLabel(service)}
          </Button>
          {service.clientOfferAcceptedDocument ? (
            <AcceptedOfferPdfButton document={service.clientOfferAcceptedDocument} />
          ) : null}
          {isAccepted && !linkedOrderId && !isCheckingOrder ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isCreatingOrder}
              onClick={() => void handleCreateWorkOrder()}
            >
              {isCreatingOrder ? "Tworzenie…" : "Utwórz zlecenie"}
            </Button>
          ) : null}
          {linkedOrderId ? (
            <Button type="button" variant="secondary" asChild>
              <Link href={`/zlecenia/${linkedOrderId}`}>Otwórz zlecenie</Link>
            </Button>
          ) : null}
        </div>

        {service.clientOfferAcceptedDocument ? (
          <p className="text-xs text-muted">
            Zaakceptowano {formatDate(service.clientOfferAcceptedDocument.acceptedAt)} · brutto{" "}
            {formatMoney(service.clientOfferAcceptedDocument.grossTotal)} — dokument zamrożony w
            momencie akceptacji przez klienta.
            {linkedOrderId
              ? " Kopia PDF jest też dostępna w powiązanym zleceniu."
              : isAccepted && !isCheckingOrder
                ? " Możesz utworzyć zlecenie — PDF zostanie do niego dołączony."
                : ""}
          </p>
        ) : null}

        {!canGenerate && generateBlockReason ? (
          <p className="text-xs text-muted">{generateBlockReason}</p>
        ) : null}

        {canSend ? (
          <p className="text-xs text-muted">
            Wysyłka na razie ręczna: e-mail z programu pocztowego, udostępnianie na telefonie albo
            wklejenie linku do SMS / WhatsApp. Automatyczna wysyłka z serwera może być dodana później.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
