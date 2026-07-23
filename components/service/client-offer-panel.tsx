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
import { useAuthStore } from "@/store/auth-store";
import { formatDate, formatMoney } from "@/lib/utils";
import { canGenerateOrSendOffer } from "@/lib/service/offer-approval";
import { OfferApprovalPanel } from "@/components/service/offer-approval-panel";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";

type EmailPreview = { subject: string; html: string; to: string };

async function postJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

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
  const currentProfile = useAuthStore((state) => state.profile);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
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

  async function handleOpenPreview() {
    setPreviewError(null);
    setPreview(null);
    setPreviewOpen(true);
    try {
      const data = await postJson<EmailPreview & { service: ServiceRecord }>(
        `/api/services/${service.id}/client-offer/preview-email`,
      );
      replaceService(data.service);
      onServiceUpdated(data.service);
      setPreview({ subject: data.subject, html: data.html, to: data.to });
    } catch (loadError) {
      setPreviewError(
        loadError instanceof Error ? loadError.message : "Nie udało się przygotować podglądu.",
      );
    }
  }

  async function handleConfirmSend() {
    setSending(true);
    setPreviewError(null);
    try {
      const data = await postJson<{ service: ServiceRecord; emailSkipped: boolean }>(
        `/api/services/${service.id}/client-offer/send`,
      );
      replaceService(data.service);
      onServiceUpdated(data.service);
      setPreviewOpen(false);
      if (data.emailSkipped) {
        setError("Brak konfiguracji RESEND_API_KEY — e-mail nie został wysłany.");
      }
    } catch (sendError) {
      setPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSending(false);
    }
  }

  const approvalOk = currentProfile ? canGenerateOrSendOffer(service.estimateApproval, currentProfile) : false;
  const canGenerate = canGenerateClientOffer(service) && approvalOk;
  const canSend = canSendClientOffer(service) && approvalOk;
  const offerActive = isClientOfferActive(service.clientOffer, service.status);
  const regenerationHint = getOfferRegenerationHint(service);
  const generateBlockReason = getClientOfferGenerateBlockReason(service);

  return (
    <>
    {currentProfile ? (
      <OfferApprovalPanel
        serviceId={service.id}
        kind="estimate"
        approval={service.estimateApproval}
        currentProfile={currentProfile}
        onServiceUpdated={(updated) => {
          replaceService(updated);
          onServiceUpdated(updated);
        }}
      />
    ) : null}
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
                Ważność oferty: {formatDate(service.clientOffer.expiresAt)}
                {offerActive ? "" : " · wygasła — wygeneruj nowy link lub zmień datę ważności"}
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
          {canSend && service.client.email.trim() ? (
            <Button type="button" onClick={() => void handleOpenPreview()}>
              Wyślij do klienta
            </Button>
          ) : null}
          <Button
            type="button"
            variant={canSend ? "secondary" : "default"}
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
            „Wyślij do klienta” wysyła maila z serwera (z podglądem przed wysyłką). Pozostałe
            przyciski to ręczna wysyłka: e-mail z programu pocztowego, udostępnianie na telefonie
            albo wklejenie linku do SMS / WhatsApp.
          </p>
        ) : null}
      </CardContent>
    </Card>
    <OfferEmailPreviewDialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      preview={preview}
      sending={sending}
      error={previewError}
      onConfirmSend={() => void handleConfirmSend()}
    />
    </>
  );
}
