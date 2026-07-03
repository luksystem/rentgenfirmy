"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { MessageTemplateVariablesReference } from "@/components/settings/message-template-variables-reference";
import type { SmsMessageRecord } from "@/lib/sms/types";
import type { SmsRule, SmsRulesSettings } from "@/lib/sms/sms-rules";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const STATUS_CLASS: Record<SmsMessageRecord["status"], string> = {
  queued: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  sent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  delivered: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

function SmsRuleEditor({
  rule,
  onChange,
}: {
  rule: SmsRule;
  onChange: (rule: SmsRule) => void;
}) {
  return (
    <article className="grid gap-3 rounded-xl border border-border/80 bg-surface-muted/15 p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={(event) => onChange({ ...rule, enabled: event.target.checked })}
          className="mt-1 h-4 w-4 rounded border-border"
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-foreground">{rule.label}</span>
          <span className="mt-1 block text-sm text-muted">{rule.description}</span>
        </span>
      </label>

      <Field label="Treść SMS">
        <Textarea
          rows={3}
          value={rule.messageTemplate}
          onChange={(event) => onChange({ ...rule, messageTemplate: event.target.value })}
          placeholder="Treść wiadomości…"
        />
      </Field>
    </article>
  );
}

export function SmsSettingsView() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const authLoading = useAuthStore((state) => state.isLoading);

  const [settings, setSettings] = useState<SmsRulesSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Test SMS z aplikacji Rentgen");
  const [result, setResult] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<SmsMessageRecord[]>([]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sms/rules", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać reguł SMS.");
      }
      setSettings(payload.settings as SmsRulesSettings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd wczytywania reguł.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setSendError(loadError instanceof Error ? loadError.message : "Błąd historii SMS.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isAdministrator && !authLoading) {
      void loadSettings();
      void loadHistory();
    }
  }, [authLoading, isAdministrator, loadHistory, loadSettings]);

  function updateRule(index: number, next: SmsRule) {
    setSettings((current) =>
      current
        ? {
            ...current,
            rules: current.rules.map((rule, ruleIndex) => (ruleIndex === index ? next : rule)),
          }
        : current,
    );
    setSaved(false);
  }

  async function handleSave() {
    if (!settings) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/sms/rules", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać reguł SMS.");
      }
      setSettings(payload.settings as SmsRulesSettings);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu reguł.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setSending(true);
    setSendError(null);
    setResult(null);

    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message,
          metadata: { type: "manual_test", source: "sms_settings" },
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
        setSendError(item.errorMessage ?? "Operator SMS zwrócił błąd.");
      }

      await loadHistory();
    } catch (sendErr) {
      setSendError(sendErr instanceof Error ? sendErr.message : "Błąd wysyłki SMS.");
    } finally {
      setSending(false);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-muted">Sprawdzanie uprawnień…</p>;
  }

  if (!isAdministrator) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Konfiguracja SMS wymaga roli administratora.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Wysyłki SMS"
        description="Reguły automatycznej wysyłki SMS i test ręczny. SMS wysyła się tylko gdy reguła ma zaznaczony checkbox „Włączona”."
        action={
          <Button onClick={() => void handleSave()} disabled={saving || loading || !settings}>
            {saving ? "Zapisywanie…" : "Zapisz reguły"}
          </Button>
        }
      />

      {saved ? (
        <Card className="panel-success mb-4 border">
          <CardContent className="py-3 text-sm text-emerald-300">
            Reguły SMS zostały zapisane.
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-4 border-rose-500/30 bg-rose-500/10">
          <CardContent className="py-3 text-sm text-rose-300">{error}</CardContent>
        </Card>
      ) : null}

      <section className="mb-8 grid gap-4">
        <details className="group rounded-xl border border-border/80 bg-surface-muted/15">
          <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="font-medium text-foreground">Placeholdery i linki w treści SMS</span>
            <span className="mt-1 block text-sm text-muted">
              Kliknij, aby rozwinąć listę — skopiuj{" "}
              <code className="rounded bg-surface-muted px-1">{"{{nazwa}}"}</code> do szablonu reguły.
            </span>
          </summary>
          <div className="border-t border-border/60 px-4 py-4">
            <MessageTemplateVariablesReference />
          </div>
        </details>

        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Reguły wysyłki</h2>
        </div>
        <p className="text-sm text-muted">
          Przy dodawaniu nowych reguł w aplikacji stosuj ten sam wzorzec: checkbox włączenia +
          edytowalna treść SMS. Reguła uruchamia się tylko gdy checkbox jest zaznaczony.
        </p>

        {loading ? (
          <p className="text-sm text-muted">Wczytywanie reguł…</p>
        ) : settings ? (
          <div className="grid gap-3">
            {settings.rules.map((rule, index) => (
              <SmsRuleEditor key={rule.id} rule={rule} onChange={(next) => updateRule(index, next)} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Test ręczny</h2>
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
              <Button
                type="button"
                disabled={sending || !phone.trim() || !message.trim()}
                onClick={() => void handleSendTest()}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Wyślij test SMS
              </Button>
              {result ? <p className="text-sm text-emerald-300">{result}</p> : null}
              {sendError ? <p className="text-sm text-rose-400">{sendError}</p> : null}
              <p className="text-xs text-muted">
                W dev domyślnie SMSAPI używa trybu testowego (
                <code className="rounded bg-surface-muted px-1">SMSAPI_TEST_MODE=1</code>).
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Historia wysyłek</h2>
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
                    <article
                      key={entry.id}
                      className="rounded-xl border border-border/70 bg-surface-muted/10 p-3 text-sm"
                    >
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
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
