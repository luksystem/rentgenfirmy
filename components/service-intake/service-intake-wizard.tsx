"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { TurnstileWidget } from "@/components/service-intake/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  SERVICE_INTAKE_PRIORITY_LABELS,
  type ServiceIntakePriority,
  type ServiceIntakeProjectOption,
  type ServiceIntakeVerifyResult,
} from "@/lib/service-intake/types";
import { cn, formatMoney } from "@/lib/utils";

type WizardStep = "email" | "verify" | "project" | "details" | "summary" | "done";

const STEP_LABELS: Record<Exclude<WizardStep, "done">, string> = {
  email: "E-mail",
  verify: "Tożsamość",
  project: "Obiekt",
  details: "Zgłoszenie",
  summary: "Podsumowanie",
};

const STEP_ORDER: Exclude<WizardStep, "done">[] = [
  "email",
  "verify",
  "project",
  "details",
  "summary",
];

function StepIndicator({ current }: { current: Exclude<WizardStep, "done"> }) {
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <ol className="flex flex-wrap gap-2">
      {STEP_ORDER.map((step, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;
        return (
          <li
            key={step}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              done && "bg-emerald-500/15 text-emerald-300",
              active && "bg-accent/20 text-accent",
              !done && !active && "bg-surface-muted text-muted",
            )}
          >
            {index + 1}. {STEP_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}

function WarrantyBadge({ project }: { project: ServiceIntakeProjectOption }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        project.warrantyTone === "success" && "bg-emerald-500/15 text-emerald-300",
        project.warrantyTone === "warning" && "bg-amber-500/15 text-amber-300",
        project.warrantyTone === "danger" && "bg-rose-500/15 text-rose-300",
        project.warrantyTone === "neutral" && "bg-zinc-500/15 text-muted",
      )}
    >
      Gwarancja: {project.warrantyLabel}
    </span>
  );
}

