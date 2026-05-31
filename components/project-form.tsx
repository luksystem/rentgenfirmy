"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  defaultFlowStatus,
  defaultStageName,
  flowStatusNames,
  isClosedFlowStatus,
  pickOption,
  stageNames,
  type FieldOptions,
} from "@/lib/field-options";
import { priorities, type Project, type ProjectInput } from "@/lib/types";
import { toISODate } from "@/lib/utils";
import { zodStringOption } from "@/lib/zod-helpers";
import { useAppStore } from "@/store/app-store";

type FormValues = {
  name: string;
  isActive: boolean;
  type: string;
  flowStatus: string;
  stage: string;
  priority: (typeof priorities)[number];
  nextStepOwner: string;
  nextContactDate: string;
  blockerReason?: string;
  notes?: string;
  closeBlocker?: string;
  remainingHours?: number;
  nextAction?: string;
  closeDeadline?: string;
};

function createSchema(options: FieldOptions) {
  return z
    .object({
      name: z.string().min(2, "Podaj nazwę projektu"),
      isActive: z.boolean(),
      type: zodStringOption(options.projectTypes, "Wybierz typ projektu"),
      flowStatus: zodStringOption(flowStatusNames(options), "Wybierz status przepływu"),
      stage: zodStringOption(stageNames(options), "Wybierz etap"),
      priority: z.enum(priorities),
      nextStepOwner: zodStringOption(options.nextStepOwners, "Wybierz właściciela kroku"),
      nextContactDate: z.string().min(1, "Podaj datę kontaktu"),
      blockerReason: z
        .union([zodStringOption(options.blockerReasons, "Wybierz powód blokady"), z.literal("")])
        .optional(),
      notes: z.string().optional(),
      closeBlocker: z.string().optional(),
      remainingHours: z.number().min(0).optional(),
      nextAction: z.string().optional(),
      closeDeadline: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (!value.isActive && !isClosedFlowStatus(value.flowStatus, options)) {
        if (!value.blockerReason) {
          ctx.addIssue({
            code: "custom",
            message: "Powód blokady jest wymagany, gdy projekt nie jest aktywny",
            path: ["blockerReason"],
          });
        }
      }
    });
}

export function projectToFormValues(project: Project, options: FieldOptions): FormValues {
  return {
    name: project.name,
    isActive: project.isActive,
    type: pickOption(project.type, options.projectTypes, "Dom"),
    flowStatus: pickOption(project.flowStatus, flowStatusNames(options), defaultFlowStatus(options)),
    stage: pickOption(project.stage, stageNames(options), defaultStageName(options)),
    priority: project.priority,
    nextStepOwner: pickOption(project.nextStepOwner, options.nextStepOwners, "Łukasz"),
    nextContactDate: project.nextContactDate,
    blockerReason: project.blockerReason ?? "",
    notes: project.notes ?? "",
    closeBlocker: project.closeBlocker ?? "",
    remainingHours: project.remainingHours ?? 0,
    nextAction: project.nextAction ?? "",
    closeDeadline: project.closeDeadline ?? "",
  };
}

function createDefaultValues(options: FieldOptions): FormValues {
  return {
    name: "",
    isActive: true,
    type: pickOption(undefined, options.projectTypes, "Dom"),
    flowStatus: defaultFlowStatus(options),
    stage: defaultStageName(options),
    priority: "Normalny",
    nextStepOwner: pickOption(undefined, options.nextStepOwners, "Łukasz"),
    nextContactDate: toISODate(new Date()),
    blockerReason: "",
    notes: "",
    closeBlocker: "",
    remainingHours: 0,
    nextAction: "",
    closeDeadline: "",
  };
}

export function ProjectForm({
  project,
  isSaving = false,
  onSubmit,
  onCancel,
}: {
  project?: Project;
  isSaving?: boolean;
  onSubmit: (project: ProjectInput) => void | Promise<void>;
  onCancel: () => void;
}) {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const schema = useMemo(() => createSchema(fieldOptions), [fieldOptions]);
  const defaultValues = useMemo(
    () => (project ? projectToFormValues(project, fieldOptions) : createDefaultValues(fieldOptions)),
    [project, fieldOptions],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues,
  });

  function submit(values: FormValues) {
    void onSubmit({
      ...values,
      blockerReason: values.blockerReason || undefined,
      closeBlocker: values.closeBlocker || undefined,
      remainingHours: values.remainingHours || undefined,
      nextAction: values.nextAction || undefined,
      closeDeadline: values.closeDeadline || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nazwa projektu" error={errors.name?.message}>
          <Input {...register("name")} placeholder="np. Dom Wilanów" />
        </Field>
        <Field label="Typ projektu" error={errors.type?.message}>
          <Select {...register("type")}>
            {fieldOptions.projectTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          {...register("isActive")}
        />
        <span>
          <span className="block text-sm font-semibold text-slate-900">Aktywny</span>
          <span className="mt-1 block text-sm text-slate-600">
            Projekt liczy się jako aktywny w dashboardzie i raportach. Niezależny od statusu przepływu.
          </span>
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Status przepływu" error={errors.flowStatus?.message}>
          <Select {...register("flowStatus")}>
            {flowStatusNames(fieldOptions).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
        </Field>
        <Field label="Etap" error={errors.stage?.message}>
          <Select {...register("stage")}>
            {stageNames(fieldOptions).map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priorytet" error={errors.priority?.message}>
          <Select {...register("priority")}>
            {priorities.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </Select>
        </Field>
        <Field label="Właściciel kolejnego kroku" error={errors.nextStepOwner?.message}>
          <Select {...register("nextStepOwner")}>
            {fieldOptions.nextStepOwners.map((owner) => (
              <option key={owner}>{owner}</option>
            ))}
          </Select>
        </Field>
        <Field label="Data kolejnego kontaktu" error={errors.nextContactDate?.message}>
          <Input type="date" {...register("nextContactDate")} />
        </Field>
        <Field label="Powód blokady" error={errors.blockerReason?.message}>
          <Select {...register("blockerReason")}>
            <option value="">Brak</option>
            {fieldOptions.blockerReasons.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Notatki" error={errors.notes?.message}>
        <Textarea {...register("notes")} placeholder="Kontekst, ryzyka, ustalenia..." />
      </Field>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-sm font-semibold">Pola dla modułu do zamknięcia</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Co blokuje zamknięcie">
            <Input {...register("closeBlocker")} />
          </Field>
          <Field label="Ile godzin pracy zostało">
            <Input type="number" min={0} {...register("remainingHours", { valueAsNumber: true })} />
          </Field>
          <Field label="Następna akcja">
            <Input {...register("nextAction")} />
          </Field>
          <Field label="Termin zamknięcia">
            <Input type="date" {...register("closeDeadline")} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Zapisywanie..." : "Zapisz projekt"}
        </Button>
      </div>
    </form>
  );
}
