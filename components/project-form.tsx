"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  defaultFlowStatus,
  defaultStageName,
  blockerReasonNames,
  flowStatusNames,
  isClosedFlowStatus,
  isWaitingFlowStatus,
  pickOption,
  stageNames,
  type FieldOptions,
} from "@/lib/field-options";
import { priorities, type Project, type ProjectInput } from "@/lib/types";
import { computeWarrantyEndsAt, formatProjectDuration, formatWarrantyEndDate } from "@/lib/project/warranty";
import { toISODate } from "@/lib/utils";
import {
  applyWaitingPriority,
  countWaitingFlags,
  priorityFromWaitingFlags,
} from "@/lib/waiting-priority";
import { zodStringOption } from "@/lib/zod-helpers";
import { useAppStore } from "@/store/app-store";

type FormValues = {
  name: string;
  clientId: string;
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
  waitingDependsOnUs: boolean;
  waitingIncreasesCostLater: boolean;
  waitingBlocksSettlement: boolean;
  systemHandoverAt?: string;
  warrantyDurationMonths?: number;
};

function createSchema(options: FieldOptions) {
  return z
    .object({
      name: z.string().min(2, "Podaj nazwę projektu"),
      clientId: z.string().optional(),
      isActive: z.boolean(),
      type: zodStringOption(options.projectTypes, "Wybierz typ projektu"),
      flowStatus: zodStringOption(flowStatusNames(options), "Wybierz status przepływu"),
      stage: zodStringOption(stageNames(options), "Wybierz etap"),
      priority: z.enum(priorities),
      nextStepOwner: zodStringOption(options.nextStepOwners, "Wybierz właściciela kroku"),
      nextContactDate: z.string().min(1, "Podaj datę kontaktu"),
      blockerReason: z
        .union([
          zodStringOption(blockerReasonNames(options), "Wybierz powód blokady"),
          z.literal(""),
        ])
        .optional(),
      notes: z.string().optional(),
      closeBlocker: z.string().optional(),
      remainingHours: z.number().min(0).optional(),
      nextAction: z.string().optional(),
      closeDeadline: z.string().optional(),
  waitingDependsOnUs: z.boolean(),
  waitingIncreasesCostLater: z.boolean(),
  waitingBlocksSettlement: z.boolean(),
  systemHandoverAt: z.string().optional(),
  warrantyDurationMonths: z.coerce.number().min(0).optional(),
})
    .superRefine((value, ctx) => {
      const requiresBlocker =
        isWaitingFlowStatus(value.flowStatus, options) ||
        (!value.isActive && !isClosedFlowStatus(value.flowStatus, options));

      if (requiresBlocker && !value.blockerReason) {
        ctx.addIssue({
          code: "custom",
          message: isWaitingFlowStatus(value.flowStatus, options)
            ? "Powód blokady jest wymagany dla statusu oczekującego"
            : "Powód blokady jest wymagany, gdy projekt nie jest aktywny",
          path: ["blockerReason"],
        });
      }
    });
}

export function projectToFormValues(project: Project, options: FieldOptions): FormValues {
  return {
    name: project.name,
    clientId: project.clientId ?? "",
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
    waitingDependsOnUs: project.waitingDependsOnUs ?? false,
    waitingIncreasesCostLater: project.waitingIncreasesCostLater ?? false,
    waitingBlocksSettlement: project.waitingBlocksSettlement ?? false,
    systemHandoverAt: project.systemHandoverAt ?? "",
    warrantyDurationMonths: project.warrantyDurationMonths ?? 12,
  };
}

function createDefaultValues(options: FieldOptions): FormValues {
  return {
    name: "",
    clientId: "",
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
    waitingDependsOnUs: false,
    waitingIncreasesCostLater: false,
    waitingBlocksSettlement: false,
    systemHandoverAt: "",
    warrantyDurationMonths: 12,
  };
}

function WaitingCheckbox({
  label,
  description,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/80 bg-surface-muted/50 p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-border bg-surface-muted text-accent focus:ring-accent/30"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>
      </span>
    </label>
  );
}

