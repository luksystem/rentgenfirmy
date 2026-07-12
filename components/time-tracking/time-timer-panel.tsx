"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { TimeTimerStopDialog } from "@/components/time-tracking/time-timer-stop-dialog";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { StartTimerInput } from "@/lib/time-tracking/types";
import { useAppStore } from "@/store/app-store";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

function useLiveElapsedMinutes(startedAt: string, pausedAt: string | null, breakMinutes: number) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (pausedAt) {
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [pausedAt]);

  const startedMs = new Date(startedAt).getTime();
  const endMs = pausedAt ? new Date(pausedAt).getTime() : now;
  const grossMinutes = Math.max(0, Math.floor((endMs - startedMs) / 60_000));
  return Math.max(0, grossMinutes - breakMinutes);
}

export function TimeTimerPanel() {
  const meta = useTimeTrackingStore((state) => state.meta);
  const activeTimer = useTimeTrackingStore((state) => state.activeTimer);
  const ensureMeta = useTimeTrackingStore((state) => state.ensureMeta);
  const ensureTimer = useTimeTrackingStore((state) => state.ensureTimer);
  const startActiveTimer = useTimeTrackingStore((state) => state.startActiveTimer);
  const pauseActiveTimer = useTimeTrackingStore((state) => state.pauseActiveTimer);
  const resumeActiveTimer = useTimeTrackingStore((state) => state.resumeActiveTimer);
  const stopActiveTimer = useTimeTrackingStore((state) => state.stopActiveTimer);
  const cancelActiveTimer = useTimeTrackingStore((state) => state.cancelActiveTimer);

  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const [starting, setStarting] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [form, setForm] = useState<StartTimerInput>({
    categoryId: "",
    entryTypeId: "",
    projectId: null,
    description: "",
  });

  const categories = meta?.categories ?? [];
  const entryTypes = meta?.entryTypes ?? [];
  const workType = useMemo(
    () => entryTypes.find((item) => item.name === "Praca") ?? entryTypes[0],
    [entryTypes],
  );

  useEffect(() => {
    void ensureMeta();
    void ensureTimer();
  }, [ensureMeta, ensureTimer]);

  useEffect(() => {
    if (!activeTimer && categories[0] && workType) {
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || categories[0]!.id,
        entryTypeId: current.entryTypeId || workType.id,
      }));
    }
  }, [activeTimer, categories, workType]);

  const liveMinutes = useLiveElapsedMinutes(
    activeTimer?.startedAt ?? new Date(0).toISOString(),
    activeTimer?.pausedAt ?? null,
    activeTimer?.breakMinutes ?? 0,
  );

  async function handleStart() {
    if (!form.categoryId || !form.entryTypeId) {
      window.alert("Wybierz kategorię i typ wpisu.");
      return;
    }
    setStarting(true);
    try {
      await startActiveTimer(form);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się uruchomić timera.");
    } finally {
      setStarting(false);
    }
  }

  if (activeTimer) {
    const isPaused = Boolean(activeTimer.pausedAt);
    const elapsed = activeTimer ? liveMinutes || activeTimer.elapsedMinutes : 0;

    return (
      <>
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Timer className="h-4 w-4 text-accent" />
                Timer {isPaused ? "wstrzymany" : "aktywny"}
              </div>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                {formatDurationMinutes(elapsed)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {activeTimer.categoryName} · {activeTimer.entryTypeName}
                {activeTimer.projectName ? ` · ${activeTimer.projectName}` : ""}
              </p>
              {activeTimer.isLongRunning && !isPaused ? (
                <p className="mt-2 text-xs text-amber-300">
                  Długi czas pracy — sprawdź, czy timer jest poprawny.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isPaused ? (
                <Button type="button" variant="secondary" onClick={() => void resumeActiveTimer()}>
                  <Play className="mr-1.5 h-4 w-4" />
                  Wznów
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => void pauseActiveTimer()}>
                  <Pause className="mr-1.5 h-4 w-4" />
                  Pauza
                </Button>
              )}
              <Button type="button" onClick={() => setStopOpen(true)}>
                <Square className="mr-1.5 h-4 w-4" />
                Zatrzymaj
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (window.confirm("Anulować timer bez zapisu wpisu?")) {
                    void cancelActiveTimer();
                  }
                }}
              >
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>

        <TimeTimerStopDialog
          open={stopOpen}
          onOpenChange={setStopOpen}
          timer={activeTimer}
          elapsedMinutes={elapsed}
          onConfirm={async (input) => {
            await stopActiveTimer(input);
            setStopOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Timer pracy</p>
          <p className="text-xs text-muted">Uruchom stoper — po zatrzymaniu powstanie wpis czasu.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategoria">
            <Select
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">— wybierz —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Typ wpisu">
            <Select
              value={form.entryTypeId}
              onChange={(event) => setForm((current) => ({ ...current, entryTypeId: event.target.value }))}
            >
              <option value="">— wybierz —</option>
              {entryTypes.map((entryType) => (
                <option key={entryType.id} value={entryType.id}>
                  {entryType.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <ProjectSelectSearchable
          projects={projects}
          clients={clients}
          value={form.projectId ?? null}
          onChange={(projectId) => setForm((current) => ({ ...current, projectId }))}
        />

        <Field label="Notatka startowa (opcjonalnie)">
          <Input
            value={form.description ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Nad czym pracujesz?"
          />
        </Field>

        <div>
          <Button type="button" onClick={() => void handleStart()} disabled={starting}>
            <Play className="mr-1.5 h-4 w-4" />
            {starting ? "Uruchamianie…" : "Rozpocznij pracę"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
