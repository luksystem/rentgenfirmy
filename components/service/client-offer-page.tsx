"use client";

import { useCallback, useEffect, useState } from "react";
import { ServiceReport } from "@/components/service/service-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import {
  CLIENT_OFFER_ACTION_LABELS,
  type ClientOfferAction,
} from "@/lib/service/client-offer";
import type { ServiceRecord } from "@/lib/service/types";
import { formatDate } from "@/lib/utils";

type OfferMeta = {
  status: string | null;
  statusLabel: string | null;
  message: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
  canRespond: boolean;
};

export function ClientOfferPage({ token }: { token: string }) {
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [offer, setOffer] = useState<OfferMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState("");
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać oferty.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

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
          message: action === "negotiate" ? negotiationMessage : undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać decyzji.");
      }

      setOffer(payload.offer as OfferMeta);
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

  if (!service || !offer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="rounded-2xl border border-border bg-surface-muted/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Rentgen firmy · wycena serwisu
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{service.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {service.client.fullName}
            {service.client.location ? ` · ${service.client.location}` : ""}
          </p>
          {offer.expiresAt ? (
            <p className="mt-2 text-xs text-muted">
              Link ważny do: {formatDate(offer.expiresAt)}
            </p>
          ) : null}
        </header>

        {offer.statusLabel ? (
          <Card className="border-border/80">
            <CardContent className="py-4 text-sm">
              <p className="font-medium text-foreground">{offer.statusLabel}</p>
              {offer.message ? (
                <p className="mt-2 whitespace-pre-wrap text-muted">{offer.message}</p>
              ) : null}
              {offer.respondedAt ? (
                <p className="mt-2 text-xs text-muted">
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

        {offer.canRespond ? (
          <Card>
            <CardContent className="grid gap-4 py-5">
              <p className="text-sm text-muted">
                Prosimy o wybór jednej z opcji. Po decyzji zespół serwisowy przejdzie do
                kolejnego etapu.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitAction("accept")}
                >
                  {CLIENT_OFFER_ACTION_LABELS.accept}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setShowNegotiation((value) => !value)}
                >
                  {CLIENT_OFFER_ACTION_LABELS.negotiate}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => void submitAction("reject")}
                >
                  {CLIENT_OFFER_ACTION_LABELS.reject}
                </Button>
              </div>
              {showNegotiation ? (
                <div className="grid gap-3 rounded-xl border border-border/80 p-4">
                  <Field label="Wiadomość do negocjacji">
                    <Textarea
                      value={negotiationMessage}
                      onChange={(event) => setNegotiationMessage(event.target.value)}
                      placeholder="Opisz, co chciałbyś zmienić w ofercie…"
                    />
                  </Field>
                  <Button
                    type="button"
                    disabled={submitting || !negotiationMessage.trim()}
                    onClick={() => void submitAction("negotiate")}
                  >
                    Wyślij wiadomość negocjacyjną
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <ServiceReport service={service} variant="client" />
      </div>
    </div>
  );
}
