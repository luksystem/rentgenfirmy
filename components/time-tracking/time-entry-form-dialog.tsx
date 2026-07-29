"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { TeamProfileSelect } from "@/components/process/team-profile-select";
import { parseDurationInput } from "@/lib/time-tracking/format";
import type { UserProfile } from "@/lib/auth/types";
import {
  TIME_ENTRY_WORK_CAUSE_LABELS,
  TIME_ENTRY_WORK_CAUSES_BY_NATURE,
  TIME_ENTRY_WORK_NATURES,
  TIME_ENTRY_WORK_NATURE_LABELS,
  type ProcessRoleCode,
  type TimeEntryView,
  type TimeEntryWorkCause,
  type TimeEntryWorkNature,
  type UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";
import { PROCESS_ROLE_CODES, PROCESS_ROLE_LABELS } from "@/lib/process/types";
import { fetchProjectProcess } from "@/lib/supabase/process-repository";
import type { WorkMission } from "@/lib/supabase/work-missions-server";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { createTimeEntry, updateTimeEntry } from "@/lib/supabase/time-tracking-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export type TimeEntryFormValues = {
  date: string;
  durationInput: string;
  categoryId: string;
  entryTypeId: string;
  workNature: TimeEntryWorkNature | "";
  workCause: TimeEntryWorkCause | "";
  roleCode: ProcessRoleCode | "";
  projectId: string;
  processStageId: string;
  missionId: string;
  description: string;
  billable: boolean;
  remoteWork: boolean;
  delegation: boolean;
  userId: string;
};

function emptyForm(date: string, categoryId = "", entryTypeId = "", userId = ""): TimeEntryFormValues {
  return {
    date,
    durationInput: "1h",
    categoryId,
    entryTypeId,
    workNature: "new_work",
    workCause: "",
    roleCode: "",
    projectId: "",
    processStageId: "",
    missionId: "",
    description: "",
    billable: false,
    remoteWork: false,
    delegation: false,
    userId,
  };
}

function entryToFormValues(entry: TimeEntryView): TimeEntryFormValues {
  const hours = Math.floor(entry.durationMinutes / 60);
  const minutes = entry.durationMinutes % 60;
  const durationInput =
    hours > 0 && minutes > 0
      ? `${hours}h ${minutes}m`
      : hours > 0
        ? `${hours}h`
        : `${minutes}m`;

  return {
    date: entry.date,
    durationInput,
    categoryId: entry.categoryId,
    entryTypeId: entry.entryTypeId,
    workNature: entry.workNature ?? "new_work",
    workCause: entry.workCause ?? "",
    roleCode: entry.roleCode ?? "",
    projectId: entry.projectId ?? "",
    processStageId: entry.processStageId ?? "",
    missionId: entry.missionId ?? "",
    description: entry.description,
    billable: entry.billable,
    remoteWork: entry.remoteWork,
    delegation: entry.delegation,
    userId: entry.userId,
  };
}