export function ServiceIntakeWizard() {
  const [step, setStep] = useState<WizardStep>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [verification, setVerification] = useState<ServiceIntakeVerifyResult | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState<ServiceIntakePriority>("standard");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [acceptedPaidTerms, setAcceptedPaidTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => verification?.projects.find((project) => project.id === selectedProjectId) ?? null,
    [verification?.projects, selectedProjectId],
  );

  const requiresPaidAcceptance = selectedProject ? !selectedProject.isWarrantyActive : false;

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/zgloszenie/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się rozpocząć.");
      }
      setSessionToken(payload.sessionToken);
      setCaptchaToken(null);
      setStep("verify");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!sessionToken) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/zgloszenie/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, email, fullName, captchaToken }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Weryfikacja nie powiodła się.");
      }
      setVerification(payload as ServiceIntakeVerifyResult);
      setSelectedProjectId(payload.projects[0]?.id ?? null);
      setCaptchaToken(null);
      setStep("project");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!verification || !selectedProjectId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/zgloszenie/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: verification.verificationToken,
          projectId: selectedProjectId,
          priority,
          description,
          contactPhone,
          acceptedPaidTerms: requiresPaidAcceptance ? acceptedPaidTerms : false,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać zgłoszenia.");
      }
      setReferenceNumber(payload.referenceNumber ?? null);
      setStep("done");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-soft">
          <Wrench className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Zgłoszenie serwisowe</h1>
          <p className="text-sm text-muted">Szybki kreator — krok po kroku</p>
        </div>
      </div>

      {step !== "done" ? (
        <div className="mb-6">
          <StepIndicator current={step as Exclude<WizardStep, "done">} />
        </div>
      ) : null}

      <Card>
        <CardContent className="grid gap-5 py-6">
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          {step === "email" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Podaj adres e-mail</h2>
                <p className="mt-1 text-sm text-muted">
                  Użyj adresu podanego przy wdrożeniu systemu. Następnie potwierdzimy Twoją tożsamość.
                </p>
              </div>
              <Field label="E-mail">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jan@firma.pl"
                />
              </Field>
              <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
              <Button
                type="button"
                disabled={loading || !email.trim()}
                onClick={() => void handleStart()}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Dalej
              </Button>
            </>
          ) : null}

          {step === "verify" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Potwierdź tożsamość</h2>
                <p className="mt-1 text-sm text-muted">
                  Podaj imię i nazwisko tak jak w umowie / bazie klientów ({email}).
                </p>
              </div>
              <Field label="Imię i nazwisko">
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jan Kowalski"
                />
              </Field>
              <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("email")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={loading || !fullName.trim()}
                  onClick={() => void handleVerify()}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Zweryfikuj
                </Button>
              </div>
            </>
          ) : null}

          {step === "project" && verification ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Witaj, {verification.clientDisplayName}
                </h2>
                <p className="mt-1 text-sm text-muted">Wybierz obiekt, którego dotyczy zgłoszenie.</p>
              </div>
              <div className="grid gap-3">
                {verification.projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      selectedProjectId === project.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-muted/20 hover:border-accent/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{project.name}</p>
                      <WarrantyBadge project={project} />
                    </div>
                    {project.location ? (
                      <p className="mt-1 text-xs text-muted">{project.location}</p>
                    ) : null}
                  </button>
                ))}
              </div>

              {selectedProject && !selectedProject.isWarrantyActive ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="font-medium text-amber-100">Usługa pogwarancyjna — stawki orientacyjne</p>
                  <ul className="mt-2 grid gap-1 text-amber-50/90">
                    <li>Serwis: {formatMoney(verification.rates.installerHourly)}/h</li>
                    <li>Programowanie: {formatMoney(verification.rates.programmerHourly)}/h</li>
                    <li>Dojazd: {formatMoney(verification.rates.carPerKm)}/km</li>
                    <li>VAT: {verification.rates.vatRate}%</li>
                  </ul>
                  <p className="mt-2 text-xs text-amber-100/80">
                    Końcowa wycena zależy od zakresu prac. Akceptację warunków potwierdzisz przed wysłaniem.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("verify")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={!selectedProjectId}
                  onClick={() => setStep("details")}
                >
                  Dalej
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "details" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Opisz problem</h2>
                <p className="mt-1 text-sm text-muted">Im więcej szczegółów, tym szybciej zaplanujemy wizytę.</p>
              </div>
              <Field label="Priorytet">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SERVICE_INTAKE_PRIORITY_LABELS) as ServiceIntakePriority[]).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setPriority(entry)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm",
                        priority === entry
                          ? "bg-accent text-white"
                          : "border border-border bg-surface-muted text-muted",
                      )}
                    >
                      {SERVICE_INTAKE_PRIORITY_LABELS[entry]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Opis usterki / zgłoszenia">
                <Textarea
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Co nie działa? Od kiedy? Czy problem dotyczy całego obiektu?"
                />
              </Field>
              <Field label="Telefon kontaktowy (opcjonalnie)">
                <Input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="+48 ..."
                />
              </Field>
              {requiresPaidAcceptance ? (
                <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedPaidTerms}
                    onChange={(event) => setAcceptedPaidTerms(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Akceptuję, że usługa jest pogwarancyjna i może być rozliczana według obowiązujących stawek
                    serwisowych.
                  </span>
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("project")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={description.trim().length < 10 || (requiresPaidAcceptance && !acceptedPaidTerms)}
                  onClick={() => setStep("summary")}
                >
                  Podsumowanie
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "summary" && selectedProject && verification ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Podsumowanie</h2>
                <p className="mt-1 text-sm text-muted">Sprawdź dane przed wysłaniem zgłoszenia.</p>
              </div>
              <div className="grid gap-2 rounded-2xl border border-border bg-surface-muted/20 p-4 text-sm">
                <p>
                  <span className="text-muted">Klient:</span> {verification.clientDisplayName}
                </p>
                <p>
                  <span className="text-muted">E-mail:</span> {email}
                </p>
                <p>
                  <span className="text-muted">Obiekt:</span> {selectedProject.name}
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted">Gwarancja:</span>
                  <WarrantyBadge project={selectedProject} />
                </p>
                <p>
                  <span className="text-muted">Priorytet:</span> {SERVICE_INTAKE_PRIORITY_LABELS[priority]}
                </p>
                <p>
                  <span className="text-muted">Opis:</span> {description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("details")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button type="button" disabled={loading} onClick={() => void handleSubmit()}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardList className="mr-2 h-4 w-4" />
                  )}
                  Wyślij zgłoszenie
                </Button>
              </div>
            </>
          ) : null}

          {step === "done" ? (
            <div className="grid gap-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">Zgłoszenie wysłane</h2>
                {referenceNumber ? (
                  <p className="mt-2 text-sm text-muted">
                    Numer referencyjny:{" "}
                    <span className="font-semibold text-foreground">{referenceNumber}</span>
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted">
                  Skontaktujemy się wkrótce w sprawie dalszych kroków.
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
