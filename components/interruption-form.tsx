"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { cn, toISODate } from "@/lib/utils";
import { interruptionTypes, people, type Interruption } from "@/lib/types";

type FormValues = Omit<Interruption, "id">;

export function InterruptionForm({
  projects,
  isSaving = false,
  onSubmit,
  className,
}: {
  projects: Array<{ id: string; name: string }>;
  isSaving?: boolean;
  onSubmit: (values: FormValues) => void | Promise<void>;
  className?: string;
}) {
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      date: toISODate(new Date()),
      person: "Łukasz",
      type: "Telefon klienta",
      projectId: projects[0]?.id ?? "",
      description: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset({ ...values, description: "" });
      })}
      className={cn(
        "grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[140px_180px_200px_240px_1fr_auto] lg:items-end",
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
          {interruptionTypes.map((type) => (
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
      <Button
        type="submit"
        disabled={isSaving || projects.length === 0}
        className="h-11 w-full sm:col-span-2 lg:w-auto"
      >
        {isSaving ? "Zapisywanie..." : "Dodaj przerwanie"}
      </Button>
    </form>
  );
}
