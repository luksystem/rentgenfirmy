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
  layout = "stacked",
  className,
}: {
  projects: Array<{ id: string; name: string }>;
  interruption?: Interruption;
  isSaving?: boolean;
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel?: () => void;
  /** stacked — kolumny (karta dashboardu); inline — jeden rząd na szerokim ekranie */
  layout?: "stacked" | "inline";
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
        "grid gap-4 rounded-2xl border border-border bg-surface p-4",
        layout === "stacked" && "sm:grid-cols-2",
        layout === "inline" &&
          !onCancel &&
          "sm:grid-cols-2 2xl:grid-cols-[140px_180px_200px_minmax(180px,1fr)_minmax(180px,1.5fr)_auto] 2xl:items-end",
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
      <Field label="Projekt" className={layout === "inline" ? "sm:col-span-2 2xl:col-span-1" : "sm:col-span-2"}>
        <Select {...register("projectId", { required: true })}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Opis" className={layout === "inline" ? "sm:col-span-2 2xl:col-span-1" : "sm:col-span-2"}>
        <Textarea className={cn("min-h-20", layout === "inline" && "sm:min-h-10")} {...register("description", { required: true })} />
      </Field>
      <div
        className={cn(
          "flex w-full gap-2",
          layout === "stacked" || onCancel ? "sm:col-span-2" : "sm:col-span-2",
          onCancel ? "justify-end" : layout === "inline" ? "flex-col 2xl:w-auto" : "flex-col",
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
          className={cn("h-11 w-full", layout === "inline" && !onCancel && "2xl:w-auto")}
        >
          {isSaving ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj przerwanie"}
        </Button>
      </div>
    </form>
  );
}
