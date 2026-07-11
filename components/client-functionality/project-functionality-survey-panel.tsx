"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { ClientFunctionalitySurveyWizard } from "@/components/client-functionality/client-functionality-survey-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  FunctionalityAiSuggestion,
  FunctionalitySurveyBundle,
  FunctionalityTask,
} from "@/lib/client-functionality/types";
import {
  ensureProjectFunctionalitySurvey,
  regenerateProjectFunctionalityTasks,
  reviewProjectFunctionalityAi,
  sendProjectFunctionalitySurvey,
  suggestProjectFunctionalityAi,
  updateProjectFunctionalityTaskStatus,
  useFunctionalitySurveyStore,
} from "@/store/project-functionality-survey-store";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  draft: "Szkic",
  sent: "Wysłana",
  in_progress: "W trakcie",
  completed: "Ukończona",
} as const;

const PRIORITY_LABELS = {
  must: "Must have",
  standard: "Standard",
  optional: "Opcjonalne",
} as const;

function TaskRow({
  task,
  onStatusChange,
}: {
  task: FunctionalityTask;
  onStatusChange: (status: FunctionalityTask["status"]) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/15 p-3",
        task.status === "done" && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onStatusChange(task.status === "done" ? "todo" : "done")}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          task.status === "done"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border bg-surface",
        )}
      >
        {task.status === "done" ? <Check className="h-3 w-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("font-medium", task.status === "done" && "line-through")}>{task.title}</p>
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
            {task.category}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
              task.priority === "must"
                ? "bg-rose-500/10 text-rose-700"
                : task.priority === "standard"
                  ? "bg-blue-500/10 text-blue-700"
                  : "bg-gray-500/10 text-gray-600",
            )}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.source === "ai" ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          ) : null}
        </div>
        {task.description ? <p className="mt-1 text-sm text-muted">{task.description}</p> : null}
      </div>
    </div>
  );
}

export function FunctionalitySurveyClientEmbed({
  projectId,
  publicDashboardToken,
}: {
  projectId: string;
  publicDashboardToken?: string;
}) {
  const [bundle, setBundle] = useState<FunctionalitySurveyBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = publicDashboardToken
          ? `/api/przestrzen/${encodeURIComponent(publicDashboardToken)}/functionality-survey?projectId=${encodeURIComponent(projectId)}`
          : `/api/projects/${encodeURIComponent(projectId)}/functionality-survey`;
        const response = await fetch(url, {
          credentials: "include",
        });
        const payload = (await response.json()) as {
          bundle?: FunctionalitySurveyBundle;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Błąd pobierania ankiety.");
        }
        setBundle(payload.bundle ?? null);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Błąd ładowania.";
        setError(
          message.includes("does not exist") || message.includes("schema cache")
            ? "Brak tabel ankiety w bazie — uruchom migrację 117_client_functionality_survey.sql w Supabase."
            : message,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, publicDashboardToken]);

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie ankiety…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!bundle?.survey?.publicToken) {
    return (
      <p className="text-sm text-muted">
        Ankieta nie jest jeszcze gotowa. Wdrożeniowiec skontaktuje się z Tobą, gdy będzie można ją
        wypełnić.
      </p>
    );
  }

  return <ClientFunctionalitySurveyWizard token={bundle.survey.publicToken} initialBundle={bundle} />;
}

