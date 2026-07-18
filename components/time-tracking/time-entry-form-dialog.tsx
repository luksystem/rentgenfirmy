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
import type { TimeEntryView } from "@/lib/time-tracking/types";
import type { WorkMission } from "@/lib/supabase/work-missions-server";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { createTimeEntry } from "@/lib/supabase/time-tracking-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export type TimeEntryFormValues = {
  date: string;
  durationInput: string;
  categoryId: string;
  entryTypeId: string;
  projectId: string;
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
    projectId: "",
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
    projectId: entry.projectId ?? "",
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
  entryUserLabel,
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
  entryUserLabel?: string;
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

    const missionUserId =
      entry?.userId ?? (values.userId || profile?.id || "");
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
  }, [open, values.date, values.userId, entry?.userId, profile?.id]);

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

    setSubmitting(true);
    try {
      const payload = {
        date: values.date,
        durationMinutes,
        categoryId: values.categoryId,
        entryTypeId: values.entryTypeId,
        description: values.description,
        billable: values.billable,
        projectId: values.projectId || null,
        missionId: values.missionId || null,
        remoteWork: values.remoteWork,
        delegation: values.delegation,
      };

      let savedEntry: TimeEntryView;
      if (entry) {
        savedEntry = await updateEntry(entry.id, payload);
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
      <DialogContent className="max-w-lg overflow-visible">
        <DialogHeader>
          <DialogTitle>{entry ? "Edytuj wpis czasu" : "Dodaj czas pracy"}</DialogTitle>
          <DialogDescription>
            Zarejestruj wykonany czas z kategorią, typem i opcjonalnym kontekstem projektu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {allowUserSelection && !entry ? (
            <Field label="Pracownik">
              <TeamProfileSelect
                value={values.userId}
                onChange={(userId) => setValues((current) => ({ ...current, userId }))}
                teamProfiles={teamProfiles}
                placeholder="— wybierz pracownika —"
              />
            </Field>
          ) : null}

          {allowUserSelection && entry ? (
            <Field label="Pracownik">
              <Input value={entryUserLabel ?? entry.userId} disabled />
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

          <div className="relative z-20 overflow-visible">
            <ProjectSelectSearchable
              projects={projects}
              clients={clients}
              value={values.projectId || null}
              onChange={(projectId) =>
                setValues((current) => ({ ...current, projectId: projectId ?? "" }))
              }
              label={requiresProject ? "Projekt *" : "Projekt"}
              disabled={lockProject}
              usePortal={false}
            />
          </div>

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

        <div className="flex justify-end gap-2">
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
