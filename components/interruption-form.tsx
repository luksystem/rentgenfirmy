"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { cn, toISODate } from "@/lib/utils";
import {
  defaultInterruptionTypeName,
  interruptionTypeNames,
  pickOption,
  type FieldOptions,
} from "@/lib/field-options";
import { people, type Interruption } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

type FormValues = Omit<Interruption, "id">;

function interruptionToFormValues(
  interruption: Interruption,
  fieldOptions: FieldOptions,
): FormValues {
  const defaultType = defaultInterruptionTypeName(fieldOptions);

  return {
    date: interruption.date,
    person: interruption.person,
    type: pickOption(interruption.type, interruptionTypeNames(fieldOptions), defaultType),
    projectId: interruption.projectId,
    description: interruption.description,
  };
}

export function InterruptionForm({
  projects,
  interruption,
  isSaving = false,
  onSubmit,
  onCancel,
  className,
}: {
  projects: Array<{ id: string; name: string }>;
  interruption?: Interruption;
  isSaving?: boolean;
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
}) {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const defaultType = defaultInterruptionTypeName(fieldOptions);
  const isEditing = Boolean(interruption);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: interruption
      ? interruptionToFormValues(interruption, fieldOptions)
      : {
          date: toISODate(new Date()),
          person: "Łukasz",
          type: defaultType,
          projectId: projects[0]?.id ?? "",
          description: "",
        },
  });

  useEffect(() => {
    if (interruption) {
      reset(interruptionToFormValues(interruption, fieldOptions));
      return;
    }

    reset({
      date: toISODate(new Date()),
      person: "Łukasz",
      type: defaultType,
      projectId: projects[0]?.id ?? "",
      description: "",
    });
  }, [interruption, fieldOptions, defaultType, projects, reset]);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);

        if (!isEditing) {
          reset({
            ...values,
            description: "",
            type: pickOption(undefined, interruptionTypeNames(fieldOptions), defaultType),
          });
        }
      })}
      className={cn(
        "grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2",
        !onCancel && "lg:grid-cols-[140px_180px_200px_240px_1fr_auto] lg:items-end",
        className,
      )}
    >
      <Field label="Data">
        <Input type="date" {...register("date", { required: true })} />
      </Field>
      <Field label="Osoba">
        <Select {...register("person", { required: true })}>
          {people.map((person) => (
            <option key={person}>{person}</option>
          ))}
        </Select>
      </Field>
      <Field label="Typ przerwania">
        <Select {...register("type", { required: true })}>
          {interruptionTypeNames(fieldOptions).map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Select>
      </Field>
      <Field label="Projekt" className="sm:col-span-2 lg:col-span-1">
        <Select {...register("projectId", { required: true })}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Opis" className="sm:col-span-2 lg:col-span-1">
        <Textarea className="min-h-20 sm:min-h-10" {...register("description", { required: true })} />
      </Field>
      <div
        className={cn(
          "flex w-full gap-2 sm:col-span-2",
          onCancel ? "justify-end" : "flex-col lg:w-auto",
        )}
      >
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            Anuluj
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={isSaving || projects.length === 0}
          className={cn("h-11", onCancel ? "" : "w-full lg:w-auto")}
        >
          {isSaving ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj przerwanie"}
        </Button>
      </div>
    </form>
  );
}
