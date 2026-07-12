"use client";

import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_PRIORITY_LABELS,
  type CreateWorkItemInput,
  type UpdateWorkItemInput,
  type WorkItemView,
} from "@/lib/my-work/types";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { profileToOptionLabel } from "@/lib/supabase/profile-repository";
import type { UserProfile } from "@/lib/auth/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

export type WorkItemManagerFormValues = {
  assignedUserId: string;
  projectId: string;
  title: string;
  description: string;
  expectedResult: string;
  completionCriteria: string;
  requiredMaterials: string;
  requiredInfo: string;
  dueDate: string;
  plannedStart: string;
  plannedEnd: string;
  estimatedMinutes: string;
  priority: CreateWorkItemInput["priority"];
};

export const EMPTY_WORK_ITEM_MANAGER_FORM: WorkItemManagerFormValues = {
  assignedUserId: "",
  projectId: "",
  title: "",
  description: "",
  expectedResult: "",
  completionCriteria: "",
  requiredMaterials: "",
  requiredInfo: "",
  dueDate: "",
  plannedStart: "",
  plannedEnd: "",
  estimatedMinutes: "",
  priority: "normal",
};

export function workItemToManagerFormValues(item: WorkItemView): WorkItemManagerFormValues {
  return {
    assignedUserId: item.assignedUserId,
    projectId: item.projectId ?? "",
    title: item.title,
    description: item.description,
    expectedResult: item.expectedResult,
    completionCriteria: item.completionCriteria,
    requiredMaterials: item.requiredMaterials,
    requiredInfo: item.requiredInfo,
    dueDate: item.dueDate ?? "",
    plannedStart: item.plannedStart ?? "",
    plannedEnd: item.plannedEnd ?? "",
    estimatedMinutes: item.estimatedMinutes != null ? String(item.estimatedMinutes) : "",
    priority: item.priority,
  };
}

export function managerFormValuesToCreateInput(
  values: WorkItemManagerFormValues,
  options: { clientId?: string | null; sendImmediately?: boolean },
): CreateWorkItemInput {
  return {
    assignedUserId: values.assignedUserId,
    projectId: values.projectId || null,
    clientId: options.clientId ?? null,
    title: values.title.trim(),
    description: values.description,
    expectedResult: values.expectedResult,
    completionCriteria: values.completionCriteria,
    requiredMaterials: values.requiredMaterials,
    requiredInfo: values.requiredInfo,
    dueDate: values.dueDate || null,
    plannedStart: values.plannedStart || null,
    plannedEnd: values.plannedEnd || null,
    estimatedMinutes: values.estimatedMinutes ? Number(values.estimatedMinutes) : null,
    priority: values.priority,
    sendImmediately: options.sendImmediately,
  };
}

export function managerFormValuesToUpdateInput(
  values: WorkItemManagerFormValues,
  options: { clientId?: string | null },
): UpdateWorkItemInput {
  return {
    assignedUserId: values.assignedUserId,
    projectId: values.projectId || null,
    clientId: options.clientId ?? null,
    title: values.title.trim(),
    description: values.description,
    expectedResult: values.expectedResult,
    completionCriteria: values.completionCriteria,
    requiredMaterials: values.requiredMaterials,
    requiredInfo: values.requiredInfo,
    dueDate: values.dueDate || null,
    plannedStart: values.plannedStart || null,
    plannedEnd: values.plannedEnd || null,
    estimatedMinutes: values.estimatedMinutes ? Number(values.estimatedMinutes) : null,
    priority: values.priority,
  };
}

export function WorkItemManagerForm({
  values,
  onChange,
  teamProfiles,
  projects,
  clients,
  isManualSource = true,
  disableAssignee = false,
}: {
  values: WorkItemManagerFormValues;
  onChange: (patch: Partial<WorkItemManagerFormValues>) => void;
  teamProfiles: UserProfile[];
  projects: Project[];
  clients: Client[];
  isManualSource?: boolean;
  disableAssignee?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Pracownik">
        <Select
          value={values.assignedUserId}
          disabled={disableAssignee}
          onChange={(event) => onChange({ assignedUserId: event.target.value })}
        >
          <option value="">Wybierz…</option>
          {teamProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profileToOptionLabel(profile)}
            </option>
          ))}
        </Select>
      </Field>

      <ProjectSelectSearchable
        projects={projects}
        clients={clients}
        value={values.projectId || null}
        onChange={(id) => onChange({ projectId: id ?? "" })}
        emptyLabel="Bez projektu"
        label="Projekt (opcjonalnie)"
      />

      <Field label="Nazwa zadania">
        <Input value={values.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>

      <Field label="Opis">
        <Textarea value={values.description} onChange={(event) => onChange({ description: event.target.value })} rows={2} />
      </Field>

      {isManualSource ? (
        <>
          <Field label="Oczekiwany rezultat">
            <Textarea
              value={values.expectedResult}
              onChange={(event) => onChange({ expectedResult: event.target.value })}
              rows={2}
            />
          </Field>

          <Field label="Kryterium zakończenia">
            <Textarea
              value={values.completionCriteria}
              onChange={(event) => onChange({ completionCriteria: event.target.value })}
              rows={2}
            />
          </Field>

          <Field label="Wymagane materiały">
            <Textarea
              value={values.requiredMaterials}
              onChange={(event) => onChange({ requiredMaterials: event.target.value })}
              rows={2}
            />
          </Field>

          <Field label="Wymagane informacje">
            <Textarea
              value={values.requiredInfo}
              onChange={(event) => onChange({ requiredInfo: event.target.value })}
              rows={2}
            />
          </Field>
        </>
      ) : (
        <p className="text-xs text-muted">
          Zadanie z tablicy wdrożeń — edycja dotyczy podstawowych pól i terminu. Szczegóły procesu zmieniasz w źródle.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Termin">
          <Input type="date" value={values.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
        </Field>
        <Field label="Szacowany czas (min)">
          <Input
            type="number"
            min={0}
            value={values.estimatedMinutes}
            onChange={(event) => onChange({ estimatedMinutes: event.target.value })}
          />
        </Field>
      </div>

      {isManualSource ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Planowany start">
            <Input
              type="date"
              value={values.plannedStart}
              onChange={(event) => onChange({ plannedStart: event.target.value })}
            />
          </Field>
          <Field label="Planowany koniec">
            <Input
              type="date"
              value={values.plannedEnd}
              onChange={(event) => onChange({ plannedEnd: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      <Field label="Priorytet">
        <Select
          value={values.priority ?? "normal"}
          onChange={(event) => onChange({ priority: event.target.value as CreateWorkItemInput["priority"] })}
        >
          {WORK_ITEM_PRIORITIES.map((entry) => (
            <option key={entry} value={entry}>
              {WORK_ITEM_PRIORITY_LABELS[entry]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
