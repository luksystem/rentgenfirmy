"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Loader2,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ServiceIntakeEstimatePanel } from "@/components/service-intake/service-intake-estimate-panel";
import {
  CAFE_PRIORITY_OPTIONS,
  getDoneScreenContent,
  SERVICE_INTAKE_REQUEST_TYPE_OPTIONS,
  WARRANTY_EMERGENCY_PHONE,
} from "@/lib/service-intake/cafe-priorities";
import {
  intakeAllowsPreliminaryAcceptance,
  intakeRequestTypeRequiresAiEstimate,
  shouldApplyIntakePrioritySurcharge,
} from "@/lib/service-intake/ai-estimate-flow";
import type { IntakeAiEstimatePublic } from "@/lib/service-intake/intake-ai-estimate";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS,
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  type ServiceIntakeAiEstimateSnapshot,
  type ServiceIntakePostWarrantyAction,
  type ServiceIntakePriority,
  type ServiceIntakeProjectOption,
  type ServiceIntakeRequestType,
  type ServiceIntakeVerifyResult,
  type ServiceIntakeWorkPreference,
} from "@/lib/service-intake/types";
import { cn, formatMoney } from "@/lib/utils";

type WizardStep =
  | "email"
  | "verify"
  | "project"
  | "requestType"
  | "details"
  | "action"
  | "estimate"
  | "summary"
  | "done";

const STEP_LABELS: Record<Exclude<WizardStep, "done">, string> = {
  email: "E-mail",
  verify: "Tożsamość",
  project: "Obiekt",
  requestType: "Rodzaj",
  details: "Zgłoszenie",
  action: "Działanie",
  estimate: "Wycena AI",
  summary: "Podsumowanie",
};

