"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { SmsMessageRecord } from "@/lib/sms/types";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const STATUS_CLASS: Record<SmsMessageRecord["status"], string> = {
  queued: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  sent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  delivered: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

export default function SmsTestPage() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const authLoading = useAuthStore((state) => state.isLoading);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Test SMS z aplikacji Rentgen");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<SmsMessageRecord[]>([]);

  const isProduction = process.env.NODE_ENV === "production";
  const canAccess = !isProduction || isAdministrator;

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/sms/messages?limit=10", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać historii SMS.");
      }
      setHistory(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd historii SMS.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess && !authLoading) {
      void loadHistory();
    }
  }, [authLoading, canAccess, loadHistory]);

  async function handleSend() {
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message,
          metadata: { type: "manual_test", source: "dev_sms_test" },
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać SMS.");
      }

      const item = payload.item as {
        status?: string;
        providerMessageId?: string | null;
        errorMessage?: string | null;
      };

      if (payload.ok) {
        setResult(
          `Wysłano (status: ${item.status ?? "sent"})` +
            (item.providerMessageId ? ` · ID operatora: ${item.providerMessageId}` : ""),
        );
      } else {
        setResult(`Błąd wysyłki (status: ${item.status ?? "failed"})`);
        setError(item.errorMessage ?? "Operator SMS zwrócił błąd.");
      }

      await loadHistory();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Błąd wysyłki SMS.");
    } finally {
      setSending(false);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-muted">Sprawdzanie uprawnień…</p>;
  }

  if (!canAccess) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Strona testowa SMS jest dostępna tylko w środowisku developerskim lub dla administratora.
        </CardContent>
      </Card>
    );
  }

  if (!isAdministrator) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Wysyłka testowych SMS wymaga roli administratora.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Development"
        title="Test SMS"
        description="Niezależny moduł wysyłki SMS przez SMSAPI.pl — loguje każdą wysyłkę w tabeli sms_messages."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <Card>
          <CardContent className="grid gap-4 py-5">
            <Field label="Numer telefonu">
              <Input
                value={phone}
                placeholder="+48500100200"
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Treść SMS">
              <Textarea
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            <Button type="button" disabled={sending || !phone.trim() || !message.trim()} onClick={() => void handleSend()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Wyślij test SMS
            </Button>
            {result ? <p className="text-sm text-emerald-300">{result}</p> : null}
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <p className="text-xs text-muted">
              W dev domyślnie używany jest parametr SMSAPI <code className="rounded bg-surface-muted px-1">test=1</code>{" "}
              (bez faktycznej wysyłki i opłat). Ustaw <code className="rounded bg-surface-muted px-1">SMSAPI_TEST_MODE=0</code>{" "}
              aby wysłać prawdziwy SMS.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 py-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">Ostatnie 10 SMS</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadHistory()}>
                Odśwież
              </Button>
            </div>

            {loadingHistory ? (
              <p className="text-sm text-muted">Ładowanie historii…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted">Brak wysłanych SMS w bazie.</p>
            ) : (
              <div className="grid gap-2">
                {history.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-border/70 bg-surface-muted/10 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          STATUS_CLASS[entry.status],
                        )}
                      >
                        {entry.status}
                      </span>
                      <span className="text-muted">{entry.recipient_phone}</span>
                      <span className="text-xs text-muted">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-2 break-words text-foreground">{entry.message}</p>
                    {entry.provider_message_id ? (
                      <p className="mt-1 text-xs text-muted">ID operatora: {entry.provider_message_id}</p>
                    ) : null}
                    {entry.error_message ? (
                      <p className="mt-1 text-xs text-rose-300">{entry.error_message}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
