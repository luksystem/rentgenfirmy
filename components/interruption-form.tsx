"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn, toISODate } from "@/lib/utils";
import {
  defaultInterruptionTypeName,
  defaultNextStepOwner,
  interruptionTypeNames,
  pickOption,
  type FieldOptions,
} from "@/lib/field-options";
import type { Interruption, InterruptionKind } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

type FormValues = Omit<Interruption, "id">;

function interruptionToFormValues(
  interruption: Interruption,
  fieldOptions: FieldOptions,
): FormValues {
  const defaultType = defaultInterruptionTypeName(fieldOptions);
  const defaultOwner = defaultNextStepOwner(fieldOptions);

  return {
    date: interruption.date,
    person: pickOption(interruption.person, fieldOptions.nextStepOwners, defaultOwner),
    kind: interruption.kind ?? "interruption",
    type: pickOption(interruption.type, interruptionTypeNames(fieldOptions), defaultType),
    projectId: interruption.projectId,
    description: interruption.description ?? "",
    durationMinutes: interruption.durationMinutes,
    wasNecessary: interruption.wasNecessary ?? false,
    isRecurring: interruption.isRecurring ?? false,
  };
}

function emptyFormValues(fieldOptions: FieldOptions): FormValues {
  return {
    date: toISODate(new Date()),
    person: defaultNextStepOwner(fieldOptions),
    kind: "interruption",
    type: defaultInterruptionTypeName(fieldOptions),
    projectId: null,
    description: "",
    durationMinutes: null,
    wasNecessary: false,
    isRecurring: false,
  };
}

function InterruptionCheckbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-surface-muted/50 px-3 py-2.5 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border bg-surface-muted text-accent focus:ring-accent/30"
        {...props}
      />
      <span className="font-medium text-foreground">{label}</span>
    </label>
  );
}

function KindToggle({
  value,
  onChange,
}: {
  value: InterruptionKind;
  onChange: (kind: InterruptionKind) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface-muted p-1">
      {(
        [
          ["interruption", "Przerwanie"],
          ["focus", "Skupienie"],
        ] as const
      ).map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            value === kind
              ? kind === "focus"
                ? "bg-emerald-600 text-white shadow-soft"
                : "bg-accent text-accent-foreground shadow-soft"
              : "text-muted hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
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
  layout?: "stacked" | "inline";
  className?: string;
}) {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const defaultType = defaultInterruptionTypeName(fieldOptions);
  const defaultOwner = defaultNextStepOwner(fieldOptions);
  const isEditing = Boolean(interruption);

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: interruption
      ? interruptionToFormValues(interruption, fieldOptions)
      : emptyFormValues(fieldOptions),
  });

  const kind = watch("kind");
  const durationMinutes = watch("durationMinutes");

  useEffect(() => {
    if (interruption) {
      reset(interruptionToFormValues(interruption, fieldOptions));
      return;
    }

    reset(emptyFormValues(fieldOptions));
  }, [interruption, fieldOptions, defaultType, defaultOwner, reset]);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const payload: FormValues = {
          ...values,
          kind: values.kind ?? "interruption",
          projectId: values.projectId || null,
          description: values.description?.trim() ?? "",
          durationMinutes: values.durationMinutes && values.durationMinutes > 0
            ? values.durationMinutes
            : null,
          type: values.kind === "focus" ? "" : values.type,
        };

        await onSubmit(payload);

        if (!isEditing) {
          reset({
            ...emptyFormValues(fieldOptions),
            date: values.date,
            person: values.person,
            kind: values.kind,
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
      <div className={cn("sm:col-span-2", layout === "inline" && !onCancel && "2xl:col-span-6")}>
        <KindToggle
          value={kind ?? "interruption"}
          onChange={(nextKind) => setValue("kind", nextKind, { shouldDirty: true })}
        />
      </div>
      <input type="hidden" {...register("kind")} />

      <Field label="Data">
        <Input type="date" {...register("date", { required: true })} />
      </Field>
      <Field label="Osoba">
        <Select {...register("person", { required: true })}>
          {fieldOptions.nextStepOwners.map((person) => (
            <option key={person}>{person}</option>
          ))}
        </Select>
      </Field>

      {kind !== "focus" ? (
        <Field label="Typ przerwania">
          <Select {...register("type", { required: true })}>
            {interruptionTypeNames(fieldOptions).map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field
        label="Projekt (opcjonalnie)"
        className={layout === "inline" ? "sm:col-span-2 2xl:col-span-1" : "sm:col-span-2"}
      >
        <Select {...register("projectId")}>
          <option value="">Bez projektu</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Czas (minuty, opcjonalnie)"
        className={kind === "focus" ? undefined : layout === "inline" ? "2xl:col-span-1" : undefined}
      >
        <NumericInput
          decimals={false}
          value={durationMinutes ?? 0}
          onChange={(value) =>
            setValue("durationMinutes", value > 0 ? value : null, { shouldDirty: true })
          }
        />
      </Field>

      <Field
        label="Opis (opcjonalnie)"
        className={layout === "inline" ? "sm:col-span-2 2xl:col-span-1" : "sm:col-span-2"}
      >
        <Textarea
          className={cn("min-h-20", layout === "inline" && "sm:min-h-10")}
          {...register("description")}
          placeholder={
            kind === "focus"
              ? "Np. domknięcie dokumentacji, programowanie bez rozpraszaczy…"
              : "Krótki opis przerwania…"
          }
        />
      </Field>

      <div
        className={cn(
          "flex flex-wrap gap-2",
          layout === "stacked" || onCancel ? "sm:col-span-2" : "sm:col-span-2 2xl:col-span-2",
        )}
      >
        <InterruptionCheckbox label="Czy to było konieczne?" {...register("wasNecessary")} />
        <InterruptionCheckbox label="Czy to się powtarza?" {...register("isRecurring")} />
      </div>

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
          disabled={isSaving}
          className={cn("h-11 w-full", layout === "inline" && !onCancel && "2xl:w-auto")}
        >
          {isSaving
            ? "Zapisywanie..."
            : isEditing
              ? "Zapisz zmiany"
              : kind === "focus"
                ? "Dodaj blok skupienia"
                : "Dodaj przerwanie"}
        </Button>
      </div>
    </form>
  );
}
