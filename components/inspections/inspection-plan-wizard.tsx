"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { defaultMonthsForFrequency } from "@/lib/inspections/schedule";
import {
  INSPECTION_FREQUENCIES,
  INSPECTION_FREQUENCY_LABELS,
  type InspectionFrequency,
  type InspectionGlobalSettings,
  type InspectionProtocolTemplate,
} from "@/lib/inspections/types";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTH_LABELS = [
  "Sty",
  "Lut",
  "Mar",
  "Kwi",
  "Maj",
  "Cze",
  "Lip",
  "Sie",
  "Wrz",
  "Paź",
  "Lis",
  "Gru",
];

type SystemDraft = {
  systemCode: string;
  frequency: InspectionFrequency;
  scheduleMonths: number[];
  protocolTemplateId: string | null;
  workScope: string;
};

export function InspectionPlanWizard({
  open,
  onClose,
  client,
  projects,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  projects: Project[];
  onSuccess?: (createdCount: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<InspectionGlobalSettings | null>(null);
  const [templates, setTemplates] = useState<InspectionProtocolTemplate[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [projectId, setProjectId] = useState("");
  const [responsibleProfileId, setResponsibleProfileId] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [systemDrafts, setSystemDrafts] = useState<Record<string, SystemDraft>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientProjects = useMemo(
    () => (client ? projects.filter((project) => project.clientId === client.id) : []),
    [client, projects],
  );

  const activeSystems = useMemo(
    () => (settings?.systems ?? []).filter((entry) => entry.active),
    [settings],
  );

  const resetForm = useCallback(() => {
    setStep(0);
    setProjectId("");
    setResponsibleProfileId("");
    setSelectedCodes([]);
    setSystemDrafts({});
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    setLoading(true);
    setError(null);
    void Promise.all([
      fetch("/api/inspections/settings", { credentials: "include" }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie udało się wczytać ustawień.");
        }
        setSettings(payload.settings as InspectionGlobalSettings);
      }),
      client
        ? fetch(`/api/inspections/templates?clientId=${client.id}`, { credentials: "include" }).then(
            async (response) => {
              const payload = await response.json();
              if (response.ok) {
                setTemplates(payload.templates ?? []);
              }
            },
          )
        : Promise.resolve(),
      fetchTeamProfiles().then(setTeamProfiles).catch(() => setTeamProfiles([])),
    ])
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Błąd.");
      })
      .finally(() => setLoading(false));
  }, [open, client, resetForm]);

  function toggleSystem(code: string) {
    setSelectedCodes((current) => {
      if (current.includes(code)) {
        const next = current.filter((entry) => entry !== code);
        setSystemDrafts((drafts) => {
          const copy = { ...drafts };
          delete copy[code];
          return copy;
        });
        return next;
      }

      const frequency: InspectionFrequency = "quarterly";
      setSystemDrafts((drafts) => ({
        ...drafts,
        [code]: {
          systemCode: code,
          frequency,
          scheduleMonths: defaultMonthsForFrequency(frequency),
          protocolTemplateId: null,
          workScope: "",
        },
      }));
      return [...current, code];
    });
  }

  function updateSystemDraft(code: string, patch: Partial<SystemDraft>) {
    setSystemDrafts((current) => {
      const existing = current[code];
      if (!existing) {
        return current;
      }
      const next = { ...existing, ...patch };
      if (patch.frequency && !patch.scheduleMonths) {
        next.scheduleMonths = defaultMonthsForFrequency(patch.frequency);
      }
      return { ...current, [code]: next };
    });
  }

  function toggleMonth(code: string, month: number) {
    setSystemDrafts((current) => {
      const existing = current[code];
      if (!existing) {
        return current;
      }
      const has = existing.scheduleMonths.includes(month);
      const scheduleMonths = has
        ? existing.scheduleMonths.filter((entry) => entry !== month)
        : [...existing.scheduleMonths, month].sort((a, b) => a - b);
      return { ...current, [code]: { ...existing, scheduleMonths } };
    });
  }

  async function handleSubmit() {
    if (!client) {
      return;
    }

    if (!selectedCodes.length) {
      setError("Wybierz co najmniej jeden system.");
      return;
    }

    for (const code of selectedCodes) {
      const draft = systemDrafts[code];
      if (!draft?.scheduleMonths.length) {
        setError("Każdy system musi mieć wybrane miesiące planowania.");
        return;
      }
    }

    const responsible = teamProfiles.find((entry) => entry.id === responsibleProfileId);

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/inspections/plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          projectId: projectId || null,
          responsibleProfileId: responsibleProfileId || null,
          responsibleName: responsible ? getUserDisplayName(responsible) : null,
          systems: selectedCodes.map((code) => systemDrafts[code]),
          horizonMonths: 12,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zaplanować przeglądów.");
      }

      onSuccess?.(payload.createdCount ?? 0);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Zaplanuj przeglądy
          </DialogTitle>
          <DialogDescription>
            {client?.fullName ?? "Klient"} — cykliczne przeglądy trafią na tablicę „Wstępnie
            zaplanowane”.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wczytywanie…
          </div>
        ) : (
          <div className="grid gap-4">
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            {step === 0 ? (
              <>
                <Field label="Projekt (opcjonalnie)">
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
                  >
                    <option value="">— bez projektu —</option>
                    {clientProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Osoba odpowiedzialna">
                  <select
                    value={responsibleProfileId}
                    onChange={(event) => setResponsibleProfileId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
                  >
                    <option value="">— wybierz —</option>
                    {teamProfiles.map((member) => (
                      <option key={member.id} value={member.id}>
                        {getUserDisplayName(member)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Systemy do przeglądu</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeSystems.map((system) => {
                      const selected = selectedCodes.includes(system.code);
                      return (
                        <button
                          key={system.code}
                          type="button"
                          onClick={() => toggleSystem(system.code)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-left text-sm transition",
                            selected
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border bg-surface-muted/30 text-muted hover:border-accent/40",
                          )}
                        >
                          {system.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4">
                {selectedCodes.map((code) => {
                  const system = activeSystems.find((entry) => entry.code === code);
                  const draft = systemDrafts[code];
                  if (!draft) {
                    return null;
                  }

                  const systemTemplates = templates.filter(
                    (entry) => entry.systemCode === code && (!entry.clientId || entry.clientId === client?.id),
                  );

                  return (
                    <div key={code} className="rounded-xl border border-border/70 p-3">
                      <p className="mb-3 font-medium text-foreground">{system?.label ?? code}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Częstotliwość">
                          <select
                            value={draft.frequency}
                            onChange={(event) =>
                              updateSystemDraft(code, {
                                frequency: event.target.value as InspectionFrequency,
                              })
                            }
                            className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
                          >
                            {INSPECTION_FREQUENCIES.map((frequency) => (
                              <option key={frequency} value={frequency}>
                                {INSPECTION_FREQUENCY_LABELS[frequency]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Wzór protokołu">
                          <select
                            value={draft.protocolTemplateId ?? ""}
                            onChange={(event) =>
                              updateSystemDraft(code, {
                                protocolTemplateId: event.target.value || null,
                              })
                            }
                            className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
                          >
                            <option value="">— domyślny / później —</option>
                            {systemTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <p className="mb-2 mt-3 text-xs font-medium text-muted">Miesiące planowania</p>
                      <div className="flex flex-wrap gap-1.5">
                        {MONTH_LABELS.map((label, index) => {
                          const month = index + 1;
                          const active = draft.scheduleMonths.includes(month);
                          return (
                            <button
                              key={month}
                              type="button"
                              onClick={() => toggleMonth(code, month)}
                              className={cn(
                                "rounded-lg border px-2 py-1 text-xs",
                                active
                                  ? "border-accent bg-accent/15 text-foreground"
                                  : "border-border text-muted",
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <Field label="Zakres prac">
                          <Textarea
                            rows={3}
                            value={draft.workScope}
                            onChange={(event) =>
                              updateSystemDraft(code, { workScope: event.target.value })
                            }
                            placeholder="Opis zakresu prac dla tego systemu…"
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
                Anuluj
              </Button>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(0)}>
                    Wstecz
                  </Button>
                ) : null}
                {step === 0 ? (
                  <Button
                    type="button"
                    disabled={busy || !selectedCodes.length}
                    onClick={() => setStep(1)}
                  >
                    Dalej
                  </Button>
                ) : (
                  <Button type="button" disabled={busy} onClick={() => void handleSubmit()}>
                    {busy ? "Planowanie…" : "Utwórz harmonogram"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
