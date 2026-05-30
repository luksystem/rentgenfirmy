"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  blockerReasons,
  flowStatuses,
  implementationStages,
  nextStepOwners,
  priorities,
  projectTypes,
  type Project,
  type ProjectInput,
} from "@/lib/types";
import { toISODate } from "@/lib/utils";

const schema = z
  .object({
    name: z.string().min(2, "Podaj nazwę projektu"),
    type: z.enum(projectTypes),
    flowStatus: z.enum(flowStatuses),
    stage: z.enum(implementationStages),
    priority: z.enum(priorities),
    nextStepOwner: z.enum(nextStepOwners),
    nextContactDate: z.string().min(1, "Podaj datę kontaktu"),
    blockerReason: z.enum(blockerReasons).optional().or(z.literal("")),
    notes: z.string().optional(),
    closeBlocker: z.string().optional(),
    remainingHours: z.number().min(0).optional(),
    nextAction: z.string().optional(),
    closeDeadline: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.flowStatus !== "Aktywny" && value.flowStatus !== "Zamknięty") {
      if (!value.blockerReason) {
        ctx.addIssue({
          code: "custom",
          message: "Powód blokady jest wymagany poza statusem Aktywny",
          path: ["blockerReason"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export function projectToFormValues(project: Project): FormValues {
  return {
    name: project.name,
    type: project.type,
    flowStatus: project.flowStatus,
    stage: project.stage,
    priority: project.priority,
    nextStepOwner: project.nextStepOwner,
    nextContactDate: project.nextContactDate,
    blockerReason: project.blockerReason ?? "",
    notes: project.notes ?? "",
    closeBlocker: project.closeBlocker ?? "",
    remainingHours: project.remainingHours ?? 0,
    nextAction: project.nextAction ?? "",
    closeDeadline: project.closeDeadline ?? "",
  };
}

const defaultValues: FormValues = {
  name: "",
  type: "Dom",
  flowStatus: "Aktywny",
  stage: "Projektowanie",
  priority: "Normalny",
  nextStepOwner: "Łukasz",
  nextContactDate: toISODate(new Date()),
  blockerReason: "",
  notes: "",
  closeBlocker: "",
  remainingHours: 0,
  nextAction: "",
  closeDeadline: "",
};

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: project ? projectToFormValues(project) : defaultValues,
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
            {projectTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status przepływu" error={errors.flowStatus?.message}>
          <Select {...register("flowStatus")}>
            {flowStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
        </Field>
        <Field label="Etap" error={errors.stage?.message}>
          <Select {...register("stage")}>
            {implementationStages.map((stage) => (
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
            {nextStepOwners.map((owner) => (
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
            {blockerReasons.map((reason) => (
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
