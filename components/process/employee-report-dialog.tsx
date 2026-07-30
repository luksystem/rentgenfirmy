"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BillingImpactAnswer } from "@/lib/process/employee-report-routing";
import { createEmployeeReport } from "@/lib/supabase/employee-report-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

/**
 * D44 — zgłoszenie pracownika, cztery kroki.
 *
 * Kolejność nie jest kosmetyczna: człowiek stoi na budowie przed problemem i patrzy na niego,
 * więc zdjęcie i opis idą PIERWSZE. Gdyby najpierw kazać mu wybierać projekt z listy, połowa
 * zgłoszeń nie powstałaby.
 *
 * Pracownik odpowiada wyłącznie binarnie na pytanie o wpływ na rozliczenie — nie podaje kwoty,
 * bo nie zna cennika i nie ma go zmuszać do szacowania. Nie wybiera też właściciela; ten wynika
 * z etapu przez macierz ról.
 *
 * Nic z tego nie tworzy zadania. Powstaje szkic w Ustaleniach albo Zmianach, a manager decyduje.
 */
const STEPS = ["Co się dzieje", "Gdzie", "Rozliczenie", "Pilność"] as const;

export function EmployeeReportDialog({
  open,
  onOpenChange,
  projectId: fixedProjectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Podane, gdy wchodzimy z kontekstu projektu — krok 2 jest wtedy potwierdzeniem, nie wyborem. */
  projectId?: string;
  onCreated?: (result: { target: "agreement" | "change_request" }) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const projects = useAppStore((state) => state.projects);
  const getProjectProcess = useProcessStore((state) => state.getProjectProcess);
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);

  const [step, setStep] = useState(0);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [stageId, setStageId] = useState<string>("");
  const [billingImpact, setBillingImpact] = useState<BillingImpactAnswer | null>(null);
  const [isUrgent, setIsUrgent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDescription("");
    setPhoto(null);
    setProjectId(fixedProjectId ?? "");
    setStageId("");
    setBillingImpact(null);
    setIsUrgent(null);
    setError(null);
  }, [open, fixedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === projectId) ?? null,
    [projects, projectId],
  );

  useEffect(() => {
    if (projectId && selectedProject) {
      void ensureProjectProcess(projectId, selectedProject.type);
    }
  }, [projectId, selectedProject, ensureProjectProcess]);

  const process = projectId ? getProjectProcess(projectId) : null;

  const stages = useMemo(() => {
    const snapshot = process?.templateSnapshot as { stages?: { id: string; title: string }[] } | null;
    return snapshot?.stages ?? [];
  }, [process]);

  // Etap bieżący jest PODPOWIEDZIĄ, nie przymusem — większość zgłoszeń dotyczy etapu, w którym
  // projekt akurat jest, ale „zgłaszam coś z etapu 4 w trakcie etapu 6" musi być możliwe.
  useEffect(() => {
    if (process?.activeStageId && !stageId) {
      setStageId(process.activeStageId);
    }
  }, [process?.activeStageId, stageId]);

  const canGoNext =
    (step === 0 && description.trim().length > 0) ||
    (step === 1 && Boolean(projectId)) ||
    (step === 2 && billingImpact !== null) ||
    (step === 3 && isUrgent !== null);

  async function handleSubmit() {
    if (billingImpact === null || isUrgent === null || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      const trimmed = description.trim();
      const result = await createEmployeeReport({
        projectId,
        stageId: stageId || null,
        // Pierwsza linia opisu jest tytułem — pracownik nie ma wypełniać dwóch pól na to samo.
        title: trimmed.split("\n")[0].slice(0, 200),
        body: trimmed,
        billingImpact,
        isUrgent,
        createdById: profile?.id ?? null,
        createdByName: displayName || profile?.email || "Pracownik",
        photo,
      });
      onCreated?.({ target: result.target });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać zgłoszenia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Zgłoś coś z budowy</DialogTitle>
          <DialogDescription>
            Krok {step + 1} z 4 — {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-3 flex gap-1">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1 flex-1 rounded-full",
                index <= step ? "bg-accent" : "bg-border",
              )}
            />
          ))}
        </div>

        <div className="grid gap-4">
          {step === 0 ? (
            <>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-6 text-sm text-muted hover:border-accent/40">
                <Camera className="h-5 w-5" />
                {photo ? photo.name : "Dodaj zdjęcie (opcjonalnie)"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
              <Field label="Co się dzieje?">
                <Textarea
                  rows={4}
                  autoFocus
                  placeholder="Np. Trasa kablowa nie przechodzi przez strop w salonie."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Projekt">
                <Select
                  value={projectId}
                  disabled={Boolean(fixedProjectId)}
                  onChange={(event) => {
                    setProjectId(event.target.value);
                    setStageId("");
                  }}
                >
                  <option value="">— wybierz —</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Etap">
                <Select value={stageId} onChange={(event) => setStageId(event.target.value)}>
                  <option value="">— nie wiem —</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                      {stage.id === process?.activeStageId ? " (bieżący)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              {fixedProjectId ? (
                <p className="text-xs text-muted">
                  Projekt wzięty z kontekstu — sprawdź tylko, czy etap się zgadza.
                </p>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">
                Czy to może mieć wpływ na rozliczenie?
              </p>
              <p className="text-xs text-muted">
                Nie musisz znać kwoty — wystarczy przeczucie. Wycenę robi ktoś inny.
              </p>
              {(
                [
                  ["tak", "Tak"],
                  ["nie", "Nie"],
                  ["nie_wiem", "Nie wiem"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBillingImpact(value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                    billingImpact === value
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-surface-muted/20 text-muted hover:border-accent/30",
                  )}
                >
                  {label}
                  {billingImpact === value ? <Check className="h-4 w-4 text-accent" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">Czy to pilne?</p>
              <p className="text-xs text-muted">
                Pilne = koordynator techniczny dostaje powiadomienie od razu. Nie wstrzymuje etapu.
              </p>
              {(
                [
                  [true, "Tak, pilne"],
                  [false, "Nie, może poczekać"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setIsUrgent(value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                    isUrgent === value
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-surface-muted/20 text-muted hover:border-accent/30",
                  )}
                >
                  {label}
                  {isUrgent === value ? <Check className="h-4 w-4 text-accent" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Wstecz
              </Button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <Button type="button" disabled={!canGoNext} onClick={() => setStep((s) => s + 1)}>
                Dalej
              </Button>
            ) : (
              <Button type="button" disabled={!canGoNext || saving} onClick={() => void handleSubmit()}>
                {saving ? "Wysyłanie…" : "Wyślij zgłoszenie"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
