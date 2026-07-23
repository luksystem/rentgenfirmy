"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  PROJECT_CHANGE_REQUEST_STATUS_LABELS,
  formatChangeRequestCost,
  type ProjectChangeRequest,
} from "@/lib/dashboard/change-request-types";
import type { PublicChangeRequestBundle } from "@/lib/supabase/project-change-request-repository";
import { cn } from "@/lib/utils";

export default function PublicChangeRequestPage() {
  const params = useParams();
  const token = String(params.token ?? "");
  const [bundle, setBundle] = useState<PublicChangeRequestBundle | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/zmiana/${encodeURIComponent(token)}`, {
      credentials: "omit",
      cache: "no-store",
    });
    const payload = (await response.json()) as PublicChangeRequestBundle & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Nie udało się załadować zmiany.");
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

  // Odświeżanie w tle, gdy link aktywny (np. zespół anulował / zmieniono status)
  useEffect(() => {
    if (!bundle?.linkActive) {
      return;
    }
    const interval = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [bundle?.linkActive, refresh]);

  async function handleRespond(accepted: boolean) {
    const name = authorName.trim();
    if (!name) {
      setFormError("Podaj imię lub firmę.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/zmiana/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          accepted,
          authorName: name,
          clientResponseNote: responseNote,
        }),
      });
      const payload = (await response.json()) as PublicChangeRequestBundle & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać decyzji.");
      }
      setBundle(payload);
    } catch (respondError) {
      setFormError(respondError instanceof Error ? respondError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ładowanie zmiany projektu…
        </p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="py-8 text-sm text-rose-200">
            {error ?? "Nie znaleziono zmiany lub link wygasł."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const changeRequest = bundle.changeRequest;
  const costLabel = formatChangeRequestCost(changeRequest);
  const decided =
    changeRequest.status === "accepted" || changeRequest.status === "rejected";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Zmiana projektu
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{changeRequest.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {bundle.projectName}
          {bundle.clientName ? ` · ${bundle.clientName}` : ""}
        </p>

        <Card className="mt-5">
          <CardContent className="grid gap-4 py-6">
            <StatusBanner changeRequest={changeRequest} linkActive={bundle.linkActive} />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Opis zmiany</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                {changeRequest.body || "—"}
              </p>
            </div>

            {costLabel ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Koszt</p>
                <p className="mt-1 text-sm font-medium text-foreground">{costLabel}</p>
                {changeRequest.costNote ? (
                  <p className="mt-1 text-xs text-muted">{changeRequest.costNote}</p>
                ) : null}
              </div>
            ) : null}

            {decided ? (
              <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">
                  Status: {PROJECT_CHANGE_REQUEST_STATUS_LABELS[changeRequest.status]}
                </p>
                {changeRequest.clientResponseName ? (
                  <p className="mt-1 text-muted">Decyzja: {changeRequest.clientResponseName}</p>
                ) : null}
                {changeRequest.clientResponseNote ? (
                  <p className="mt-1 text-muted">{changeRequest.clientResponseNote}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  Link do akceptacji wygasł po podjęciu decyzji.
                </p>
              </div>
            ) : null}

            {bundle.linkActive ? (
              <div className="grid gap-3 border-t border-border/60 pt-4">
                <Field label="Twoje imię / firma">
                  <Input
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="np. Jan Kowalski"
                    disabled={busy}
                  />
                </Field>
                <Field label="Uwagi (opcjonalnie)">
                  <Textarea
                    value={responseNote}
                    onChange={(event) => setResponseNote(event.target.value)}
                    rows={3}
                    placeholder="Komentarz do decyzji…"
                    disabled={busy}
                  />
                </Field>
                {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRespond(true)}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Akceptuję
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void handleRespond(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Odrzucam
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBanner({
  changeRequest,
  linkActive,
}: {
  changeRequest: ProjectChangeRequest;
  linkActive: boolean;
}) {
  if (linkActive) {
    return (
      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        Prosimy o decyzję: akceptacja lub odrzucenie zmiany projektu.
      </div>
    );
  }

  const tone =
    changeRequest.status === "accepted"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
      : changeRequest.status === "rejected"
        ? "border-rose-500/35 bg-rose-500/10 text-rose-100"
        : "border-border/70 bg-surface-muted/20 text-muted";

  return (
    <div className={cn("rounded-xl border px-3 py-2 text-sm", tone)}>
      {PROJECT_CHANGE_REQUEST_STATUS_LABELS[changeRequest.status]}
      {!linkActive && changeRequest.status === "pending_client"
        ? " — link nieaktywny"
        : null}
    </div>
  );
}
