"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea, fieldGroupInvalidClassName } from "@/components/ui/input";
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
  intakeRequiresPreliminaryAcceptance,
  shouldApplyIntakePrioritySurcharge,
} from "@/lib/service-intake/ai-estimate-flow";
import type { IntakeAiEstimatePublic } from "@/lib/service-intake/intake-ai-estimate";
import {
  formatGuestContactAddress,
  isGuestContactAddressComplete,
  isValidGuestPostalCode,
  normalizeGuestContactAddress,
  normalizeGuestPostalCode,
} from "@/lib/service-intake/guest-address";
import {
  isGuestIntakeRequestType,
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
import type { KnowledgeSuggestionResult } from "@/lib/knowledge/types";
import { cn, formatMoney } from "@/lib/utils";

type WizardStep =
  | "email"
  | "verify"
  | "project"
  | "requestType"
  | "details"
  | "suggestion"
  | "action"
  | "estimate"
  | "summary"
  | "done"
  | "resolved";

type WizardFieldKey =
  | "email"
  | "firstName"
  | "lastName"
  | "project"
  | "description"
  | "contactPhone"
  | "guestAddressStreet"
  | "guestAddressPostalCode"
  | "guestAddressCity"
  | "postWarrantyAction"
  | "workPreference"
  | "preliminaryAccepted";

type WizardFieldErrors = Partial<Record<WizardFieldKey, string>>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateGuestAddressFields(address: {
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
}): WizardFieldErrors {
  const normalized = normalizeGuestContactAddress(address);
  const errors: WizardFieldErrors = {};

  if (normalized.addressStreet.length < 3) {
    errors.guestAddressStreet = "Podaj ulicę i numer obiektu (min. 3 znaki).";
  }
  if (normalized.addressCity.length < 2) {
    errors.guestAddressCity = "Podaj miasto.";
  }
  if (!isValidGuestPostalCode(normalized.addressPostalCode)) {
    errors.guestAddressPostalCode = "Podaj poprawny kod pocztowy (format: 00-001).";
  }

  return errors;
}

const STEP_LABELS: Record<Exclude<WizardStep, "done" | "resolved">, string> = {
  email: "E-mail",
  verify: "Tożsamość",
  project: "Obiekt",
  requestType: "Rodzaj",
  details: "Zgłoszenie",
  suggestion: "Sugestia AI",
  action: "Działanie",
  estimate: "Wycena AI",
  summary: "Podsumowanie",
};

function StepIndicator({
  steps,
  current,
}: {
  steps: Exclude<WizardStep, "done" | "resolved">[];
  current: Exclude<WizardStep, "done" | "resolved">;
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [verifyFailureMessage, setVerifyFailureMessage] = useState<string | null>(null);
  const [guestAddressStreet, setGuestAddressStreet] = useState("");
  const [guestAddressCity, setGuestAddressCity] = useState("");
  const [guestAddressPostalCode, setGuestAddressPostalCode] = useState("");
  const guestContactAddress = useMemo(
    () => ({
      addressStreet: guestAddressStreet,
      addressCity: guestAddressCity,
      addressPostalCode: guestAddressPostalCode,
    }),
    [guestAddressStreet, guestAddressCity, guestAddressPostalCode],
  );
  const guestAddressComplete = isGuestContactAddressComplete(guestContactAddress);
  const guestAddressLabel = guestAddressComplete
    ? formatGuestContactAddress(guestContactAddress)
    : "";
  const [estimateClarifications, setEstimateClarifications] = useState("");
  const [recalculatingEstimate, setRecalculatingEstimate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<WizardFieldErrors>({});
  const [suggestionAsked, setSuggestionAsked] = useState<"pending" | "loading" | "shown" | "error">(
    "pending",
  );
  const [suggestionResult, setSuggestionResult] = useState<KnowledgeSuggestionResult | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  function clearFieldError(key: WizardFieldKey) {
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function applyFieldErrors(errors: WizardFieldErrors) {
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

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
  const requiresPreliminaryAcceptance = intakeRequiresPreliminaryAcceptance({
    requestType,
    postWarrantyAction,
    isGuest: isGuestMode,
  });
  const guestRequestTypeOptions = useMemo(
    () => SERVICE_INTAKE_REQUEST_TYPE_OPTIONS.filter((option) => isGuestIntakeRequestType(option.id)),
    [],
  );
  const requestTypeOptions = isGuestMode ? guestRequestTypeOptions : SERVICE_INTAKE_REQUEST_TYPE_OPTIONS;
  const requiresAiEstimateGuest = isGuestMode && isGuestIntakeRequestType(requestType);
  const effectiveRequiresAiEstimate = isGuestMode ? requiresAiEstimateGuest : requiresAiEstimate;

  const visibleSteps = useMemo(() => {
    const steps: Exclude<WizardStep, "done" | "resolved">[] = ["email", "verify"];
    if (!isGuestMode) {
      steps.push("project");
    }
    steps.push("requestType", "details");
    if (isServiceRequest) {
      steps.push("suggestion");
    }
    if (requiresActionStep) {
      steps.push("action");
    }
    if (effectiveRequiresAiEstimate) {
      steps.push("estimate");
    }
    steps.push("summary");
    return steps;
  }, [isServiceRequest, requiresActionStep, effectiveRequiresAiEstimate, isGuestMode]);

  const appliesPrioritySurcharge = shouldApplyIntakePrioritySurcharge({
    requestType,
    isWarrantyActive: selectedProject?.isWarrantyActive ?? false,
    priority: isServiceRequest ? priority : null,
  });

  const doneContent = useMemo(
    () =>
      getDoneScreenContent({
        requestType,
        isWarrantyActive: selectedProject?.isWarrantyActive ?? false,
        priority: isServiceRequest ? priority : null,
      }),
    [isServiceRequest, priority, requestType, selectedProject?.isWarrantyActive],
  );

  function goNext(from: Exclude<WizardStep, "done" | "resolved">) {
    setFieldErrors({});
    const index = visibleSteps.indexOf(from);
    const next = visibleSteps[index + 1];
    if (next) {
      setStep(next);
    }
  }

  function validateEmailStep(): boolean {
    const errors: WizardFieldErrors = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errors.email = "Podaj adres e-mail.";
    } else if (!isValidEmail(trimmed)) {
      errors.email = "Podaj poprawny adres e-mail.";
    }
    return applyFieldErrors(errors);
  }

  function validateVerifyStep(): boolean {
    const errors: WizardFieldErrors = {};
    if (!firstName.trim() && !lastName.trim()) {
      errors.firstName = "Podaj imię lub nazwisko.";
      errors.lastName = "Podaj imię lub nazwisko.";
    }
    return applyFieldErrors(errors);
  }

  function validateProjectStep(): boolean {
    const errors: WizardFieldErrors = {};
    if (!selectedProjectId) {
      errors.project = "Wybierz obiekt, którego dotyczy zgłoszenie.";
    }
    return applyFieldErrors(errors);
  }

  function validateDetailsStep(): boolean {
    const errors: WizardFieldErrors = {};
    if (description.trim().length < 10) {
      errors.description = "Opis musi mieć co najmniej 10 znaków.";
    }
    if (isGuestMode) {
      if (contactPhone.trim().length < 7) {
        errors.contactPhone = "Podaj numer telefonu (min. 7 znaków).";
      }
      Object.assign(errors, validateGuestAddressFields(guestContactAddress));
    }
    return applyFieldErrors(errors);
  }

  function validateActionStep(): boolean {
    const errors: WizardFieldErrors = {};
    if (!postWarrantyAction) {
      errors.postWarrantyAction = "Wybierz sposób działania.";
    }
    return applyFieldErrors(errors);
  }

  function validateEstimateStep(): boolean {
    const errors: WizardFieldErrors = {};
    if (!aiEstimate) {
      setError("Poczekaj na wycenę AI albo spróbuj ponownie.");
      return false;
    }
    if (!postWarrantyAction && !workPreference) {
      errors.workPreference = "Wybierz preferowany sposób realizacji.";
    }
    if (requiresPreliminaryAcceptance && !preliminaryAccepted) {
      errors.preliminaryAccepted = "Zaakceptuj orientacyjną wycenę, aby przejść dalej.";
    }
    setError(null);
    return applyFieldErrors(errors);
  }

  function handleEmailNext() {
    if (!validateEmailStep()) {
      return;
    }
    void handleStart();
  }

  function handleVerifyNext() {
    if (!validateVerifyStep()) {
      return;
    }
    void handleVerify();
  }

  function handleProjectNext() {
    if (!validateProjectStep()) {
      return;
    }
    goNext("project");
  }

  function handleDetailsNext() {
    if (!validateDetailsStep()) {
      return;
    }
    setSuggestionAsked("pending");
    setSuggestionResult(null);
    setSuggestionError(null);
    goNext("details");
  }

  async function fetchKnowledgeSuggestion() {
    if (!verification) {
      return;
    }
    setSuggestionAsked("loading");
    setSuggestionError(null);
    try {
      const response = await fetch("/api/zgloszenie/knowledge-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: verification.verificationToken,
          description,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować sugestii.");
      }
      setSuggestionResult(payload.suggestion as KnowledgeSuggestionResult);
      setSuggestionAsked("shown");
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : "Nie udało się wygenerować sugestii.");
      setSuggestionAsked("error");
    }
  }

  function handleActionNext() {
    if (!validateActionStep()) {
      return;
    }
    goNext("action");
  }

  function handleEstimateNext() {
    if (estimateLoading || recalculatingEstimate) {
      return;
    }
    if (!validateEstimateStep()) {
      return;
    }
    goNext("estimate");
  }

  function goBack(from: Exclude<WizardStep, "done" | "resolved">) {
    setFieldErrors({});
    const index = visibleSteps.indexOf(from);
    const previous = visibleSteps[index - 1];
    if (previous) {
      setStep(previous);
    }
  }

  const fetchAiEstimate = useCallback(
    async (options?: { clarifications?: string; isRecalculate?: boolean }) => {
      if (!verification || description.trim().length < 10) {
        return;
      }
      if (isGuestMode) {
        if (!guestAddressComplete) {
          return;
        }
      } else if (!selectedProjectId) {
        return;
      }

      const clarifications = options?.clarifications ?? estimateClarifications;

      if (options?.isRecalculate) {
        setRecalculatingEstimate(true);
      } else {
        setEstimateLoading(true);
      }
      setEstimateError(null);

      try {
        const response = await fetch("/api/zgloszenie/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationToken: verification.verificationToken,
            projectId: isGuestMode ? undefined : selectedProjectId,
            description,
            requestType,
            priority: isServiceRequest ? priority : null,
            postWarrantyAction: requiresActionStep ? postWarrantyAction : null,
            contactAddress: isGuestMode ? guestContactAddress : undefined,
            contactPhone: isGuestMode ? contactPhone : undefined,
            isNewContact: isGuestMode,
            estimateClarifications: clarifications.trim() || undefined,
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
          postWarrantyAction === "on_site"
            ? "on_site"
            : postWarrantyAction === "remote"
              ? "remote"
              : estimate.suggestedWorkMode === "remote"
                ? "remote"
                : estimate.suggestedWorkMode === "on_site"
                  ? "on_site"
                  : "either";
        setWorkPreference((current) => current ?? suggested);
        setPreliminaryAccepted(false);
      } catch (estimateErr) {
        setEstimateError(
          estimateErr instanceof Error ? estimateErr.message : "Nie udało się oszacować kosztów.",
        );
        setAiEstimate(null);
        setAiEstimateSnapshot(null);
      } finally {
        setEstimateLoading(false);
        setRecalculatingEstimate(false);
      }
    },
    [
      contactPhone,
      description,
      estimateClarifications,
      guestAddressComplete,
      guestContactAddress,
      isGuestMode,
      isServiceRequest,
      postWarrantyAction,
      priority,
      requestType,
      requiresActionStep,
      selectedProjectId,
      verification,
    ],
  );

  useEffect(() => {
    if (step === "estimate") {
      void fetchAiEstimate();
    }
  }, [fetchAiEstimate, step]);

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
    setVerifyFailureMessage(null);
    try {
      const response = await fetch("/api/zgloszenie/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, email, firstName, lastName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Weryfikacja nie powiodła się.");
      }
      if (payload.ok === false) {
        setVerifyFailureMessage(
          payload.message ??
            "Nie udało się potwierdzić tożsamości. Sprawdź dane albo kontynuuj jako nowy kontakt.",
        );
        return;
      }

      setIsGuestMode(false);
      setGuestAddressStreet("");
      setGuestAddressCity("");
      setGuestAddressPostalCode("");
      setVerification(payload as ServiceIntakeVerifyResult);
      setSelectedProjectId(payload.projects[0]?.id ?? null);
      setRequestType("service");
      setStep("project");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueAsGuest() {
    if (!sessionToken) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/zgloszenie/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, email, firstName, lastName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się kontynuować.");
      }

      setIsGuestMode(true);
      setVerifyFailureMessage(null);
      setVerification(payload as ServiceIntakeVerifyResult);
      setSelectedProjectId(null);
      setRequestType("offer_request");
      setPostWarrantyAction(null);
      setPriority("f");
      setEstimateClarifications("");
      setGuestAddressStreet("");
      setGuestAddressCity("");
      setGuestAddressPostalCode("");
      setStep("requestType");
    } catch (guestError) {
      setError(guestError instanceof Error ? guestError.message : "Błąd.");
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
    if (!verification) {
      return;
    }
    if (!isGuestMode && !selectedProjectId) {
      return;
    }

    const errors: WizardFieldErrors = {};
    if (requiresPreliminaryAcceptance && !preliminaryAccepted) {
      errors.preliminaryAccepted = "Zaakceptuj orientacyjną wycenę, aby wysłać zgłoszenie.";
    }
    if (!applyFieldErrors(errors)) {
      return;
    }
    if (preliminaryAccepted && !aiEstimateSnapshot) {
      setError("Brak zapisanej wyceny — wróć do kroku wyceny i spróbuj ponownie.");
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
          projectId: isGuestMode ? undefined : selectedProjectId,
          requestType,
          priority: isServiceRequest ? priority : null,
          postWarrantyAction: requiresActionStep ? postWarrantyAction : null,
          description,
          contactPhone,
          contactAddress: isGuestMode ? guestContactAddress : undefined,
          workPreference,
          preliminaryAccepted: allowsPreliminaryAcceptance && preliminaryAccepted,
          aiEstimateSnapshot,
          estimateClarifications: effectiveRequiresAiEstimate
            ? estimateClarifications.trim() || undefined
            : undefined,
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

  const estimateNextDisabled = estimateLoading || recalculatingEstimate;

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

      {step !== "done" && step !== "resolved" ? (
        <div className="mb-6">
          <StepIndicator
            steps={visibleSteps}
            current={step as Exclude<WizardStep, "done" | "resolved">}
          />
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
              <Field label="E-mail" error={fieldErrors.email} invalid={Boolean(fieldErrors.email)}>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  invalid={Boolean(fieldErrors.email)}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="jan@firma.pl"
                />
              </Field>
              <Button type="button" disabled={loading} onClick={handleEmailNext}>
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
                  Podaj imię lub nazwisko powiązane z adresem {email}. Wystarczy częściowe dopasowanie.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Imię (opcjonalnie)"
                  error={fieldErrors.firstName}
                  invalid={Boolean(fieldErrors.firstName)}
                >
                  <Input
                    value={firstName}
                    invalid={Boolean(fieldErrors.firstName)}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      clearFieldError("firstName");
                      setVerifyFailureMessage(null);
                    }}
                    placeholder="Jan"
                  />
                </Field>
                <Field
                  label="Nazwisko (opcjonalnie)"
                  error={fieldErrors.lastName}
                  invalid={Boolean(fieldErrors.lastName)}
                >
                  <Input
                    value={lastName}
                    invalid={Boolean(fieldErrors.lastName)}
                    onChange={(event) => {
                      setLastName(event.target.value);
                      clearFieldError("lastName");
                      setVerifyFailureMessage(null);
                    }}
                    placeholder="Kowalski"
                  />
                </Field>
              </div>

              {verifyFailureMessage ? (
                <div className="grid gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="font-medium text-amber-100">Nie udało się potwierdzić tożsamości</p>
                  <p className="text-muted">{verifyFailureMessage}</p>
                  <p className="text-muted">
                    Prawdopodobnie nie jesteś naszym klientem albo wpisałeś błędne dane. Możesz cofnąć
                    się i poprawić e-mail / imię i nazwisko albo kontynuować jako nowy kontakt — wtedy
                    przygotujemy orientacyjną ofertę na prośbę o wycenę lub nową funkcjonalność.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVerifyFailureMessage(null);
                    setStep("email");
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                {verifyFailureMessage ? (
                  <Button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (!validateVerifyStep()) {
                        return;
                      }
                      void handleContinueAsGuest();
                    }}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Kontynuuj jako nowy kontakt
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleVerifyNext}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {verifyFailureMessage ? "Spróbuj ponownie" : "Zweryfikuj"}
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
              <div
                className={cn(
                  "grid gap-3 rounded-2xl p-1",
                  fieldErrors.project && fieldGroupInvalidClassName,
                )}
              >
                {fieldErrors.project ? (
                  <p className="px-1 text-xs text-rose-400">{fieldErrors.project}</p>
                ) : null}
                {verification.projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      clearFieldError("project");
                    }}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      selectedProjectId === project.id
                        ? "border-accent bg-accent/10"
                        : fieldErrors.project
                          ? "border-rose-500/50 bg-rose-500/5 hover:border-rose-500/70"
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
                <Button type="button" onClick={handleProjectNext}>
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
                <p className="mt-1 text-sm text-muted">
                  {isGuestMode
                    ? "Jako nowy kontakt możesz poprosić o ofertę lub opisać nową funkcjonalność."
                    : "W czym możemy pomóc?"}
                </p>
              </div>
              <div className="grid gap-3">
                {requestTypeOptions.map((option) => (
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

              <Field
                label="Opis problemu / zgłoszenia *"
                error={fieldErrors.description}
                invalid={Boolean(fieldErrors.description)}
              >
                <Textarea
                  rows={5}
                  value={description}
                  invalid={Boolean(fieldErrors.description)}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    clearFieldError("description");
                  }}
                  placeholder={
                    isGuestMode
                      ? "Opisz, czego potrzebujesz — im więcej szczegółów, tym trafniejsza wycena."
                      : "Co nie działa? Od kiedy? Czy problem dotyczy całego obiektu?"
                  }
                />
              </Field>
              {isGuestMode ? (
                <div
                  className={cn(
                    "grid gap-3 rounded-2xl border bg-surface-muted/15 p-4",
                    fieldErrors.guestAddressStreet ||
                      fieldErrors.guestAddressPostalCode ||
                      fieldErrors.guestAddressCity
                      ? "border-rose-500/50 ring-1 ring-rose-500/30"
                      : "border-border/70",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">Adres obiektu *</p>
                    <p className="mt-1 text-xs text-muted">
                      Pełny adres pozwala nam wyliczyć odległość i koszt dojazdu. Podaj ulicę z
                      numerem, kod pocztowy i miasto.
                    </p>
                  </div>
                  <Field
                    label="Ulica i numer *"
                    error={fieldErrors.guestAddressStreet}
                    invalid={Boolean(fieldErrors.guestAddressStreet)}
                  >
                    <Input
                      value={guestAddressStreet}
                      invalid={Boolean(fieldErrors.guestAddressStreet)}
                      onChange={(event) => {
                        setGuestAddressStreet(event.target.value);
                        clearFieldError("guestAddressStreet");
                      }}
                      placeholder="np. Zbożowa 77"
                      autoComplete="street-address"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Kod pocztowy *"
                      error={fieldErrors.guestAddressPostalCode}
                      invalid={Boolean(fieldErrors.guestAddressPostalCode)}
                    >
                      <Input
                        value={guestAddressPostalCode}
                        invalid={Boolean(fieldErrors.guestAddressPostalCode)}
                        onChange={(event) => {
                          setGuestAddressPostalCode(event.target.value);
                          clearFieldError("guestAddressPostalCode");
                        }}
                        onBlur={() =>
                          setGuestAddressPostalCode((current) => normalizeGuestPostalCode(current))
                        }
                        placeholder="00-001"
                        inputMode="numeric"
                        autoComplete="postal-code"
                      />
                    </Field>
                    <Field
                      label="Miasto *"
                      error={fieldErrors.guestAddressCity}
                      invalid={Boolean(fieldErrors.guestAddressCity)}
                    >
                      <Input
                        value={guestAddressCity}
                        invalid={Boolean(fieldErrors.guestAddressCity)}
                        onChange={(event) => {
                          setGuestAddressCity(event.target.value);
                          clearFieldError("guestAddressCity");
                        }}
                        placeholder="np. Biskupice"
                        autoComplete="address-level2"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
              <Field
                label={isGuestMode ? "Telefon kontaktowy *" : "Telefon kontaktowy (opcjonalnie)"}
                error={fieldErrors.contactPhone}
                invalid={Boolean(fieldErrors.contactPhone)}
              >
                <Input
                  value={contactPhone}
                  invalid={Boolean(fieldErrors.contactPhone)}
                  onChange={(event) => {
                    setContactPhone(event.target.value);
                    clearFieldError("contactPhone");
                  }}
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
                <Button type="button" onClick={handleDetailsNext}>
                  Dalej
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "suggestion" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Sugestia rozwiązania</h2>
                <p className="mt-1 text-sm text-muted">
                  Zanim zgłosisz serwis, możemy sprawdzić naszą bazę wiedzy i podsunąć Ci możliwe
                  rozwiązanie problemu.
                </p>
              </div>

              {suggestionAsked === "pending" ? (
                <div className="grid gap-3">
                  <p className="text-sm text-foreground">
                    Chcesz otrzymać sugestię rozwiązania problemu, zanim zgłosisz serwis?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void fetchKnowledgeSuggestion()}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Tak, pokaż sugestię
                    </Button>
                    <Button type="button" variant="outline" onClick={() => goNext("suggestion")}>
                      Nie, przejdź dalej do zgłoszenia
                    </Button>
                  </div>
                </div>
              ) : null}

              {suggestionAsked === "loading" ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizujemy opis i szukamy w bazie wiedzy…
                </p>
              ) : null}

              {suggestionAsked === "error" ? (
                <div className="grid gap-3">
                  <p className="text-sm text-rose-400">{suggestionError}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void fetchKnowledgeSuggestion()}
                    >
                      Spróbuj ponownie
                    </Button>
                    <Button type="button" onClick={() => goNext("suggestion")}>
                      Przejdź dalej do zgłoszenia
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {suggestionAsked === "shown" && suggestionResult ? (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4 text-sm">
                    {suggestionResult.hasSuggestion ? (
                      <>
                        <p className="font-medium text-foreground">Możliwe rozwiązanie</p>
                        <p className="mt-2 whitespace-pre-line text-foreground/90">
                          {suggestionResult.summary}
                        </p>
                        {suggestionResult.steps.length > 0 ? (
                          <ol className="mt-3 grid gap-1 list-decimal pl-4 text-foreground/90">
                            {suggestionResult.steps.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ol>
                        ) : null}
                        {suggestionResult.followUpQuestion ? (
                          <p className="mt-3 text-xs text-muted">
                            Dodatkowe pytanie: {suggestionResult.followUpQuestion}
                          </p>
                        ) : null}
                        {suggestionResult.sourceTitles.length > 0 ? (
                          <p className="mt-3 text-xs text-muted">
                            Źródła: {suggestionResult.sourceTitles.join(", ")}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-foreground/90">
                        {suggestionResult.summary ||
                          "Nie znaleźliśmy wystarczających informacji w naszej bazie wiedzy, aby zaproponować rozwiązanie. Najlepiej zgłoś serwis — zajmiemy się tym."}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted">
                      To tylko sugestia AI na podstawie wiedzy firmy — nie zastępuje profesjonalnej
                      diagnozy serwisowej.
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Czy spróbujesz rozwiązać problem samodzielnie, czy nadal chcesz zgłosić serwis?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep("resolved")}>
                      Spróbuję rozwiązać sam
                    </Button>
                    <Button type="button" onClick={() => goNext("suggestion")}>
                      Nadal chcę zgłosić serwis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("suggestion")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
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
              <div
                className={cn(
                  "grid gap-3 rounded-2xl p-1",
                  fieldErrors.postWarrantyAction && fieldGroupInvalidClassName,
                )}
              >
                {fieldErrors.postWarrantyAction ? (
                  <p className="px-1 text-xs text-rose-400">{fieldErrors.postWarrantyAction}</p>
                ) : null}
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3",
                    postWarrantyAction === "offer"
                      ? "border-accent bg-accent/10"
                      : fieldErrors.postWarrantyAction
                        ? "border-rose-500/50 bg-rose-500/5"
                        : "border-border bg-surface-muted/20",
                  )}
                >
                  <input
                    type="radio"
                    name="postWarrantyAction"
                    checked={postWarrantyAction === "offer"}
                    onChange={() => {
                      setPostWarrantyAction("offer");
                      clearFieldError("postWarrantyAction");
                    }}
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
                      : fieldErrors.postWarrantyAction
                        ? "border-rose-500/50 bg-rose-500/5"
                        : "border-border bg-surface-muted/20",
                  )}
                >
                  <input
                    type="radio"
                    name="postWarrantyAction"
                    checked={postWarrantyAction === "on_site"}
                    onChange={() => {
                      setPostWarrantyAction("on_site");
                      clearFieldError("postWarrantyAction");
                    }}
                    className="mt-1"
                  />
                  <span className="text-sm text-foreground">
                    Poproszę o jak najszybsze działanie PRZYJAZD — serwisant przyjedzie do obiektu
                  </span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3",
                    postWarrantyAction === "remote"
                      ? "border-accent bg-accent/10"
                      : fieldErrors.postWarrantyAction
                        ? "border-rose-500/50 bg-rose-500/5"
                        : "border-border bg-surface-muted/20",
                  )}
                >
                  <input
                    type="radio"
                    name="postWarrantyAction"
                    checked={postWarrantyAction === "remote"}
                    onChange={() => {
                      setPostWarrantyAction("remote");
                      clearFieldError("postWarrantyAction");
                    }}
                    className="mt-1"
                  />
                  <span className="text-sm text-foreground">
                    Poproszę o jak najszybsze działanie SERWIS ZDALNY — praca zdalna bez dojazdu
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("action")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button type="button" onClick={handleActionNext}>
                  {effectiveRequiresAiEstimate ? "Orientacyjna wycena" : "Podsumowanie"}
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
                  pracy i koszt netto usługi. Możesz doprecyzować wycenę poniżej — przy każdej opcji
                  działania (oferta, przyjazd, serwis zdalny).
                </p>
                {isGuestMode ? (
                  <p className="mt-2 text-xs text-amber-100">
                    Jako nowy kontakt wycena uwzględnia odległość od naszej firmy i dojazd. Przy
                    ogólnym opisie celowo szacujemy ostrożnie w górę.
                  </p>
                ) : null}
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
                onWorkPreferenceChange={(value) => {
                  setWorkPreference(value);
                  clearFieldError("workPreference");
                }}
                postWarrantyAction={postWarrantyAction}
                showPreliminaryAcceptance={allowsPreliminaryAcceptance}
                requiresPreliminaryAcceptance={requiresPreliminaryAcceptance}
                preliminaryAccepted={preliminaryAccepted}
                onPreliminaryAcceptedChange={(value) => {
                  setPreliminaryAccepted(value);
                  clearFieldError("preliminaryAccepted");
                }}
                onRetry={() => void fetchAiEstimate()}
                isNewContact={isGuestMode}
                estimateClarifications={estimateClarifications}
                onEstimateClarificationsChange={setEstimateClarifications}
                onRecalculateWithClarifications={() =>
                  void fetchAiEstimate({ clarifications: estimateClarifications, isRecalculate: true })
                }
                recalculating={recalculatingEstimate}
                workPreferenceError={fieldErrors.workPreference}
                preliminaryAcceptedError={fieldErrors.preliminaryAccepted}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("estimate")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button type="button" disabled={estimateNextDisabled} onClick={handleEstimateNext}>
                  Dalej do podsumowania
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}

          {step === "summary" && verification && (isGuestMode || selectedProject) ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Podsumowanie</h2>
                <p className="mt-1 text-sm text-muted">Sprawdź dane przed wysłaniem zgłoszenia.</p>
              </div>
              <div className="grid gap-2 rounded-2xl border border-border bg-surface-muted/20 p-4 text-sm">
                <p>
                  <span className="text-muted">{isGuestMode ? "Kontakt:" : "Klient:"}</span>{" "}
                  {verification.clientDisplayName}
                </p>
                <p>
                  <span className="text-muted">E-mail:</span> {email}
                </p>
                {isGuestMode ? (
                  <>
                    <p>
                      <span className="text-muted">Telefon:</span> {contactPhone}
                    </p>
                    <p>
                      <span className="text-muted">Adres obiektu:</span> {guestAddressLabel}
                    </p>
                    <p className="text-xs text-muted">
                      Utworzymy nowy kontakt w naszej bazie i przygotujemy rozliczenie serwisowe z
                      orientacyjną ofertą.
                    </p>
                  </>
                ) : selectedProject ? (
                  <>
                    <p>
                      <span className="text-muted">Obiekt:</span> {selectedProject.name}
                    </p>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-muted">Gwarancja:</span>
                      <WarrantyBadge project={selectedProject} />
                    </p>
                  </>
                ) : null}
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

              {effectiveRequiresAiEstimate && aiEstimate ? (
                <div className="grid gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-4 text-sm">
                  <p className="font-medium text-foreground">Orientacyjna wycena AI</p>
                  <p>
                    Szacowana kwota netto:{" "}
                    <span className="font-semibold">{formatMoney(aiEstimate.estimatedNetTotal)}</span>
                  </p>
                  {aiEstimate.recommendedPostWarrantyAction && aiEstimate.actionRecommendationNote ? (
                    <p className="text-xs text-muted">
                      Rekomendacja AI:{" "}
                      {SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS[aiEstimate.recommendedPostWarrantyAction]}
                      {" — "}
                      {aiEstimate.actionRecommendationNote}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted">{aiEstimate.disclaimer}</p>
                  {preliminaryAccepted ? (
                    <p className="text-xs text-emerald-300">Wstępnie zaakceptowano orientacyjną wycenę.</p>
                  ) : null}
                  {fieldErrors.preliminaryAccepted ? (
                    <p className="text-xs text-rose-400">{fieldErrors.preliminaryAccepted}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => goBack("summary")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  disabled={loading}
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

          {step === "resolved" ? (
            <div className="grid gap-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <div className="overflow-hidden rounded-2xl border border-border/80">
                <div className="bg-foreground px-4 py-3 text-center text-sm font-semibold text-background">
                  Trzymamy kciuki!
                </div>
                <div className="grid gap-3 p-4 text-sm text-foreground">
                  <p className="text-center text-muted">
                    Cieszymy się, że mogliśmy pomóc. Jeśli sugestia nie zadziała albo problem
                    wróci, wróć na tę stronę i zgłoś serwis — jesteśmy do dyspozycji.
                  </p>
                  <Button type="button" variant="outline" onClick={() => goNext("suggestion")}>
                    Mimo wszystko zgłoś serwis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
