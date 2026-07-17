"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import {
  defaultStageTitleFromTemplate,
  stageTitlesFromTemplate,
} from "@/lib/process/stage-helpers";
import {
  defaultFlowStatus,
  blockerReasonNames,
  flowStatusNames,
  isClosedFlowStatus,
  isWaitingFlowStatus,
  pickOption,
  type FieldOptions,
} from "@/lib/field-options";
import { priorities, type Project, type ProjectInput } from "@/lib/types";
import { computeWarrantyEndsAt, formatProjectDuration, formatWarrantyEndDate } from "@/lib/project/warranty";
import { projectCreatedAtToDateInput } from "@/lib/supabase/mappers";
import { toISODate } from "@/lib/utils";
import {
  applyWaitingPriority,
  countWaitingFlags,
  priorityFromWaitingFlags,
} from "@/lib/waiting-priority";
import { zodStringOption } from "@/lib/zod-helpers";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

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
  createdAt: string;
};

function createSchema(options: FieldOptions, stageOptions: string[]) {
  return z
    .object({
      name: z.string().min(2, "Podaj nazwę projektu"),
      clientId: z.string().optional(),
      isActive: z.boolean(),
      type: zodStringOption(options.projectTypes, "Wybierz typ projektu"),
      flowStatus: zodStringOption(flowStatusNames(options), "Wybierz status przepływu"),
      stage: zodStringOption(stageOptions, "Wybierz etap"),
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
      createdAt: z.string().min(1, "Podaj datę utworzenia projektu"),
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

export function projectToFormValues(
  project: Project,
  options: FieldOptions,
  stageOptions: string[],
): FormValues {
  return {
    name: project.name,
    clientId: project.clientId ?? "",
    isActive: project.isActive,
    type: pickOption(project.type, options.projectTypes, "Dom"),
    flowStatus: pickOption(project.flowStatus, flowStatusNames(options), defaultFlowStatus(options)),
    stage: pickOption(
      project.stage,
      stageOptions,
      defaultStageTitleFromTemplate(null) || stageOptions[0] || project.stage,
    ),
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
    createdAt: projectCreatedAtToDateInput(project.createdAt),
  };
}

function createDefaultValues(
  options: FieldOptions,
  stageOptions: string[],
  defaultStage: string,
): FormValues {
  return {
    name: "",
    clientId: "",
    isActive: true,
    type: pickOption(undefined, options.projectTypes, "Dom"),
    flowStatus: defaultFlowStatus(options),
    stage: pickOption(undefined, stageOptions, defaultStage),
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
    createdAt: toISODate(new Date()),
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
  defaultClientId,
  isSaving = false,
  onSubmit,
  onCancel,
  variant = "full",
  hideCancel = false,
}: {
  project?: Project;
  defaultClientId?: string;
  isSaving?: boolean;
  onSubmit: (project: ProjectInput) => void | Promise<void>;
  onCancel: () => void;
  variant?: "full" | "client-dashboard";
  hideCancel?: boolean;
}) {
  const isClientDashboard = variant === "client-dashboard";
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const autoDetectActiveProjects = useAppStore(
    (state) => state.projectActivitySettings.autoDetectActiveProjects,
  );
  const clients = useAppStore((state) => state.clients);
  const addClient = useAppStore((state) => state.addClient);
  const templates = useProcessStore((state) => state.templates);
  const projectProcesses = useProcessStore((state) => state.projectProcesses);
  const ensureTemplateForProjectType = useProcessStore((state) => state.ensureTemplateForProjectType);
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);
  const [stageTemplateReady, setStageTemplateReady] = useState(false);

  const resolveStageTemplate = useCallback(
    (projectType: string) => {
      if (project) {
        const process = projectProcesses[project.id];
        const liveTemplate = templates.find((template) => template.projectType === projectType);
        return process
          ? resolveAnchoredProcessTemplate(process, liveTemplate)
          : (liveTemplate ?? null);
      }

      return templates.find((template) => template.projectType === projectType) ?? null;
    },
    [project, projectProcesses, templates],
  );

  const initialType = project?.type ?? pickOption(undefined, fieldOptions.projectTypes, "Dom");
  const initialTemplate = resolveStageTemplate(initialType);
  const initialStageOptions = stageTitlesFromTemplate(initialTemplate);
  const initialDefaultStage = defaultStageTitleFromTemplate(initialTemplate);

  const schema = useMemo(
    () => createSchema(fieldOptions, initialStageOptions.length ? initialStageOptions : [initialDefaultStage]),
    [fieldOptions, initialDefaultStage, initialStageOptions],
  );

  const defaultValues = useMemo(() => {
    const stageOptions = initialStageOptions.length ? initialStageOptions : [initialDefaultStage];
    const base = project
      ? projectToFormValues(project, fieldOptions, stageOptions)
      : createDefaultValues(fieldOptions, stageOptions, initialDefaultStage);
    if (!project && defaultClientId) {
      return { ...base, clientId: defaultClientId };
    }
    return base;
  }, [project, fieldOptions, defaultClientId, initialDefaultStage, initialStageOptions]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues,
  });

  const projectType = useWatch({ control, name: "type" });
  const flowStatus = useWatch({ control, name: "flowStatus" });
  const clientId = useWatch({ control, name: "clientId" });
  const waitingDependsOnUs = useWatch({ control, name: "waitingDependsOnUs" });
  const waitingIncreasesCostLater = useWatch({ control, name: "waitingIncreasesCostLater" });
  const waitingBlocksSettlement = useWatch({ control, name: "waitingBlocksSettlement" });
  const systemHandoverAt = useWatch({ control, name: "systemHandoverAt" });
  const warrantyDurationMonths = useWatch({ control, name: "warrantyDurationMonths" });
  const createdAt = useWatch({ control, name: "createdAt" });
  const isActiveValue = useWatch({ control, name: "isActive" });
  const durationPreview = formatProjectDuration({
    createdAt: createdAt ? `${createdAt.slice(0, 10)}T12:00:00.000Z` : "",
  });
  const safeWarrantyMonths =
    typeof warrantyDurationMonths === "number" && Number.isFinite(warrantyDurationMonths)
      ? warrantyDurationMonths
      : undefined;

  const stageTemplate = useMemo(
    () => resolveStageTemplate(projectType),
    [projectType, resolveStageTemplate],
  );
  const stageOptions = useMemo(() => {
    const titles = stageTitlesFromTemplate(stageTemplate);
    return titles.length ? titles : [defaultStageTitleFromTemplate(stageTemplate)];
  }, [stageTemplate]);

  useEffect(() => {
    let cancelled = false;

    async function ensureStageTemplate() {
      if (!projectType) {
        return;
      }

      try {
        if (project) {
          await ensureProjectProcess(project.id, projectType);
        } else {
          await ensureTemplateForProjectType(projectType);
        }
      } finally {
        if (!cancelled) {
          setStageTemplateReady(true);
        }
      }
    }

    setStageTemplateReady(false);
    void ensureStageTemplate();

    return () => {
      cancelled = true;
    };
  }, [ensureProjectProcess, ensureTemplateForProjectType, project, projectType]);

  useEffect(() => {
    if (!stageTemplateReady || stageOptions.length === 0) {
      return;
    }

    const currentStage = getValues("stage");
    if (!stageOptions.includes(currentStage)) {
      setValue("stage", stageOptions[0]);
    }
  }, [getValues, stageOptions, stageTemplateReady, setValue]);

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
        ? {
            createdAt: values.createdAt || undefined,
          }
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
            createdAt: values.createdAt || undefined,
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

      {autoDetectActiveProjects ? (
        <div className="panel-success rounded-xl border p-4">
          <p className="text-sm font-semibold text-foreground">
            Aktywny — ustawiane automatycznie
          </p>
          <p className="mt-1 text-sm text-muted">
            W ustawieniach włączono automatyczne wykrywanie. Projekt jest{" "}
            <span className="font-medium text-foreground">
              {isActiveValue ? "aktywny" : "nieaktywny"}
            </span>{" "}
            na podstawie aktywności w widoku klienta (zmiany, ustalenia, oferty, czas pracy,
            dokumenty) w oknie ok. miesiąca — bez ręcznego przełączania.
          </p>
        </div>
      ) : (
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
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Status przepływu" error={errors.flowStatus?.message}>
          <Select {...register("flowStatus")}>
            {flowStatusNames(fieldOptions).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
        </Field>
        <Field label="Etap" error={errors.stage?.message}>
          <Select {...register("stage")} disabled={!stageTemplateReady}>
            {stageOptions.map((stage) => (
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

      {isClientDashboard ? (
        <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-4">
          <p className="mb-3 text-sm font-semibold">Czas trwania projektu</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Data utworzenia projektu" error={errors.createdAt?.message}>
              <Input type="date" {...register("createdAt")} />
            </Field>
            <Field label="Czas trwania (od utworzenia)">
              <Input value={durationPreview} readOnly disabled />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">
            Liczba dni kalendarzowych od daty utworzenia projektu do dziś. Gwarancję ustawisz w
            sekcji HOME.
          </p>
        </div>
      ) : null}

      {!isClientDashboard ? (
      <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-4">
        <p className="mb-3 text-sm font-semibold">Gwarancja</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Data utworzenia projektu" error={errors.createdAt?.message}>
            <Input type="date" {...register("createdAt")} />
          </Field>
          <Field label="Czas trwania projektu">
            <Input value={durationPreview} readOnly disabled />
          </Field>
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
          Czas trwania liczony jest w dniach kalendarzowych od daty utworzenia projektu do dziś.
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