function StepIndicator({
  steps,
  current,
}: {
  steps: Exclude<WizardStep, "done">[];
  current: Exclude<WizardStep, "done">;
}) {
  const currentIndex = steps.indexOf(current);

  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
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

function CafePriorityLegend() {
  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-surface-muted/15 p-4 text-sm">
      <p className="font-medium text-foreground">
        <Coffee className="mr-1 inline h-4 w-4" />
        W LUKSYSTEM INTELIGENTNE INSTALACJE zgłoszenia serwisowe rozpatrujemy w systemie CAFE:
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CAFE_PRIORITY_OPTIONS.map((option) => (
          <div key={option.id} className={cn("rounded-xl border p-3", option.toneClass)}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold",
                  option.letterClass,
                )}
              >
                {option.letter}
              </span>
              <span className="font-medium text-foreground">
                {option.title}
                <Coffee className="ml-1 inline h-3.5 w-3.5 opacity-70" />
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{option.deadlineHint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceIntakeWizard() {
  const [step, setStep] = useState<WizardStep>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [verification, setVerification] = useState<ServiceIntakeVerifyResult | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<ServiceIntakeRequestType>("service");
  const [priority, setPriority] = useState<ServiceIntakePriority>("f");
  const [postWarrantyAction, setPostWarrantyAction] = useState<ServiceIntakePostWarrantyAction | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [attachmentLinks, setAttachmentLinks] = useState("");
  const [uploadedAttachments, setUploadedAttachments] = useState<
    Array<{ kind: "image" | "video" | "link"; url: string; label?: string | null }>
  >([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [aiEstimate, setAiEstimate] = useState<IntakeAiEstimatePublic | null>(null);
  const [aiEstimateSnapshot, setAiEstimateSnapshot] =
    useState<ServiceIntakeAiEstimateSnapshot | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [workPreference, setWorkPreference] = useState<ServiceIntakeWorkPreference | null>(null);
  const [preliminaryAccepted, setPreliminaryAccepted] = useState(false);
  const [preliminaryAcceptedOnSubmit, setPreliminaryAcceptedOnSubmit] = useState(false);

  const selectedProject = useMemo(
    () => verification?.projects.find((project) => project.id === selectedProjectId) ?? null,
    [verification?.projects, selectedProjectId],
  );

  const isServiceRequest = requestType === "service";
  const isPostWarrantyService =
    isServiceRequest && selectedProject ? !selectedProject.isWarrantyActive : false;
  const requiresActionStep = isPostWarrantyService;
  const requiresAiEstimate = intakeRequestTypeRequiresAiEstimate({
    requestType,
    isWarrantyActive: selectedProject?.isWarrantyActive ?? false,
    isServiceRequest,
  });
  const allowsPreliminaryAcceptance = intakeAllowsPreliminaryAcceptance({
    requestType,
    postWarrantyAction,
  });
  const appliesPrioritySurcharge = shouldApplyIntakePrioritySurcharge({
    requestType,
    isWarrantyActive: selectedProject?.isWarrantyActive ?? false,
    priority: isServiceRequest ? priority : null,
  });

  const visibleSteps = useMemo(() => {
    const steps: Exclude<WizardStep, "done">[] = [
      "email",
      "verify",
      "project",
      "requestType",
      "details",
    ];
    if (requiresActionStep) {
      steps.push("action");
    }
    if (requiresAiEstimate) {
      steps.push("estimate");
    }
    steps.push("summary");
    return steps;
  }, [requiresActionStep, requiresAiEstimate]);

  const doneContent = useMemo(
    () =>
      getDoneScreenContent({
        requestType,
        isWarrantyActive: selectedProject?.isWarrantyActive ?? false,
        priority: isServiceRequest ? priority : null,
      }),
    [isServiceRequest, priority, requestType, selectedProject?.isWarrantyActive],
  );

  function goNext(from: Exclude<WizardStep, "done">) {
    const index = visibleSteps.indexOf(from);
    const next = visibleSteps[index + 1];
    if (next) {
      setStep(next);
    }
  }

  function goBack(from: Exclude<WizardStep, "done">) {
    const index = visibleSteps.indexOf(from);
    const previous = visibleSteps[index - 1];
    if (previous) {
      setStep(previous);
    }
  }

  async function fetchAiEstimate() {
    if (!verification || !selectedProjectId || description.trim().length < 10) {
      return;
    }

    setEstimateLoading(true);
    setEstimateError(null);

    try {
      const response = await fetch("/api/zgloszenie/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: verification.verificationToken,
          projectId: selectedProjectId,
          description,
          requestType,
          priority: isServiceRequest ? priority : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się oszacować kosztów.");
      }

      const estimate = payload.estimate as IntakeAiEstimatePublic;
      setAiEstimate(estimate);
      setAiEstimateSnapshot(payload.snapshot as ServiceIntakeAiEstimateSnapshot);

      const suggested: ServiceIntakeWorkPreference =
        estimate.suggestedWorkMode === "remote"
          ? "remote"
          : estimate.suggestedWorkMode === "on_site"
            ? "on_site"
            : "either";
      setWorkPreference((current) => current ?? suggested);
    } catch (estimateErr) {
      setEstimateError(
        estimateErr instanceof Error ? estimateErr.message : "Nie udało się oszacować kosztów.",
      );
      setAiEstimate(null);
      setAiEstimateSnapshot(null);
    } finally {
      setEstimateLoading(false);
    }
  }

  useEffect(() => {
    if (step === "estimate") {
      void fetchAiEstimate();
    }
  }, [step, priority, requestType, postWarrantyAction, isServiceRequest]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/zgloszenie/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się rozpocząć.");
      }
      setSessionToken(payload.sessionToken);
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
        body: JSON.stringify({ sessionToken, email, fullName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Weryfikacja nie powiodła się.");
      }
      setVerification(payload as ServiceIntakeVerifyResult);
      setSelectedProjectId(payload.projects[0]?.id ?? null);
      setStep("project");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !verification?.verificationToken) {
      return;
    }

    setUploadingAttachment(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("verificationToken", verification.verificationToken);
      formData.append("file", file);
      const response = await fetch("/api/zgloszenie/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się przesłać pliku.");
      }
      setUploadedAttachments((current) => [...current, payload.attachment]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Błąd uploadu.");
    } finally {
      setUploadingAttachment(false);
      event.target.value = "";
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
          requestType,
          priority: isServiceRequest ? priority : null,
          postWarrantyAction: requiresActionStep ? postWarrantyAction : null,
          description,
          contactPhone,
          acceptedPaidTerms:
            requiresActionStep &&
            (postWarrantyAction === "on_site" || postWarrantyAction === "remote"),
          workPreference,
          preliminaryAccepted: allowsPreliminaryAcceptance && preliminaryAccepted,
          aiEstimateSnapshot,
          attachments: [
            ...uploadedAttachments,
            ...attachmentLinks
              .split(/\n|,/)
              .map((entry) => entry.trim())
              .filter(Boolean)
              .map((url) => ({
                kind: /\.(mp4|mov|webm)(\?|$)/i.test(url)
                  ? ("video" as const)
                  : /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
                    ? ("image" as const)
                    : ("link" as const),
                url,
              })),
          ],
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wysłać zgłoszenia.");
      }
      setReferenceNumber(payload.referenceNumber ?? null);
      setPreliminaryAcceptedOnSubmit(Boolean(payload.preliminaryAccepted));
      setStep("done");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }

  const installerRate = verification?.rates.installerHourly ?? 250;
  const carPerKm = verification?.rates.carPerKm ?? 1;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-soft">
          <Wrench className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Zgłoszenie serwisowe CAFE
          </h1>
          <p className="flex items-center gap-1 text-sm text-muted">
            <Coffee className="h-4 w-4" />
            Szybki kreator — krok po kroku
          </p>
        </div>
      </div>

      {step !== "done" ? (
        <div className="mb-6">
          <StepIndicator steps={visibleSteps} current={step as Exclude<WizardStep, "done">} />
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
              <Button type="button" disabled={loading || !email.trim()} onClick={() => void handleStart()}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Dalej
              </Button>
            </>
          ) : null}

          {step === "verify" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Potwierdź tożsamość</h2>
                <p className="mt-1 text-sm text-muted">
                  Podaj imię i nazwisko ({email}). Wystarczy częściowe dopasowanie do danych w naszej
                  bazie klientów.
                </p>
              </div>
              <Field label="Imię i nazwisko">
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jan Kowalski"
                />
              </Field>
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
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
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
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("verify")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button type="button" disabled={!selectedProjectId} onClick={() => goNext("project")}>
                  Dalej
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "requestType" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Wybierz rodzaj zgłoszenia</h2>
                <p className="mt-1 text-sm text-muted">W czym możemy pomóc?</p>
              </div>
              <div className="grid gap-3">
                {SERVICE_INTAKE_REQUEST_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                      requestType === option.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-muted/20 hover:border-accent/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="requestType"
                      checked={requestType === option.id}
                      onChange={() => setRequestType(option.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-foreground">{option.label}</span>
                      <span className="mt-0.5 block text-sm text-muted">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("requestType")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button type="button" onClick={() => goNext("requestType")}>
                  Dalej
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "details" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {isServiceRequest ? "Opisz problem" : "Opisz zgłoszenie"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Im więcej szczegółów, tym szybciej zaplanujemy działania.
                </p>
              </div>

              {isServiceRequest ? (
                <>
                  <CafePriorityLegend />
                  <Field label="Priorytet problemu *">
                    <div className="grid gap-2">
                      {CAFE_PRIORITY_OPTIONS.map((option) => (
                        <label
                          key={option.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                            priority === option.id
                              ? "border-accent bg-accent/10"
                              : "border-border bg-surface-muted/20 hover:border-accent/40",
                          )}
                        >
                          <input
                            type="radio"
                            name="cafePriority"
                            checked={priority === option.id}
                            onChange={() => setPriority(option.id)}
                            className="mt-1"
                          />
                          <span className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                                option.letterClass,
                              )}
                            >
                              {option.letter}
                            </span>
                            <span className="text-sm text-foreground">{option.clientLabel}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </>
              ) : null}

              <Field label="Opis problemu / zgłoszenia *">
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
              <Field label="Zdjęcia i filmy (opcjonalnie)">
                <div className="grid gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    disabled={uploadingAttachment || !verification}
                    onChange={(event) => void handleAttachmentUpload(event)}
                  />
                  {uploadingAttachment ? (
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Przesyłanie pliku…
                    </p>
                  ) : null}
                  {uploadedAttachments.length > 0 ? (
                    <ul className="grid gap-1 text-xs text-muted">
                      {uploadedAttachments.map((attachment, index) => (
                        <li key={`${attachment.url}-${index}`}>
                          ✓ {attachment.label ?? attachment.kind} — przesłano
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Field>
              <Field label="Linki do dokumentów (opcjonalnie)">
                <Textarea
                  rows={3}
                  value={attachmentLinks}
                  onChange={(event) => setAttachmentLinks(event.target.value)}
                  placeholder="Wklej linki — każdy w osobnej linii (zdjęcie, film, dokument)"
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("details")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={description.trim().length < 10 || (isServiceRequest && !priority)}
                  onClick={() => goNext("details")}
                >
                  Dalej
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "action" && verification && selectedProject ? (
            <>
              <div className="rounded-2xl border border-border/80 bg-surface-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Dziękujemy za zgłoszenie — proszę czekać na nasz kontakt</p>
                <p className="mt-2 text-muted">
                  Będziemy starać się pomóc jak najszybciej. Maksymalnie skontaktujemy się w ciągu 7 dni
                  roboczych.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">W jaki sposób mamy zadziałać?</h2>
                <p className="mt-1 text-sm text-muted">
                  Obiekt jest pogwarancyjny — wybierz preferowany sposób obsługi zgłoszenia.
                </p>
              </div>
              <div className="grid gap-3">
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3",
                    postWarrantyAction === "offer"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-muted/20",
                  )}
                >
                  <input
                    type="radio"
                    name="postWarrantyAction"
                    checked={postWarrantyAction === "offer"}
                    onChange={() => setPostWarrantyAction("offer")}
                    className="mt-1"
                  />
                  <span className="text-sm text-foreground">
                    Poproszę o przygotowanie oferty — po jej akceptacji przeze mnie podejmiemy działania
                  </span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3",
                    postWarrantyAction === "on_site"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-muted/20",
                  )}
                >
                  <input
                    type="radio"
                    name="postWarrantyAction"
                    checked={postWarrantyAction === "on_site"}
                    onChange={() => setPostWarrantyAction("on_site")}
                    className="mt-1"
                  />
                  <span className="text-sm text-foreground">
                    Poproszę o jak najszybsze działanie PRZYJAZD — akceptuję stawkę serwisową{" "}
                    {formatMoney(installerRate)}/h pracy serwisanta łącznie z dojazdem i{" "}
                    {formatMoney(carPerKm)}/km dojazdu
                  </span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3",
                    postWarrantyAction === "remote"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-muted/20",
                  )}
                >
                  <input
                    type="radio"
                    name="postWarrantyAction"
                    checked={postWarrantyAction === "remote"}
                    onChange={() => setPostWarrantyAction("remote")}
                    className="mt-1"
                  />
                  <span className="text-sm text-foreground">
                    Poproszę o jak najszybsze działanie SERWIS ZDALNY — akceptuję stawkę serwisową{" "}
                    {formatMoney(installerRate)}/h pracy serwisanta
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("action")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button type="button" disabled={!postWarrantyAction} onClick={() => goNext("action")}>
                  {requiresAiEstimate ? "Orientacyjna wycena" : "Podsumowanie"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "estimate" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Orientacyjna wycena</h2>
                <p className="mt-1 text-sm text-muted">
                  Na podstawie opisu, specyfikacji obiektu i lokalizacji szacujemy przewidywany czas
                  pracy i koszt netto usługi. Ostateczna oferta może się różnić po doprecyzowaniu
                  wymagań.
                </p>
              </div>

              {appliesPrioritySurcharge && verification ? (
                <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Wybrano priorytet CAFE{" "}
                  <strong>{priority === "c" ? "C — Krytyczny" : "A — Asap"}</strong>. Orientacyjna
                  wycena uwzględnia dopłatę +{verification.rates.prioritySurchargePercent}% do
                  wszystkich stawek robocizny i dojazdu.
                </p>
              ) : null}

              <ServiceIntakeEstimatePanel
                estimate={aiEstimate}
                loading={estimateLoading}
                error={estimateError}
                workPreference={workPreference}
                onWorkPreferenceChange={setWorkPreference}
                onRetry={() => void fetchAiEstimate()}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("estimate")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={estimateLoading || !aiEstimate || !workPreference}
                  onClick={() => goNext("estimate")}
                >
                  Dalej do podsumowania
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
                  <span className="text-muted">Rodzaj:</span>{" "}
                  {SERVICE_INTAKE_REQUEST_TYPE_LABELS[requestType]}
                </p>
                {isServiceRequest ? (
                  <p>
                    <span className="text-muted">Priorytet CAFE:</span>{" "}
                    {SERVICE_INTAKE_PRIORITY_LABELS[priority]}
                  </p>
                ) : null}
                {postWarrantyAction ? (
                  <p>
                    <span className="text-muted">Sposób działania:</span>{" "}
                    {SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS[postWarrantyAction]}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted">Opis:</span> {description}
                </p>
              </div>

              {requiresAiEstimate && aiEstimate && allowsPreliminaryAcceptance ? (
                <div className="grid gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-4 text-sm">
                  <p className="font-medium text-foreground">Orientacyjna wycena AI</p>
                  <p>
                    Szacowana kwota netto:{" "}
                    <span className="font-semibold">{formatMoney(aiEstimate.estimatedNetTotal)}</span>
                  </p>
                  <p className="text-xs text-muted">{aiEstimate.disclaimer}</p>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-background/50 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={preliminaryAccepted}
                      onChange={(event) => setPreliminaryAccepted(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-foreground">
                        Wstępnie akceptuję orientacyjną wycenę
                      </span>
                      <span className="mt-1 block text-muted">
                        Rozumiem, że ostateczna oferta może się zmienić po doprecyzowaniu wymagań.
                        Po wysłaniu zgłoszenia nasz zespół przygotuje szczegółową propozycję.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("summary")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={
                    loading ||
                    (allowsPreliminaryAcceptance && preliminaryAccepted && !aiEstimateSnapshot)
                  }
                  onClick={() => void handleSubmit()}
                >
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
            <div className="grid gap-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <div className="overflow-hidden rounded-2xl border border-border/80">
                <div className="bg-foreground px-4 py-3 text-center text-sm font-semibold text-background">
                  {doneContent.title}
                </div>
                <div className="grid gap-3 p-4 text-sm text-foreground">
                  {referenceNumber ? (
                    <p className="text-center text-muted">
                      Numer referencyjny:{" "}
                      <span className="font-semibold text-foreground">{referenceNumber}</span>
                    </p>
                  ) : null}
                  {doneContent.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-muted">
                      {paragraph}
                    </p>
                  ))}
                  {preliminaryAcceptedOnSubmit ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                      Przyjęliśmy wstępną akceptację orientacyjnej wyceny. Przygotujemy szczegółową
                      ofertę i skontaktujemy się z Tobą.
                    </p>
                  ) : null}
                  {doneContent.showEmergencyPhone ? (
                    <p className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-medium text-amber-100">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${WARRANTY_EMERGENCY_PHONE.replace(/\s/g, "")}`}>
                        {WARRANTY_EMERGENCY_PHONE}
                      </a>
                      <span className="text-xs font-normal text-amber-100/80">(24/7 — gwarancja)</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
