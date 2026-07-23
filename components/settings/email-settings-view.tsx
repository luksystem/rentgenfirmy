"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, RotateCcw, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { resolveCompanyProfileDocument } from "@/lib/company/company-profile-document";
import { normalizeCompanyProfile, type CompanyProfile } from "@/lib/company/company-profile";
import { buildAgreementDeliveryEmail } from "@/lib/email/agreement-templates";
import {
  defaultEmailSettings,
  EMAIL_TEMPLATE_VARIABLES,
  type EmailSettings,
  type EmailTemplateKind,
  type TemplateVariableChannel,
} from "@/lib/email/email-settings";
import { buildEmailShell } from "@/lib/email/layout";
import {
  getNotificationActionDefinition,
  groupNotificationActionsByCategory,
  NOTIFICATION_AUDIENCE_LABELS,
  type NotificationAudience,
  type NotificationRoutingRule,
} from "@/lib/email/notification-routing";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import {
  buildServiceIntakeStatusEmail,
  buildServiceIntakeSubmittedEmail,
} from "@/lib/service-intake/email-templates";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const ROUTING_GROUPS = groupNotificationActionsByCategory();

type PreviewChannel = "email" | "sms" | "push";

function renderPlain(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "").trim();
}

function buildSampleVariables(kind: EmailTemplateKind): Record<string, string> {
  const sample: Record<string, string> = {};
  for (const variable of EMAIL_TEMPLATE_VARIABLES[kind]) {
    sample[variable.key] = variable.label;
  }
  return sample;
}

function buildPreview(
  settings: EmailSettings,
  company: CompanyProfile | null,
  kind: EmailTemplateKind,
  channel: PreviewChannel,
): { subject: string; html: string | null; plain?: string } {
  const companyDoc = company ? resolveCompanyProfileDocument(company) : null;
  const template = settings.templates[kind];

  if (channel === "email" && kind === "agreement_delivery") {
    return {
      subject: buildAgreementDeliveryEmail({
        recipientName: "Jan Kowalski",
        projectName: "Przykładowy projekt",
        intro: "Przesyłamy ustalenie projektowe oczekujące na Państwa akceptację.",
        entries: [
          {
            title: "Zakres prac — etap 1",
            body: "Przykładowa treść ustalenia widoczna w podglądzie.",
            categoryLabel: "Zakres",
            costLabel: "1 200 zł",
            costNote: null,
            protocols: ["E-mail"],
            acceptUrl: "https://example.com/accept",
            discussUrl: "https://example.com/discuss",
          },
        ],
        settings,
        company: companyDoc,
      }).subject,
      html: buildAgreementDeliveryEmail({
        recipientName: "Jan Kowalski",
        projectName: "Przykładowy projekt",
        intro: "Przesyłamy ustalenie projektowe oczekujące na Państwa akceptację.",
        entries: [
          {
            title: "Zakres prac — etap 1",
            body: "Przykładowa treść ustalenia widoczna w podglądzie.",
            categoryLabel: "Zakres",
            costLabel: "1 200 zł",
            costNote: null,
            protocols: ["E-mail"],
            acceptUrl: "https://example.com/accept",
            discussUrl: "https://example.com/discuss",
          },
        ],
        settings,
        company: companyDoc,
      }).html,
    };
  }

  if (channel === "email" && kind === "service_intake_submitted") {
    return buildServiceIntakeSubmittedEmail(
      {
        referenceNumber: "ZS-2026-001",
        contactFullName: "Anna Nowak",
        threadUrl: "https://example.com/zgloszenie/watek/demo",
      },
      { settings, company: companyDoc },
    );
  }

  if (channel === "email" && kind === "service_intake_status") {
    return buildServiceIntakeStatusEmail(
      {
        referenceNumber: "ZS-2026-001",
        contactFullName: "Anna Nowak",
        statusLabel: "Rozliczanie",
        threadUrl: "https://example.com/zgloszenie/watek/demo",
        settlement: {
          resolutionOutcome: "full",
          resolutionCause: "Wymieniono uszkodzony moduł zasilania, usterka usunięta.",
          extraCosts: true,
          extraCostsNote: "Dojazd poza standardowym zakresem umowy — 120 PLN netto.",
        },
      },
      { settings, company: companyDoc },
    );
  }

  const sample = buildSampleVariables(kind);

  if (channel === "email") {
    return {
      subject: renderEmailSubject(template.subject, sample),
      html: buildEmailShell({
        content: renderEmailTemplateString(template.body, sample),
        eyebrow: template.eyebrow,
        disclaimer: template.disclaimer,
        brand: settings.brand,
        company: companyDoc,
      }),
    };
  }

  if (channel === "sms") {
    return { subject: "", html: null, plain: renderPlain(template.sms, sample) };
  }

  return {
    subject: "",
    html: null,
    plain: [renderPlain(template.pushTitle, sample), renderPlain(template.pushBody, sample)]
      .filter(Boolean)
      .join("\n"),
  };
}