export function ProjectFunctionalitySurveyPanel({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const bundle = useFunctionalitySurveyStore((state) => state.byProject[projectId]);
  const loading = useFunctionalitySurveyStore((state) => state.loadingProjects[projectId]);
  const ensureBundle = useFunctionalitySurveyStore((state) => state.ensureBundle);
  const setBundle = useFunctionalitySurveyStore((state) => state.setBundle);

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<FunctionalityAiSuggestion[]>([]);

  useEffect(() => {
    void ensureBundle(projectId)
      .then(async (loaded) => {
        if (loaded.questions.length > 0 && !loaded.survey && !readOnly) {
          try {
            const result = await ensureProjectFunctionalitySurvey(projectId);
            if (result.bundle) {
              setBundle(projectId, result.bundle);
            }
          } catch {
            // ignore — user can create manually
          }
        }
      })
      .catch((loadError: unknown) => {
        const message = loadError instanceof Error ? loadError.message : "Błąd ładowania ankiety.";
        setError(
          message.includes("does not exist") || message.includes("schema cache")
            ? "Brak tabel ankiety w bazie — uruchom migrację 117_client_functionality_survey.sql w Supabase."
            : message,
        );
      });
  }, [ensureBundle, projectId, readOnly, setBundle]);

  const surveyUrl = useMemo(() => {
    if (!bundle?.survey?.publicToken || typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/ankieta/${bundle.survey.publicToken}`;
  }, [bundle?.survey?.publicToken]);

  const answeredCount = bundle?.responses.length ?? 0;
  const questionCount = bundle?.questions.length ?? 0;
  const pendingAi = aiDraft.filter((entry) => entry.status === "pending");

  const runAction = useCallback(
    async (key: string, action: () => Promise<{ bundle?: FunctionalitySurveyBundle }>) => {
      setBusy(key);
      setMessage(null);
      setError(null);
      try {
        const result = await action();
        if (result.bundle) {
          setBundle(projectId, result.bundle);
        } else {
          await ensureBundle(projectId, { force: true });
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Błąd operacji.");
      } finally {
        setBusy(null);
      }
    },
    [ensureBundle, projectId, setBundle],
  );

  async function copyLink() {
    if (!surveyUrl) {
      return;
    }
    await navigator.clipboard.writeText(surveyUrl);
    setMessage("Skopiowano link ankiety.");
  }

  if (loading && !bundle && !error) {
    return <p className="text-sm text-muted">Ładowanie ankiety funkcjonalności…</p>;
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : null}
      <div>
        <h2 className="text-base font-semibold text-foreground">Ankieta funkcjonalności klienta</h2>
        <p className="mt-1 text-sm text-muted">
          Klient opisuje jak ma działać dom — na podstawie pozycji specyfikacji projektu. Po wypełnieniu
          otrzymujesz listę funkcji do uruchomienia.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      {!questionCount ? (
        <Card>
          <CardContent className="grid gap-2 py-6 text-sm text-muted">
            <p className="font-medium text-foreground">Brak pytań ankiety dla tego projektu</p>
            <p>
              1. W zakładce <strong>Specyfikacja</strong> dodaj pozycje z katalogu (np. Oświetlenie,
              Rolety) — nie tylko własne wpisy.
            </p>
            <p>
              2. Pytania są w kodzie:{" "}
              <code className="rounded bg-surface-muted px-1">lib/client-functionality/catalog-seeds.ts</code>{" "}
              (4–5 na kategorię) i w{" "}
              <a href="/ustawienia/specyfikacja" className="text-accent hover:underline">
                Ustawienia → Katalog specyfikacji
              </a>
              .
            </p>
            <p>
              3. Uruchom migrację{" "}
              <code className="rounded bg-surface-muted px-1">117_client_functionality_survey.sql</code>{" "}
              w Supabase, jeśli ankieta nie zapisuje odpowiedzi.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!readOnly ? (
        <Card>
          <CardContent className="grid gap-3 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Status:</span>
              <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium">
                {STATUS_LABELS[bundle?.survey?.status ?? "draft"]}
              </span>
              {questionCount ? (
                <span className="text-xs text-muted">
                  {answeredCount}/{questionCount} odpowiedzi
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!!busy || !questionCount}
                onClick={() =>
                  void runAction("ensure", async () => {
                    const result = await ensureProjectFunctionalitySurvey(projectId);
                    return { bundle: result.bundle };
                  })
                }
              >
                {busy === "ensure" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Utwórz / odśwież ankietę
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!!busy || !bundle?.survey}
                onClick={() =>
                  void runAction("send", async () => {
                    const result = await sendProjectFunctionalitySurvey(projectId);
                    setMessage("Ankieta oznaczona jako wysłana.");
                    return { bundle: result.bundle };
                  })
                }
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Oznacz jako wysłana
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!!busy || !surveyUrl}
                onClick={() => void copyLink()}
              >
                <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                Kopiuj link
              </Button>
              {surveyUrl ? (
                <Button type="button" size="sm" variant="secondary" asChild>
                  <a href={surveyUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Podgląd ankiety
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!!busy || !bundle?.survey?.status || bundle.survey.status !== "completed"}
                onClick={() =>
                  void runAction("regenerate", async () => {
                    const result = await regenerateProjectFunctionalityTasks(projectId);
                    setMessage("Lista zadań odświeżona.");
                    return { bundle: result.bundle };
                  })
                }
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Odśwież zadania
              </Button>
            </div>

            <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Propozycje AI</p>
                  <p className="text-xs text-muted">
                    AI zaproponuje dodatkowe automatyzacje na podstawie specyfikacji — Ty akceptujesz.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!!busy || !questionCount}
                  onClick={() =>
                    void runAction("ai", async () => {
                      const result = await suggestProjectFunctionalityAi(projectId);
                      const suggestions =
                        (result as { suggestions?: FunctionalityAiSuggestion[] }).suggestions ?? [];
                      setAiDraft(suggestions);
                      setMessage(`Wygenerowano ${suggestions.length} propozycji AI.`);
                      return { bundle: result.bundle };
                    })
                  }
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {busy === "ai" ? "Generuję…" : "Generuj propozycje AI"}
                </Button>
              </div>

              {(aiDraft.length ? aiDraft : bundle?.survey?.aiSuggestions ?? []).map((entry) => {
                const current =
                  aiDraft.find((item) => item.id === entry.id) ??
                  entry;
                return (
                  <div
                    key={entry.id}
                    className="mt-3 rounded-lg border border-border/60 bg-background/80 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{current.title}</p>
                        <p className="mt-1 text-xs text-muted">{current.description}</p>
                        {current.rationale ? (
                          <p className="mt-1 text-xs italic text-muted">{current.rationale}</p>
                        ) : null}
                      </div>
                      {current.status === "pending" ? (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setAiDraft((prev) =>
                                (prev.length ? prev : bundle?.survey?.aiSuggestions ?? []).map((item) =>
                                  item.id === entry.id ? { ...item, status: "accepted" as const } : item,
                                ),
                              )
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setAiDraft((prev) =>
                                (prev.length ? prev : bundle?.survey?.aiSuggestions ?? []).map((item) =>
                                  item.id === entry.id ? { ...item, status: "rejected" as const } : item,
                                ),
                              )
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">
                          {current.status === "accepted" ? "Zaakceptowano" : "Odrzucono"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {pendingAi.length || aiDraft.some((e) => e.status !== "pending") ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  disabled={!!busy}
                  onClick={() =>
                    void runAction("ai_review", async () => {
                      const suggestions = aiDraft.length
                        ? aiDraft
                        : bundle?.survey?.aiSuggestions ?? [];
                      const result = await reviewProjectFunctionalityAi(projectId, suggestions);
                      setAiDraft([]);
                      setMessage("Zapisano decyzje AI.");
                      return { bundle: result.bundle };
                    })
                  }
                >
                  Zapisz decyzje AI
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {bundle?.survey?.status === "completed" ? (
        <Card>
          <CardContent className="grid gap-3 pt-5">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">
                Ankieta ukończona
                {bundle.survey.completedAt
                  ? ` · ${new Date(bundle.survey.completedAt).toLocaleDateString("pl-PL")}`
                  : ""}
              </p>
            </div>
            {bundle.survey.clientName ? (
              <p className="text-sm text-muted">Wypełnił: {bundle.survey.clientName}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Funkcje do uruchomienia ({bundle?.tasks.length ?? 0})
        </h3>
        {!bundle?.tasks.length ? (
          <p className="text-sm text-muted">
            Lista zadań pojawi się po wypełnieniu ankiety przez klienta (lub po zaakceptowaniu propozycji AI).
          </p>
        ) : (
          <div className="grid gap-2">
            {bundle.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusChange={(status) =>
                  void runAction(`task-${task.id}`, async () => {
                    await updateProjectFunctionalityTaskStatus(projectId, task.id, status);
                    await ensureBundle(projectId, { force: true });
                    return {};
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