export function TimeEntryFormDialog({
  open,
  onOpenChange,
  entry,
  defaultDate,
  defaultProjectId,
  lockProject = false,
  allowUserSelection = false,
  defaultUserId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntryView | null;
  defaultDate: string;
  defaultProjectId?: string;
  lockProject?: boolean;
  allowUserSelection?: boolean;
  defaultUserId?: string;
  onSaved?: (entry: TimeEntryView) => void;
}) {
  const meta = useTimeTrackingStore((state) => state.meta);
  const ensureMeta = useTimeTrackingStore((state) => state.ensureMeta);
  const createEntry = useTimeTrackingStore((state) => state.createEntry);
  const updateEntry = useTimeTrackingStore((state) => state.updateEntry);

  const profile = useAuthStore((state) => state.profile);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const [values, setValues] = useState<TimeEntryFormValues>(() =>
    emptyForm(defaultDate, "", "", defaultUserId ?? profile?.id ?? ""),
  );
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [missions, setMissions] = useState<WorkMission[]>([]);
  const [projectStages, setProjectStages] = useState<{ id: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const defaultsAppliedRef = useRef(false);

  const categories = useMemo(() => meta?.categories ?? [], [meta?.categories]);
  const entryTypes = useMemo(() => meta?.entryTypes ?? [], [meta?.entryTypes]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === values.categoryId),
    [categories, values.categoryId],
  );
  const selectedEntryType = useMemo(
    () => entryTypes.find((item) => item.id === values.entryTypeId),
    [entryTypes, values.entryTypeId],
  );

  useEffect(() => {
    if (open) {
      void ensureMeta();
    }
  }, [open, ensureMeta]);

  useEffect(() => {
    if (!open || !allowUserSelection) {
      return;
    }

    let cancelled = false;
    void fetchTeamProfiles()
      .then((profiles) => {
        if (!cancelled) {
          setTeamProfiles(profiles);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeamProfiles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, allowUserSelection]);

  useEffect(() => {
    if (!open) {
      defaultsAppliedRef.current = false;
      setValues(emptyForm(defaultDate, "", "", defaultUserId ?? profile?.id ?? ""));
      return;
    }

    if (entry) {
      setValues(entryToFormValues(entry));
      defaultsAppliedRef.current = true;
      return;
    }

    if (defaultsAppliedRef.current) {
      return;
    }

    if (categories.length === 0 || entryTypes.length === 0) {
      return;
    }

    const defaultCategory = categories[0];
    const projectCategory = categories.find((item) => item.requiresProject) ?? defaultCategory;
    const defaultType = entryTypes.find((item) => item.name === "Praca") ?? entryTypes[0];
    const categoryForProject = defaultProjectId ? projectCategory : defaultCategory;

    defaultsAppliedRef.current = true;
    setValues((current) => ({
      ...current,
      date: current.date || defaultDate,
      categoryId: current.categoryId || categoryForProject?.id || "",
      entryTypeId: current.entryTypeId || defaultType?.id || "",
      projectId: defaultProjectId || current.projectId || "",
      userId: defaultUserId ?? profile?.id ?? current.userId ?? "",
      billable:
        current.categoryId && current.categoryId !== (categoryForProject?.id ?? "")
          ? current.billable
          : (categoryForProject?.defaultBillable ?? current.billable),
    }));
  }, [open, entry, defaultDate, defaultProjectId, defaultUserId, profile?.id, categories, entryTypes]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const missionUserId = values.userId || profile?.id || "";
    const missionParams = new URLSearchParams({ date: values.date });
    if (missionUserId && missionUserId !== profile?.id) {
      missionParams.set("userId", missionUserId);
    }

    let cancelled = false;
    void fetch(`/api/time-tracking/missions?${missionParams.toString()}`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = (await response.json()) as { missions?: WorkMission[] };
        if (!cancelled) {
          setMissions(payload.missions ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMissions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, values.date, values.userId, profile?.id]);

  useEffect(() => {
    if (!open || !values.projectId) {
      setProjectStages([]);
      return;
    }

    let cancelled = false;
    void fetchProjectProcess(values.projectId)
      .then((process) => {
        if (cancelled) return;
        const stages = (process?.templateSnapshot?.stages ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((stage) => ({ id: stage.id, title: stage.title }));
        setProjectStages(stages);
      })
      .catch(() => {
        if (!cancelled) setProjectStages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, values.projectId]);

  function handleCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    setValues((current) => ({
      ...current,
      categoryId,
      billable: category?.defaultBillable ?? current.billable,
    }));
  }

  async function handleSubmit() {
    const durationMinutes = parseDurationInput(values.durationInput);
    if (!durationMinutes) {
      window.alert("Podaj czas w formacie np. 2h, 90m lub 1.5.");
      return;
    }
    if (!values.categoryId || !values.entryTypeId) {
      window.alert("Wybierz kategorię i typ wpisu.");
      return;
    }
    if (selectedEntryType?.countsAsWork && !values.workNature) {
      window.alert("Wybierz rodzaj pracy (nowa praca / poprawka / nieplanowane kończenie / zmiana zakresu).");
      return;
    }
    if (values.workNature && values.workNature !== "new_work" && !values.workCause) {
      window.alert("Wybierz przyczynę.");
      return;
    }
    if (allowUserSelection && !values.userId) {
      window.alert("Wybierz pracownika.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: values.date,
        durationMinutes,
        categoryId: values.categoryId,
        entryTypeId: values.entryTypeId,
        workNature: values.workNature || null,
        workCause: values.workNature && values.workNature !== "new_work" ? values.workCause || null : null,
        roleCode: values.roleCode || null,
        description: values.description,
        billable: values.billable,
        projectId: values.projectId || null,
        processStageId: values.processStageId || null,
        missionId: values.missionId || null,
        remoteWork: values.remoteWork,
        delegation: values.delegation,
      };

      let savedEntry: TimeEntryView;
      if (entry) {
        const updatePayload: UpdateTimeEntryInput = { ...payload };
        const targetUserId = values.userId || profile?.id;
        const userChanged = Boolean(targetUserId && targetUserId !== entry.userId);
        if (allowUserSelection && userChanged && targetUserId) {
          updatePayload.userId = targetUserId;
        }

        if (userChanged) {
          savedEntry = await updateTimeEntry(entry.id, updatePayload);
          void useTimeTrackingStore.getState().ensureEntries({ force: true, showLoading: false });
        } else {
          savedEntry = await updateEntry(entry.id, updatePayload);
        }
      } else {
        const targetUserId = values.userId || profile?.id;
        const createPayload = {
          ...payload,
          userId: targetUserId && targetUserId !== profile?.id ? targetUserId : undefined,
        };
        savedEntry =
          createPayload.userId != null
            ? await createTimeEntry(createPayload)
            : await createEntry(createPayload);
      }
      onSaved?.(savedEntry);
      onOpenChange(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zapisać wpisu.");
    } finally {
      setSubmitting(false);
    }
  }

  const showBillable = selectedEntryType?.allowsBillable ?? true;
  const requiresProject =
    (selectedCategory?.requiresProject || selectedEntryType?.requiresProject) ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-hidden p-0 sm:max-h-[90vh]">
        <div className="shrink-0 border-b border-border/70 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <DialogHeader>
            <DialogTitle>{entry ? "Edytuj wpis czasu" : "Dodaj czas pracy"}</DialogTitle>
            <DialogDescription>
              Zarejestruj wykonany czas z kategorią, typem i opcjonalnym kontekstem projektu.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <div className="grid gap-4">
            {allowUserSelection ? (
              <Field label="Pracownik">
                <TeamProfileSelect
                  value={values.userId}
                  onChange={(userId) => setValues((current) => ({ ...current, userId }))}
                  teamProfiles={teamProfiles}
                  placeholder="— wybierz pracownika —"
                />
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data">
                <Input
                  type="date"
                  value={values.date}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </Field>
              <Field label="Czas (np. 2h, 90m, 1.5)">
                <Input
                  value={values.durationInput}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, durationInput: event.target.value }))
                  }
                  placeholder="2h 30m"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kategoria">
                <Select
                  value={values.categoryId}
                  onChange={(event) => handleCategoryChange(event.target.value)}
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
                  value={values.entryTypeId}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, entryTypeId: event.target.value }))
                  }
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

            {selectedEntryType?.countsAsWork ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Rodzaj pracy *">
                  <Select
                    value={values.workNature}
                    onChange={(event) => {
                      const nextNature = event.target.value as TimeEntryWorkNature | "";
                      setValues((current) => {
                        if (!nextNature || nextNature === "new_work") {
                          return { ...current, workNature: nextNature, workCause: "" };
                        }
                        const validCauses = TIME_ENTRY_WORK_CAUSES_BY_NATURE[nextNature];
                        return {
                          ...current,
                          workNature: nextNature,
                          workCause: validCauses.length === 1 ? validCauses[0] : "",
                        };
                      });
                    }}
                  >
                    <option value="">— wybierz —</option>
                    {TIME_ENTRY_WORK_NATURES.map((nature) => (
                      <option key={nature} value={nature}>
                        {TIME_ENTRY_WORK_NATURE_LABELS[nature]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Rola">
                  <Select
                    value={values.roleCode}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        roleCode: event.target.value as ProcessRoleCode | "",
                      }))
                    }
                  >
                    <option value="">— nie dotyczy —</option>
                    {PROCESS_ROLE_CODES.map((code) => (
                      <option key={code} value={code}>
                        {PROCESS_ROLE_LABELS[code]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}

            {values.workNature && values.workNature !== "new_work" ? (
              <Field label="Przyczyna *">
                <Select
                  value={values.workCause}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      workCause: event.target.value as TimeEntryWorkCause | "",
                    }))
                  }
                >
                  <option value="">— wybierz —</option>
                  {TIME_ENTRY_WORK_CAUSES_BY_NATURE[values.workNature].map((cause) => (
                    <option key={cause} value={cause}>
                      {TIME_ENTRY_WORK_CAUSE_LABELS[cause]}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <ProjectSelectSearchable
              projects={projects}
              clients={clients}
              value={values.projectId || null}
              onChange={(projectId) =>
                setValues((current) => ({ ...current, projectId: projectId ?? "", processStageId: "" }))
              }
              label={requiresProject ? "Projekt *" : "Projekt"}
              disabled={lockProject}
              usePortal
            />

            {projectStages.length > 0 ? (
              <Field label="Etap procesu">
                <Select
                  value={values.processStageId}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, processStageId: event.target.value }))
                  }
                >
                  <option value="">— brak —</option>
                  {projectStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {missions.length > 0 ? (
              <Field label="Misja / delegacja">
                <Select
                  value={values.missionId}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, missionId: event.target.value }))
                  }
                >
                  <option value="">— brak —</option>
                  {missions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.title} ({mission.startDate} – {mission.endDate})
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label={selectedEntryType?.requiresDescription ? "Opis *" : "Opis"}>
              <Textarea
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Co zostało wykonane?"
              />
            </Field>

            <div className="flex flex-wrap gap-4 text-sm">
              {showBillable ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.billable}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, billable: event.target.checked }))
                    }
                  />
                  Do rozliczenia
                </label>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values.remoteWork}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, remoteWork: event.target.checked }))
                  }
                />
                Praca zdalna
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values.delegation}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, delegation: event.target.checked }))
                  }
                />
                Delegacja / wyjazd
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-border/70 bg-surface-elevated px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Zapisywanie…" : entry ? "Zapisz zmiany" : "Dodaj wpis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
