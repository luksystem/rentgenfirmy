"use client";

import { useEffect, useMemo, useState } from "react";
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
import { parseDurationInput } from "@/lib/time-tracking/format";
import type { TimeEntryView } from "@/lib/time-tracking/types";
import { useAppStore } from "@/store/app-store";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export type TimeEntryFormValues = {
  date: string;
  durationInput: string;
  categoryId: string;
  entryTypeId: string;
  projectId: string;
  description: string;
  billable: boolean;
  remoteWork: boolean;
  delegation: boolean;
};

function emptyForm(date: string, categoryId = "", entryTypeId = ""): TimeEntryFormValues {
  return {
    date,
    durationInput: "1h",
    categoryId,
    entryTypeId,
    projectId: "",
    description: "",
    billable: false,
    remoteWork: false,
    delegation: false,
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
    description: entry.description,
    billable: entry.billable,
    remoteWork: entry.remoteWork,
    delegation: entry.delegation,
  };
}

export function TimeEntryFormDialog({
  open,
  onOpenChange,
  entry,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntryView | null;
  defaultDate: string;
}) {
  const meta = useTimeTrackingStore((state) => state.meta);
  const ensureMeta = useTimeTrackingStore((state) => state.ensureMeta);
  const createEntry = useTimeTrackingStore((state) => state.createEntry);
  const updateEntry = useTimeTrackingStore((state) => state.updateEntry);

  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);

  const [values, setValues] = useState<TimeEntryFormValues>(() => emptyForm(defaultDate));
  const [submitting, setSubmitting] = useState(false);

  const categories = meta?.categories ?? [];
  const entryTypes = meta?.entryTypes ?? [];

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
    if (!open) {
      return;
    }
    if (entry) {
      setValues(entryToFormValues(entry));
      return;
    }
    const defaultCategory = categories[0];
    const defaultType =
      entryTypes.find((item) => item.name === "Praca") ?? entryTypes[0];
    setValues(
      emptyForm(
        defaultDate,
        defaultCategory?.id ?? "",
        defaultType?.id ?? "",
      ),
    );
    if (defaultCategory?.defaultBillable) {
      setValues((current) => ({ ...current, billable: true }));
    }
  }, [open, entry, defaultDate, categories, entryTypes]);

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
        remoteWork: values.remoteWork,
        delegation: values.delegation,
      };

      if (entry) {
        await updateEntry(entry.id, payload);
      } else {
        await createEntry(payload);
      }
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edytuj wpis czasu" : "Dodaj czas pracy"}</DialogTitle>
          <DialogDescription>
            Zarejestruj wykonany czas z kategorią, typem i opcjonalnym kontekstem projektu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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

          <ProjectSelectSearchable
            projects={projects}
            clients={clients}
            value={values.projectId || null}
            onChange={(projectId) =>
              setValues((current) => ({ ...current, projectId: projectId ?? "" }))
            }
            label={requiresProject ? "Projekt *" : "Projekt"}
          />

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
