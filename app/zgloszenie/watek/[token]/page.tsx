"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeThread,
} from "@/lib/service-intake/types";
import { formatDateTime } from "@/lib/utils";

export default function ServiceIntakeThreadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [thread, setThread] = useState<ServiceIntakeThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setToken(value.token));
  }, [params]);

  useEffect(() => {
    if (!token) {
      return;
    }
    setLoading(true);
    void fetch(`/api/zgloszenie/watek/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie znaleziono wątku.");
        }
        setThread(payload as ServiceIntakeThread);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Błąd.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function sendMessage() {
    if (!token) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/zgloszenie/watek/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, message, authorSide: "client" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać wiadomości.");
      }
      setMessage("");
      const refresh = await fetch(`/api/zgloszenie/watek/${encodeURIComponent(token)}`);
      const refreshed = await refresh.json();
      setThread(refreshed as ServiceIntakeThread);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Błąd.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 py-16 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie wątku zgłoszenia…
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-muted">
        {error ?? "Nie znaleziono wątku zgłoszenia."}
      </div>
    );
  }

  const closed = thread.intake.status === "closed" || thread.intake.status === "rejected";

  return (
    <div className="mx-auto grid max-w-3xl gap-4 py-8">
      <div>
        <p className="text-sm text-muted">Wątek serwisowy</p>
        <h1 className="text-2xl font-semibold text-foreground">{thread.intake.referenceNumber}</h1>
        <p className="mt-1 text-sm text-muted">
          Status: {SERVICE_INTAKE_STATUS_LABELS[thread.intake.status]} ·{" "}
          {SERVICE_INTAKE_REQUEST_TYPE_LABELS[thread.intake.requestType]}
          {thread.intake.priority
            ? ` · ${SERVICE_INTAKE_PRIORITY_LABELS[thread.intake.priority]}`
            : ""}
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-2 py-4 text-sm">
          <p className="whitespace-pre-wrap text-foreground">{thread.intake.description}</p>
          <p className="text-muted">Zgłoszono: {formatDateTime(thread.intake.createdAt)}</p>
        </CardContent>
      </Card>

      {thread.attachments.length > 0 ? (
        <Card>
          <CardContent className="grid gap-2 py-4">
            <p className="text-sm font-medium text-foreground">Załączniki</p>
            {thread.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {attachment.label || attachment.url}
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {thread.comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-xl border border-border/70 bg-surface-muted/15 px-4 py-3"
          >
            <p className="text-xs text-muted">
              {comment.authorName} · {comment.authorSide === "team" ? "Zespół" : "Klient"} ·{" "}
              {formatDateTime(comment.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
          </div>
        ))}
      </div>

      {closed ? (
        <p className="rounded-xl border border-border/70 bg-surface-muted/10 px-4 py-3 text-sm text-muted">
          Wątek został zamknięty. W razie potrzeby zgłoś nowy problem przez{" "}
          <Link href="/zgloszenie" className="text-accent hover:underline">
            formularz zgłoszenia
          </Link>
          .
        </p>
      ) : (
        <Card>
          <CardContent className="grid gap-3 py-4">
            <Field label="Imię i nazwisko">
              <Input value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
            </Field>
            <Field label="Wiadomość">
              <Textarea
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" disabled={sending || !message.trim()} onClick={() => void sendMessage()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Wyślij wiadomość
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
