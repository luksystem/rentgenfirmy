"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Home,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { groupSurveyQuestions } from "@/lib/client-functionality/generator";
import type {
  FunctionalityResponse,
  FunctionalitySurveyBundle,
  FunctionalitySurveyQuestion,
} from "@/lib/client-functionality/types";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, string> = {
  Oświetlenie: "💡",
  "Rolety / żaluzje": "🪟",
  "Muzyka multiroom": "🎵",
  Klimatyzacja: "❄️",
  "Ogrzewanie / HVAC": "🌡️",
  "Monitoring / kamery": "📹",
  "Alarm / czujki": "🛡️",
  "Brama / garaż": "🚗",
  "Basen / wellness": "🏊",
  "Funkcje specjalne": "✨",
  Automatyzacje: "🔗",
  "Automatyzacje łączone": "🔗",
};

function sectionIcon(title: string) {
  return SECTION_ICONS[title] ?? "🏠";
}

function QuestionCard({
  question,
  selectedOptionIds,
  customNote,
  onSelect,
  onNote,
}: {
  question: FunctionalitySurveyQuestion;
  selectedOptionIds: string[];
  customNote: string;
  onSelect: (optionIds: string[]) => void;
  onNote: (note: string) => void;
}) {
  const answered = selectedOptionIds.length > 0;

  function toggleOption(optionId: string) {
    if (question.questionType === "multi") {
      onSelect(
        selectedOptionIds.includes(optionId)
          ? selectedOptionIds.filter((id) => id !== optionId)
          : [...selectedOptionIds, optionId],
      );
      return;
    }
    if (question.questionType === "boolean") {
      onSelect(selectedOptionIds.includes(optionId) ? [] : [optionId]);
      return;
    }
    onSelect([optionId]);
  }

  return (
    <Card className={cn("transition-colors", answered && "border-accent/40 bg-accent/5")}>
      <CardContent className="space-y-4 pt-5">
        <div>
          <p className="text-base font-medium text-foreground">{question.title}</p>
          {question.description ? (
            <p className="mt-1 text-sm text-muted">{question.description}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          {question.options.map((option) => {
            const active = selectedOptionIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition",
                  active
                    ? "border-accent bg-accent/10 font-medium text-foreground shadow-sm"
                    : "border-border/70 bg-surface/40 text-foreground hover:border-accent/40 hover:bg-accent/5",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <Field label="Uwagi (opcjonalnie)">
          <Textarea
            value={customNote}
            onChange={(event) => onNote(event.target.value)}
            rows={2}
            placeholder="Np. tylko w przedpokoju, nie w garażu…"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

export function ClientFunctionalitySurveyWizard({
  token,
  initialBundle,
}: {
  token: string;
  initialBundle?: FunctionalitySurveyBundle;
}) {
  const [bundle, setBundle] = useState<FunctionalitySurveyBundle | null>(initialBundle ?? null);
  const [loading, setLoading] = useState(!initialBundle);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [clientName, setClientName] = useState(initialBundle?.survey?.clientName ?? "");
  const [responses, setResponses] = useState<Record<string, FunctionalityResponse>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [started, setStarted] = useState(
    initialBundle?.survey?.status === "in_progress" ||
      initialBundle?.survey?.status === "completed",
  );
  const [completed, setCompleted] = useState(initialBundle?.survey?.status === "completed");

  const sections = useMemo(
    () => (bundle ? groupSurveyQuestions(bundle.questions) : []),
    [bundle],
  );

  const totalSteps = sections.length + 1;
  const isIntro = step === 0;
  const isSummary = step === totalSteps - 1 && !isIntro;
  const currentSection = !isIntro && !isSummary ? sections[step - 1] : null;

  const progress = totalSteps > 1 ? Math.round((step / (totalSteps - 1)) * 100) : 0;

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/ankieta/${encodeURIComponent(token)}`);
    const payload = (await response.json()) as FunctionalitySurveyBundle & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Nie udało się załadować ankiety.");
    }
    setBundle(payload);
    const map: Record<string, FunctionalityResponse> = {};
    for (const entry of payload.responses) {
      map[entry.questionId] = entry;
    }
    setResponses(map);
    setCompleted(payload.survey?.status === "completed");
    setStarted(
      payload.survey?.status === "in_progress" || payload.survey?.status === "completed",
    );
    if (payload.survey?.clientName) {
      setClientName(payload.survey.clientName);
    }
  }, [token]);

  useEffect(() => {
    if (initialBundle) {
      const map: Record<string, FunctionalityResponse> = {};
      for (const entry of initialBundle.responses) {
        map[entry.questionId] = entry;
      }
      setResponses(map);
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
  }, [initialBundle, refresh]);

  async function saveResponse(question: FunctionalitySurveyQuestion) {
    const current = responses[question.id];
    const selectedOptionIds = current?.selectedOptionIds ?? [];
    if (!selectedOptionIds.length) {
      return;
    }

    setSaving(true);
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/ankieta/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "response",
          input: {
            questionId: question.id,
            catalogItemId: question.catalogItemId,
            selectedOptionIds,
            customNote: current?.customNote ?? "",
          },
        }),
      });
      const payload = (await response.json()) as { response?: FunctionalityResponse; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Błąd zapisu.");
      }
      if (payload.response) {
        setResponses((prev) => ({ ...prev, [question.id]: payload.response! }));
      }
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    setSaving(true);
    try {
      await fetch(`/api/ankieta/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", input: { clientName } }),
      });
      setStarted(true);
      setStep(1);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await fetch(`/api/ankieta/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", input: { clientName } }),
      });
      await refresh();
      setCompleted(true);
    } finally {
      setSaving(false);
    }
  }

  function updateLocalResponse(
    questionId: string,
    patch: Partial<Pick<FunctionalityResponse, "selectedOptionIds" | "customNote">>,
    question: FunctionalitySurveyQuestion,
  ) {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        id: prev[questionId]?.id ?? "",
        surveyId: bundle?.survey?.id ?? "",
        questionId,
        catalogItemId: question.catalogItemId,
        selectedOptionIds: patch.selectedOptionIds ?? prev[questionId]?.selectedOptionIds ?? [],
        customNote: patch.customNote ?? prev[questionId]?.customNote ?? "",
        createdAt: prev[questionId]?.createdAt ?? "",
        updatedAt: prev[questionId]?.updatedAt ?? "",
      },
    }));
  }

  async function goNext() {
    if (currentSection) {
      for (const question of currentSection.questions) {
        await saveResponse(question);
      }
    }
    setStep((value) => Math.min(value + 1, totalSteps - 1));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-surface-muted/30 p-6">
        <p className="text-sm text-muted">Ładowanie ankiety…</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-rose-600">{error ?? "Nie znaleziono ankiety."}</p>
      </div>
    );
  }

  if (!bundle.questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-lg">
          <CardContent className="space-y-3 pt-6 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted" />
            <p className="font-medium">Ankieta nie jest jeszcze gotowa</p>
            <p className="text-sm text-muted">
              Wdrożeniowiec musi najpierw dodać pozycje specyfikacji projektu (np. Oświetlenie, Rolety).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Ankieta funkcjonalności</p>
            <h1 className="text-lg font-semibold text-foreground">{bundle.projectName}</h1>
          </div>
        </div>

        {!completed ? (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>
                {isIntro
                  ? "Wprowadzenie"
                  : isSummary
                    ? "Podsumowanie"
                    : `Sekcja ${step} z ${sections.length}`}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted/40">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {completed ? (
          <Card>
            <CardContent className="space-y-4 pt-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-semibold">Dziękujemy!</h2>
              <p className="text-sm text-muted">
                Twoje odpowiedzi zostały zapisane. Wdrożeniowiec przygotuje scenariusze zgodnie z Twoimi
                preferencjami. Pierwsze tygodnie to okres kalibracji — automatyzacje można doprecyzować.
              </p>
              <p className="text-sm font-medium text-foreground">
                Przygotowano {bundle.tasks.length} funkcji do uruchomienia.
              </p>
            </CardContent>
          </Card>
        ) : isIntro ? (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div>
                <h2 className="text-xl font-semibold">Jak ma działać Twój dom?</h2>
                <p className="mt-2 text-sm text-muted">
                  Odpowiedz na pytania o codzienne scenariusze — wejście do domu, wieczór, wyjazd. To
                  pomoże nam skonfigurować automatyzacje i przygotować Cię na to, czego możesz się
                  spodziewać przed wdrożeniem.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/20 p-4 text-sm">
                <p className="font-medium">Na podstawie specyfikacji:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sections
                    .filter((section) => section.key !== "global-automation" && section.key !== "extra")
                    .map((section) => (
                      <span
                        key={section.key}
                        className="rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-xs"
                      >
                        {sectionIcon(section.title)} {section.title}
                      </span>
                    ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  {bundle.questions.length} pytań · ok. {Math.ceil(bundle.questions.length / 3)} min
                </p>
              </div>
              <Field label="Twoje imię i nazwisko">
                <Input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Jan Kowalski"
                />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={!clientName.trim() || saving}
                onClick={() => void handleStart()}
              >
                Rozpocznij ankietę
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : isSummary ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-xl font-semibold">Podsumowanie</h2>
                <p className="text-sm text-muted">
                  Sprawdź odpowiedzi. Po wysłaniu wdrożeniowiec otrzyma listę funkcji do uruchomienia.
                </p>
                {sections.map((section) => (
                  <div key={section.key} className="rounded-xl border border-border/60 p-4">
                    <p className="mb-2 font-medium">
                      {sectionIcon(section.title)} {section.title}
                    </p>
                    <ul className="space-y-2 text-sm">
                      {section.questions.map((question) => {
                        const response = responses[question.id];
                        const labels = (response?.selectedOptionIds ?? [])
                          .map((id) => question.options.find((opt) => opt.id === id)?.label)
                          .filter(Boolean);
                        return (
                          <li key={question.id}>
                            <span className="text-muted">{question.title}: </span>
                            <span className="font-medium">
                              {labels.length ? labels.join(", ") : "— brak odpowiedzi"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button type="button" className="w-full" disabled={saving} onClick={() => void handleComplete()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wysyłanie…
                </>
              ) : (
                <>
                  Wyślij odpowiedzi
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : currentSection ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{sectionIcon(currentSection.title)}</span>
              <div>
                <h2 className="text-xl font-semibold">{currentSection.title}</h2>
                <p className="text-sm text-muted">{currentSection.questions.length} pytań w tej sekcji</p>
              </div>
            </div>
            {currentSection.questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                selectedOptionIds={responses[question.id]?.selectedOptionIds ?? []}
                customNote={responses[question.id]?.customNote ?? ""}
                onSelect={(optionIds) =>
                  updateLocalResponse(question.id, { selectedOptionIds: optionIds }, question)
                }
                onNote={(note) => updateLocalResponse(question.id, { customNote: note }, question)}
              />
            ))}
          </div>
        ) : null}

        {!completed && started && !isIntro ? (
          <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/95 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
              <div className="text-xs text-muted">
                {saveStatus === "saving" ? "Zapisywanie…" : saveStatus === "saved" ? "Zapisano" : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={step <= 1 || saving}
                  onClick={() => setStep((value) => Math.max(value - 1, 1))}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" /> Wstecz
                </Button>
                {!isSummary ? (
                  <Button type="button" disabled={saving} onClick={() => void goNext()}>
                    Dalej
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ClientFunctionalitySurveyWizardCompact({
  token,
}: {
  token: string;
}) {
  return <ClientFunctionalitySurveyWizard token={token} />;
}