export function EmailSettingsView() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const authLoading = useAuthStore((state) => state.isLoading);

  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [activeKind, setActiveKind] = useState<EmailTemplateKind>("agreement_delivery");
  const [activeChannel, setActiveChannel] = useState<PreviewChannel>("email");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emailRes, companyRes] = await Promise.all([
        fetch("/api/settings/email", { credentials: "include" }),
        fetch("/api/company-profile", { credentials: "include" }),
      ]);
      const emailPayload = await emailRes.json();
      if (!emailRes.ok) {
        throw new Error(emailPayload.error ?? "Nie udało się wczytać ustawień e-mail.");
      }
      setSettings(emailPayload.settings as EmailSettings);

      if (companyRes.ok) {
        const companyPayload = await companyRes.json();
        setCompany(normalizeCompanyProfile(companyPayload.profile));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd wczytywania ustawień.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdministrator) {
      void load();
    }
  }, [authLoading, isAdministrator, load]);

  const preview = useMemo(() => {
    if (!settings) return null;
    return buildPreview(settings, company, activeKind, activeChannel);
  }, [settings, company, activeKind, activeChannel]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/email", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać ustawień.");
      }
      setSettings(payload.settings as EmailSettings);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      const response = await fetch("/api/email/test", { method: "POST", credentials: "include" });
      const payload = (await response.json()) as { error?: string; to?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać testowego e-maila.");
      }
      setEmailSuccess(
        payload.to ? `Wysłano testowy e-mail na ${payload.to}.` : "Wysłano testowy e-mail.",
      );
    } catch (testError) {
      setEmailError(
        testError instanceof Error ? testError.message : "Nie udało się wysłać testowego e-maila.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  function resetTemplate(kind: EmailTemplateKind) {
    if (!settings) return;
    const defaults = defaultEmailSettings();
    setSettings({
      ...settings,
      templates: {
        ...settings.templates,
        [kind]: defaults.templates[kind],
      },
    });
    setSaved(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie ustawień e-mail…
      </div>
    );
  }

  if (!isAdministrator) {
    return (
      <Card className="border border-border/80">
        <CardContent className="py-5 text-sm text-muted">
          Ustawienia e-mail są dostępne tylko dla administratora.
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="border border-border/80">
        <CardContent className="py-5 text-sm text-red-400">
          {error ?? "Brak ustawień e-mail."}
        </CardContent>
      </Card>
    );
  }

  const activeTemplate = settings.templates[activeKind];
  const activeAction = getNotificationActionDefinition(activeKind);
  const variables = EMAIL_TEMPLATE_VARIABLES[activeKind].filter(
    (variable) =>
      variable.channels.includes("all" as TemplateVariableChannel) ||
      variable.channels.includes(activeChannel),
  );

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Ustawienia e-mail"
        description="Kiedy i do kogo wysyłać e-mail, push i SMS — oraz branding, szablony i test wysyłki (Resend)."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
        </Button>
        {saved ? <span className="self-center text-sm text-emerald-300">Zapisano.</span> : null}
      </div>
      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <Card className="mb-6 border border-border/80">
        <CardContent className="grid gap-5 py-5">
          <div>
            <p className="font-medium text-foreground">Kiedy wysyłać powiadomienia</p>
            <p className="mt-1 text-sm text-muted">
              Zaznacz kanały i odbiorców dla każdego zdarzenia. E-mail: klient / branża / użytkownik /
              skrzynka serwisowa. Push i SMS tam, gdzie mają sens. Zapisz ustawienia, aby SMS-y
              zsynchronizowały się z regułami w{" "}
              <a href="/ustawienia/sms" className="text-accent underline-offset-2 hover:underline">
                Wysyłki SMS
              </a>
              .
            </p>
          </div>

          {ROUTING_GROUPS.map((group) => (
            <div key={group.category} className="grid gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              <div className="grid gap-3">
                {group.actions.map((action) => {
                  const rule =
                    settings.routing.find((entry) => entry.id === action.id) ??
                    ({
                      id: action.id,
                      email: { ...action.defaults.email },
                      push: action.defaults.push,
                      sms: action.defaults.sms,
                      ...(action.supportsSchedule && action.defaults.schedule
                        ? {
                            daysBefore: action.defaults.schedule.daysBefore,
                            notifyAtHour: action.defaults.schedule.notifyAtHour,
                          }
                        : {}),
                    } satisfies NotificationRoutingRule);

                  function patchRule(next: NotificationRoutingRule) {
                    setSettings((prev) => {
                      if (!prev) {
                        return prev;
                      }
                      const others = prev.routing.filter((entry) => entry.id !== next.id);
                      return { ...prev, routing: [...others, next] };
                    });
                    setSaved(false);
                  }

                  return (
                    <article
                      key={action.id}
                      className="rounded-xl border border-border/70 bg-surface-muted/10 p-4"
                    >
                      <div className="mb-3">
                        <p className="font-medium text-foreground">{action.label}</p>
                        <p className="mt-1 text-sm text-muted">{action.description}</p>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                            E-mail — odbiorcy
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {action.emailAudiences.map((audience) => (
                              <label
                                key={audience}
                                className="flex items-center gap-2 text-sm text-foreground"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-border"
                                  checked={rule.email[audience] === true}
                                  onChange={(event) =>
                                    patchRule({
                                      ...rule,
                                      email: {
                                        ...rule.email,
                                        [audience]: event.target.checked,
                                      },
                                    })
                                  }
                                />
                                {NOTIFICATION_AUDIENCE_LABELS[audience as NotificationAudience]}
                              </label>
                            ))}
                            {action.emailAudiences.length === 0 ? (
                              <span className="text-sm text-muted">Brak kanału e-mail</span>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                            Inne kanały
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            <label
                              className={cn(
                                "flex items-center gap-2 text-sm",
                                action.supportsPush ? "text-foreground" : "text-muted",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border"
                                disabled={!action.supportsPush}
                                checked={action.supportsPush && rule.push}
                                onChange={(event) =>
                                  patchRule({ ...rule, push: event.target.checked })
                                }
                              />
                              Push
                            </label>
                            <label
                              className={cn(
                                "flex items-center gap-2 text-sm",
                                action.supportsSms ? "text-foreground" : "text-muted",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border"
                                disabled={!action.supportsSms}
                                checked={action.supportsSms && rule.sms}
                                onChange={(event) =>
                                  patchRule({ ...rule, sms: event.target.checked })
                                }
                              />
                              SMS
                            </label>
                          </div>
                        </div>
                      </div>

                      {action.supportsSchedule ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Field label="Ile dni przed wygaśnięciem">
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              value={rule.daysBefore ?? action.defaults.schedule?.daysBefore ?? 3}
                              onChange={(event) =>
                                patchRule({
                                  ...rule,
                                  daysBefore: Number(event.target.value) || 1,
                                })
                              }
                            />
                          </Field>
                          <Field label="Godzina powiadomienia (Europe/Warsaw)">
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={
                                rule.notifyAtHour ?? action.defaults.schedule?.notifyAtHour ?? 9
                              }
                              onChange={(event) =>
                                patchRule({
                                  ...rule,
                                  notifyAtHour: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="grid gap-4 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-surface-muted p-2">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">Test wysyłki</p>
              <p className="mt-1 text-sm text-muted">
                Wyśle wiadomość testową (z aktualnym layoutem i stopką) na adres z Twojego profilu.
                Wymaga <code className="text-xs">RESEND_API_KEY</code> i{" "}
                <code className="text-xs">EMAIL_FROM</code>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={emailLoading}
              onClick={() => void handleSendTest()}
            >
              <Send className="mr-2 h-4 w-4" />
              {emailLoading ? "Wysyłanie…" : "Wyślij testowy e-mail"}
            </Button>
          </div>
          {emailSuccess ? <p className="text-sm text-emerald-300">{emailSuccess}</p> : null}
          {emailError ? <p className="text-sm text-red-400">{emailError}</p> : null}
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="grid gap-4 py-5">
          <div>
            <p className="font-medium text-foreground">Branding i stopka</p>
            <p className="mt-1 text-sm text-muted">
              Stopka firmy bierze dane z{" "}
              <a href="/ustawienia/firma" className="text-accent underline-offset-2 hover:underline">
                Ustawienia → Firma
              </a>
              .
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kolor nagłówka (od)">
              <Input
                type="color"
                value={settings.brand.headerColorFrom}
                onChange={(event) => {
                  setSettings({
                    ...settings,
                    brand: { ...settings.brand, headerColorFrom: event.target.value },
                  });
                  setSaved(false);
                }}
              />
            </Field>
            <Field label="Kolor nagłówka (do)">
              <Input
                type="color"
                value={settings.brand.headerColorTo}
                onChange={(event) => {
                  setSettings({
                    ...settings,
                    brand: { ...settings.brand, headerColorTo: event.target.value },
                  });
                  setSaved(false);
                }}
              />
            </Field>
          </div>
          <Field label="Pozdrowienie / podpis">
            <Textarea
              rows={3}
              value={settings.brand.signOff}
              onChange={(event) => {
                setSettings({
                  ...settings,
                  brand: { ...settings.brand, signOff: event.target.value },
                });
                setSaved(false);
              }}
            />
          </Field>
          <Field label="Notatka pod stopką">
            <Textarea
              rows={2}
              value={settings.brand.footerNote}
              onChange={(event) => {
                setSettings({
                  ...settings,
                  brand: { ...settings.brand, footerNote: event.target.value },
                });
                setSaved(false);
              }}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={settings.brand.showCompanyFooter}
              onChange={(event) => {
                setSettings({
                  ...settings,
                  brand: { ...settings.brand, showCompanyFooter: event.target.checked },
                });
                setSaved(false);
              }}
              className="h-4 w-4 rounded border-border"
            />
            Pokazuj stopkę z danymi firmy (logo, adres, NIP)
          </label>
          <Field label="Skrzynka serwisowa (kopie zgłoszeń)">
            <Input
              type="email"
              value={settings.serviceInboxEmail}
              onChange={(event) => {
                setSettings({ ...settings, serviceInboxEmail: event.target.value });
                setSaved(false);
              }}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="grid gap-4 py-5">
          <div>
            <p className="font-medium text-foreground">Szablony treści</p>
            <p className="mt-1 text-sm text-muted">
              Treść e-mail, SMS i push dla każdego zdarzenia — edytowalna tutaj, z placeholderami.
              Bloki dynamiczne (przyciski ustaleń, linki) wstawiasz placeholderami.
            </p>
          </div>

          <div className="grid gap-2">
            {ROUTING_GROUPS.map((group) => {
              const isOpenGroup = group.actions.some((action) => action.id === activeKind);
              return (
                <details
                  key={group.category}
                  open={isOpenGroup}
                  className="rounded-xl border border-border/70 bg-surface-muted/10"
                >
                  <summary className="cursor-pointer list-none px-4 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.label}
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3">
                    {group.actions.map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        size="sm"
                        variant={activeKind === action.id ? "secondary" : "outline"}
                        onClick={() => setActiveKind(action.id as EmailTemplateKind)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>

          <p className="text-sm text-muted">{activeTemplate.description}</p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeChannel === "email" ? "secondary" : "outline"}
              onClick={() => setActiveChannel("email")}
            >
              E-mail
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeChannel === "sms" ? "secondary" : "outline"}
              onClick={() => setActiveChannel("sms")}
            >
              SMS
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeChannel === "push" ? "secondary" : "outline"}
              onClick={() => setActiveChannel("push")}
            >
              Push
            </Button>
          </div>

          {activeChannel === "email" ? (
            <>
              <Field label="Etykieta w nagłówku">
                <Input
                  value={activeTemplate.eyebrow}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      templates: {
                        ...settings.templates,
                        [activeKind]: { ...activeTemplate, eyebrow: event.target.value },
                      },
                    });
                    setSaved(false);
                  }}
                />
              </Field>
              <Field label="Temat (subject)">
                <Input
                  value={activeTemplate.subject}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      templates: {
                        ...settings.templates,
                        [activeKind]: { ...activeTemplate, subject: event.target.value },
                      },
                    });
                    setSaved(false);
                  }}
                />
              </Field>
              <Field label="Treść">
                <Textarea
                  rows={8}
                  value={activeTemplate.body}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      templates: {
                        ...settings.templates,
                        [activeKind]: { ...activeTemplate, body: event.target.value },
                      },
                    });
                    setSaved(false);
                  }}
                />
              </Field>
              <Field label="Disclaimer (pusty = ukryty)">
                <Textarea
                  rows={3}
                  value={activeTemplate.disclaimer}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      templates: {
                        ...settings.templates,
                        [activeKind]: { ...activeTemplate, disclaimer: event.target.value },
                      },
                    });
                    setSaved(false);
                  }}
                />
              </Field>
            </>
          ) : null}

          {activeChannel === "sms" ? (
            activeTemplate.smsManagedElsewhere ? (
              <p className="text-sm text-muted">
                Treść SMS dla tego zdarzenia edytujesz w{" "}
                <a href="/ustawienia/sms" className="text-accent underline-offset-2 hover:underline">
                  Wysyłki SMS
                </a>
                .
              </p>
            ) : !activeAction?.supportsSms ? (
              <p className="text-sm text-muted">SMS niedostępny dla tego zdarzenia.</p>
            ) : (
              <Field label="Treść SMS">
                <Textarea
                  rows={4}
                  value={activeTemplate.sms}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      templates: {
                        ...settings.templates,
                        [activeKind]: { ...activeTemplate, sms: event.target.value },
                      },
                    });
                    setSaved(false);
                  }}
                />
              </Field>
            )
          ) : null}

          {activeChannel === "push" ? (
            !activeAction?.supportsPush ? (
              <p className="text-sm text-muted">Push niedostępny dla tego zdarzenia.</p>
            ) : (
              <>
                <Field label="Tytuł push">
                  <Input
                    value={activeTemplate.pushTitle}
                    onChange={(event) => {
                      setSettings({
                        ...settings,
                        templates: {
                          ...settings.templates,
                          [activeKind]: { ...activeTemplate, pushTitle: event.target.value },
                        },
                      });
                      setSaved(false);
                    }}
                  />
                </Field>
                <Field label="Treść push">
                  <Textarea
                    rows={3}
                    value={activeTemplate.pushBody}
                    onChange={(event) => {
                      setSettings({
                        ...settings,
                        templates: {
                          ...settings.templates,
                          [activeKind]: { ...activeTemplate, pushBody: event.target.value },
                        },
                      });
                      setSaved(false);
                    }}
                  />
                </Field>
              </>
            )
          ) : null}

          <div className="rounded-lg border border-border/60 bg-surface-muted/20 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Placeholdery
            </p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <code
                  key={variable.key}
                  className="rounded bg-background/60 px-1.5 py-0.5 text-xs text-accent"
                  title={variable.label}
                >
                  {`{{${variable.key}}}`}
                  {variable.html ? " (HTML)" : ""}
                </code>
              ))}
              {variables.length === 0 ? (
                <span className="text-xs text-muted">Brak placeholderów dla tego kanału.</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resetTemplate(activeKind)}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Przywróć domyślny szablon
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card className="mb-6 border border-border/80">
          <CardContent className="grid gap-3 py-5">
            <div>
              <p className="font-medium text-foreground">Podgląd</p>
              {preview.subject ? (
                <p className="mt-1 text-sm text-muted">
                  Subject: <span className="text-foreground">{preview.subject}</span>
                </p>
              ) : null}
            </div>
            {preview.html ? (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                <iframe title="Podgląd e-mail" className="h-[520px] w-full bg-white" srcDoc={preview.html} />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap rounded-xl border border-border/60 bg-surface-muted/20 p-4 text-sm text-foreground">
                {preview.plain || "—"}
              </pre>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