export function ProjectForm({
  project,
  isSaving = false,
  onSubmit,
  onCancel,
  variant = "full",
  hideCancel = false,
}: {
  project?: Project;
  isSaving?: boolean;
  onSubmit: (project: ProjectInput) => void | Promise<void>;
  onCancel: () => void;
  variant?: "full" | "client-dashboard";
  hideCancel?: boolean;
}) {
  const isClientDashboard = variant === "client-dashboard";
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const clients = useAppStore((state) => state.clients);
  const addClient = useAppStore((state) => state.addClient);
  const schema = useMemo(() => createSchema(fieldOptions), [fieldOptions]);
  const defaultValues = useMemo(
    () => (project ? projectToFormValues(project, fieldOptions) : createDefaultValues(fieldOptions)),
    [project, fieldOptions],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues,
  });

  const flowStatus = useWatch({ control, name: "flowStatus" });
  const clientId = useWatch({ control, name: "clientId" });
  const waitingDependsOnUs = useWatch({ control, name: "waitingDependsOnUs" });
  const waitingIncreasesCostLater = useWatch({ control, name: "waitingIncreasesCostLater" });
  const waitingBlocksSettlement = useWatch({ control, name: "waitingBlocksSettlement" });
  const systemHandoverAt = useWatch({ control, name: "systemHandoverAt" });
  const warrantyDurationMonths = useWatch({ control, name: "warrantyDurationMonths" });
  const safeWarrantyMonths =
    typeof warrantyDurationMonths === "number" && Number.isFinite(warrantyDurationMonths)
      ? warrantyDurationMonths
      : undefined;

  const isWaiting = isWaitingFlowStatus(flowStatus, fieldOptions);
  const waitingFlagCount = countWaitingFlags({
    waitingDependsOnUs,
    waitingIncreasesCostLater,
    waitingBlocksSettlement,
  });
  const autoPriority = priorityFromWaitingFlags({
    waitingDependsOnUs,
    waitingIncreasesCostLater,
    waitingBlocksSettlement,
  });

  useEffect(() => {
    if (!isWaiting) {
      setValue("waitingDependsOnUs", false);
      setValue("waitingIncreasesCostLater", false);
      setValue("waitingBlocksSettlement", false);
      return;
    }

    if (autoPriority) {
      setValue("priority", autoPriority);
    }
  }, [
    isWaiting,
    autoPriority,
    setValue,
    waitingDependsOnUs,
    waitingIncreasesCostLater,
    waitingBlocksSettlement,
  ]);

  function submit(values: FormValues) {
    const waiting = isWaitingFlowStatus(values.flowStatus, fieldOptions);
    const payload = applyWaitingPriority(
      {
        ...values,
        blockerReason: values.blockerReason || undefined,
        closeBlocker: values.closeBlocker || undefined,
        remainingHours: values.remainingHours || undefined,
        nextAction: values.nextAction || undefined,
        closeDeadline: values.closeDeadline || undefined,
        waitingDependsOnUs: values.waitingDependsOnUs,
        waitingIncreasesCostLater: values.waitingIncreasesCostLater,
        waitingBlocksSettlement: values.waitingBlocksSettlement,
      },
      waiting,
    );

    void onSubmit({
      name: payload.name,
      clientId: isClientDashboard ? (project?.clientId ?? null) : values.clientId || null,
      isActive: payload.isActive,
      type: payload.type,
      flowStatus: payload.flowStatus,
      stage: payload.stage,
      priority: payload.priority,
      nextStepOwner: payload.nextStepOwner,
      nextContactDate: payload.nextContactDate,
      blockerReason: payload.blockerReason,
      notes: payload.notes,
      closeBlocker: payload.closeBlocker,
      remainingHours: payload.remainingHours,
      nextAction: payload.nextAction,
      closeDeadline: payload.closeDeadline,
      waitingDependsOnUs: waiting ? payload.waitingDependsOnUs : undefined,
      waitingIncreasesCostLater: waiting ? payload.waitingIncreasesCostLater : undefined,
      waitingBlocksSettlement: waiting ? payload.waitingBlocksSettlement : undefined,
      ...(isClientDashboard
        ? {}
        : {
            systemHandoverAt: values.systemHandoverAt || undefined,
            warrantyDurationMonths:
              typeof values.warrantyDurationMonths === "number" &&
              Number.isFinite(values.warrantyDurationMonths)
                ? values.warrantyDurationMonths
                : undefined,
            warrantyEndsAt:
              computeWarrantyEndsAt(
                values.systemHandoverAt,
                typeof values.warrantyDurationMonths === "number" &&
                  Number.isFinite(values.warrantyDurationMonths)
                  ? values.warrantyDurationMonths
                  : undefined,
              ) || undefined,
          }),
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
        {!isClientDashboard ? (
          <ClientSelectWithCreate
            clients={clients}
            value={clientId || null}
            onChange={(id) => setValue("clientId", id ?? "")}
            onCreateClient={addClient}
            emptyLabel="Bez klienta"
            className="md:col-span-2"
          />
        ) : null}
      </div>

      <label className="panel-success flex cursor-pointer items-start gap-3 rounded-xl border p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border bg-surface-muted text-accent focus:ring-accent/30"
          {...register("isActive")}
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">Aktywny</span>
          <span className="mt-1 block text-sm text-muted">
            Czy zespół teraz aktywnie pracuje nad projektem. Niezależne od statusu przepływu (W
            trakcie / Oczekujące / Zamknięty). Projekt może być np. oczekujący i nieaktywny —
            wtedy świadomie go nie prowadzimy, ale przerwania nadal warto rejestrować.
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
          <Select {...register("priority")} disabled={isWaiting && waitingFlagCount > 0}>
            {priorities.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </Select>
          {isWaiting && waitingFlagCount > 0 ? (
            <p className="mt-1 text-xs text-muted">
              Priorytet ustawiany automatycznie: 1 zaznaczenie → Wysoki, 2 lub więcej → Krytyczny.
            </p>
          ) : null}
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
            {blockerReasonNames(fieldOptions).map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </Select>
        </Field>
      </div>

      {isWaiting ? (
        <div className="panel-warning rounded-xl border p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Ocena oczekiwania</p>
          <p className="mb-3 text-xs leading-5 text-muted">
            Zaznacz, co dotyczy tego oczekiwania. Priorytet zmieni się automatycznie na Wysoki
            (jedno zaznaczenie) lub Krytyczny (dwa lub więcej).
          </p>
          <div className="grid gap-2">
            <WaitingCheckbox
              label="Czy jest zależne od nas?"
              description="Bez naszej akcji temat stoi w miejscu."
              {...register("waitingDependsOnUs")}
            />
            <WaitingCheckbox
              label="Czy nie wykonanie zwiększy koszty później?"
              description="Opóźnienie może podnieść koszt realizacji."
              {...register("waitingIncreasesCostLater")}
            />
            <WaitingCheckbox
              label="Czy blokuje rozliczenie?"
              description="Bez tego kroku nie domkniemy rozliczenia z klientem."
              {...register("waitingBlocksSettlement")}
            />
          </div>
        </div>
      ) : null}

      <Field label="Notatki" error={errors.notes?.message}>
        <Textarea {...register("notes")} placeholder="Kontekst, ryzyka, ustalenia..." />
      </Field>

      {!isClientDashboard ? (
      <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-4">
        <p className="mb-3 text-sm font-semibold">Gwarancja</p>
        <div className="grid gap-4 md:grid-cols-2">
          {project ? (
            <Field label="Czas trwania projektu (od utworzenia)">
              <Input value={formatProjectDuration(project)} readOnly disabled />
            </Field>
          ) : null}
          <Field label="Data przekazania systemu" error={errors.systemHandoverAt?.message}>
            <Input type="date" {...register("systemHandoverAt")} />
          </Field>
          <Field label="Czas trwania gwarancji (miesiące)" error={errors.warrantyDurationMonths?.message}>
            <Input type="number" min={1} step={1} {...register("warrantyDurationMonths", { valueAsNumber: true })} />
          </Field>
          {project ? (
            <Field label="Obliczony koniec gwarancji">
              <Input
                value={formatWarrantyEndDate({
                  systemHandoverAt,
                  warrantyDurationMonths: safeWarrantyMonths,
                })}
                readOnly
                disabled
              />
            </Field>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted">
          Koniec gwarancji liczony jest od daty przekazania systemu. Przedłużenie z akceptacją klienta
          ustawisz w dashboardzie klienta.
        </p>
      </div>
      ) : null}

      <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-4">
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
        {!hideCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            Anuluj
          </Button>
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Zapisywanie..." : isClientDashboard ? "Zapisz" : "Zapisz projekt"}
        </Button>
      </div>
    </form>
  );
}
