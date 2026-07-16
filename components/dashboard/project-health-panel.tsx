"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PROJECT_HEALTH_BAND_LABELS,
  PROJECT_HEALTH_SENTIMENT_LABELS,
  type ProjectHealthBand,
  type ProjectHealthBundle,
} from "@/lib/projects/project-health";
import { fetchProjectHealthBundle } from "@/lib/supabase/project-health-repository";
import { cn, formatDateTime } from "@/lib/utils";

const BAND_TONE: Record<ProjectHealthBand, string> = {
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  yellow: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  red: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

const THREAD_TONE: Record<string, string> = {
  positive: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  critical: "border-rose-500/30 bg-rose-500/5",
  neutral: "border-border/60 bg-surface-muted/20",
};

export function ProjectHealthPanel({
  projectId,
  projectName,
  stageTitle,
  processProgressPercent,
}: {
  projectId: string;
  projectName: string;
  stageTitle?: string | null;
  processProgressPercent?: number | null;
}) {
  const [bundle, setBundle] = useState<ProjectHealthBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchProjectHealthBundle({
        projectId,
        projectName,
        stageTitle,
        processProgressPercent,
      });
      setBundle(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać zdrowia projektu.");
    } finally {
      setLoading(false);
    }
  }, [projectId, projectName, stageTitle, processProgressPercent]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai/health-summary`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        bundle?: ProjectHealthBundle;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować podsumowania.");
      }
      if (payload.bundle) {
        setBundle(payload.bundle);
      } else {
        await reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wygenerować podsumowania.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading && !bundle) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analiza zdrowia projektu…
        </CardContent>
      </Card>
    );
  }

  if (!bundle) {
    return error ? <p className="text-sm text-rose-400">{error}</p> : null;
  }

  const summary = bundle.latestSnapshot?.summaryMd ?? "";
  const s = bundle.signals;

  return (
    <div className="grid gap-4">
      <Card className={cn("border", BAND_TONE[bundle.band].split(" ").slice(0, 2).join(" "))}>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Zdrowie projektu
            </CardTitle>
            <p className="mt-1 text-xs text-muted">
              Cele, zadania, przełożenia i komentarze powiązane z projektem · etap:{" "}
              {bundle.stageTitle ?? "—"}
              {bundle.processProgressPercent != null
                ? ` · proces ~${bundle.processProgressPercent}%`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void reload()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Odśwież
            </Button>
            <Button type="button" size="sm" disabled={generating} onClick={() => void handleGenerate()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Podsumuj AI
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{bundle.score}</p>
              <p className="text-xs text-muted">/ 100</p>
            </div>
            <Badge className={BAND_TONE[bundle.band]}>{PROJECT_HEALTH_BAND_LABELS[bundle.band]}</Badge>
            <Badge tone="neutral">{PROJECT_HEALTH_SENTIMENT_LABELS[bundle.sentiment]}</Badge>
          </div>

          <div className="grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
            <p>
              Cele aktywne: <span className="text-foreground">{s.goalsActive}</span>
              {s.goalsAtRisk > 0 ? ` · zagrożone ${s.goalsAtRisk}` : ""}
            </p>
            <p>
              Zadania:{" "}
              <span className="text-foreground">
                {s.tasksDone}/{s.tasksTotal}
              </span>{" "}
              zrobione
            </p>
            <p>
              Po terminie: <span className="text-foreground">{s.overdueCount}</span>
              {s.revisitCount > 0 ? ` · wrócić ${s.revisitCount}` : ""}
            </p>
            <p>
              Przełożenia: <span className="text-foreground">{s.deferralCount}</span>
              {s.undeliveredCount > 0 ? ` · niedowiezione ${s.undeliveredCount}` : ""}
            </p>
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          {summary ? (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                Podsumowanie AI
                {bundle.latestSnapshot
                  ? ` · ${formatDateTime(bundle.latestSnapshot.createdAt)}`
                  : ""}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {summary}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Kliknij „Podsumuj AI”, żeby zebrać wątek celów w werdykt zdrowia projektu (nastroje,
              ryzyka, zgodność z etapem).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wątek projektu</CardTitle>
          <p className="text-xs text-muted">
            Komentarze, wnioski, zadania i przełożenia z celów przypiętych do tego projektu
          </p>
        </CardHeader>
        <CardContent>
          {bundle.thread.length === 0 ? (
            <p className="text-sm text-muted">
              Brak wpisów. Dodaj cele do projektu i zapisuj komentarze / zadania podczas przeglądów.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {bundle.thread.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    THREAD_TONE[item.tone] ?? THREAD_TONE.neutral,
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {item.goalName}
                      <span className="font-normal text-muted"> · {item.title}</span>
                    </p>
                    <span className="text-[11px] text-muted">{formatDateTime(item.at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground/90">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
