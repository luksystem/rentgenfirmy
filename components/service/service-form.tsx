"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientPicker } from "@/components/client-picker";
import { ServiceComparisonTable } from "@/components/service/service-comparison-table";
import { ServiceCostBreakdownPanel } from "@/components/service/service-cost-breakdown";
import { ServiceDiscountsForm } from "@/components/service/service-discounts-form";
import { ServiceLineItemsForm } from "@/components/service/service-line-items-form";
import { ServiceReport } from "@/components/service/service-report";
import { SummaryCard } from "@/components/service/summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  copyEstimateToActual,
  prepareServiceForActualStep,
} from "@/lib/service/copy-estimate-to-actual";
import { SERVICE_STATUSES, SERVICE_TYPES, type ServiceRecord } from "@/lib/service/types";
import { validateService } from "@/lib/service/validate";
import { cn } from "@/lib/utils";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";

const STEPS = [
  "Dane klienta i zgłoszenia",
  "Stawki",
  "Przewidywane koszty przed wyjazdem",
  "Koszty rzeczywiste",
  "Podsumowanie i raport",
] as const;

export function ServiceForm({
  initialService,
}: {
  initialService: ServiceRecord;
}) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const addClient = useAppStore((s) => s.addClient);
  const upsertService = useServiceStore((s) => s.upsertService);
  const isSaving = useServiceStore((s) => s.isSaving);

  const [service, setService] = useState(initialService);
  const [step, setStep] = useState(0);
  const [withoutProject, setWithoutProject] = useState(!initialService.projectId);
  const [errors, setErrors] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(true);

  const costs = useMemo(() => buildServiceCosts(service), [service]);

  const projectName = service.projectId
    ? projects.find((p) => p.id === service.projectId)?.name
    : undefined;

  function goToStep(nextStep: number) {
    if (nextStep === 3) {
      setService((current) => prepareServiceForActualStep(current));
    }

    setStep(nextStep);
  }

  async function save(statusOverride?: ServiceRecord["status"]) {
    const validationErrors = validateService(service);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: ServiceRecord = {
      ...service,
      updatedAt: new Date().toISOString(),
      status: statusOverride ?? service.status,
      projectId: withoutProject ? null : service.projectId,
    };

    try {
      await upsertService(payload);
      router.push("/serwis");
    } catch {
      setErrors(["Nie udało się zapisać serwisu. Sprawdź połączenie z Supabase."]);
    }
  }

  async function settle() {
    const prepared = copyEstimateToActual(service);
    const validationErrors = validateService(prepared);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: ServiceRecord = {
      ...prepared,
      updatedAt: new Date().toISOString(),
      status: "Rozliczony",
      projectId: withoutProject ? null : prepared.projectId,
    };

    try {
      const saved = await upsertService(payload);
      setService(saved);
      setErrors([]);
      setShowReport(true);
      setStep(4);
    } catch {
      setErrors(["Nie udało się rozliczyć serwisu. Sprawdź połączenie z Supabase."]);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(index)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                step === index
                  ? "border-accent/40 bg-accent-soft text-foreground"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {errors.length > 0 ? (
          <Card className="border-rose-500/30 bg-rose-500/10">
            <CardContent className="py-3 text-sm text-rose-300">
              <ul className="list-disc pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {step === 0 ? (
          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
              <Field label="Tytuł serwisu / zgłoszenia" className="sm:col-span-2">
                <Input
                  value={service.title}
                  onChange={(e) => setService({ ...service, title: e.target.value })}
                />
              </Field>
              <Field label="Typ serwisu">
                <Select
                  value={service.serviceType}
                  onChange={(e) =>
                    setService({
                      ...service,
                      serviceType: e.target.value as ServiceRecord["serviceType"],
                    })
                  }
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status serwisu">
                <Select
                  value={service.status}
                  onChange={(e) =>
                    setService({
                      ...service,
                      status: e.target.value as ServiceRecord["status"],
                    })
                  }
                >
                  {SERVICE_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </Select>
              </Field>

              <div className="sm:col-span-2">
                <ClientPicker
                  clients={clients}
                  clientId={service.clientId}
                  clientSnapshot={service.client}
                  onSelectClient={(clientId, snapshot) =>
                    setService({ ...service, clientId, client: snapshot })
                  }
                  onCreateClient={addClient}
                />
              </div>

              <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border/80 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={withoutProject}
                    onChange={(e) => setWithoutProject(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Serwis bez projektu
                </label>
                {!withoutProject ? (
                  <Field label="Projekt">
                    <Select
                      value={service.projectId ?? ""}
                      onChange={(e) =>
                        setService({ ...service, projectId: e.target.value || null })
                      }
                    >
                      <option value="">Wybierz projekt</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm text-muted">
                Stawki i progi stref możesz edytować globalnie w{" "}
                <Link href="/serwis/ustawienia" className="text-accent underline">
                  ustawieniach serwisu
                </Link>
                .
              </p>
              {(
                [
                  ["supervisionHourly", "Stawka godzinowa nadzoru"],
                  ["installerHourly", "Stawka godzinowa instalatora"],
                  ["helperHourly", "Stawka godzinowa pomocnika"],
                  ["programmerHourly", "Stawka godzinowa programisty"],
                  ["carPerKm", "Stawka auta za kilometr"],
                  ["carHourly", "Stawka godziny pracownika w aucie"],
                  ["accommodationCost", "Koszt noclegu"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <NumericInput
                    value={service.rates[key]}
                    onChange={(value) =>
                      setService({
                        ...service,
                        rates: { ...service.rates, [key]: value },
                      })
                    }
                  />
                </Field>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <CardContent className="py-5">
              <label className="mb-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={service.detailedSettlement}
                  onChange={(event) =>
                    setService({ ...service, detailedSettlement: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Rozliczenie szczegółowe (pełny rozbicie kosztów w raporcie)
              </label>
              <ServiceLineItemsForm
                title="Przewidywane koszty przed wyjazdem"
                items={service.estimate}
                zoneSettings={service.zoneSettings}
                onChange={(estimate) => setService({ ...service, estimate })}
              />
              <div className="mt-6 grid gap-4">
                <h3 className="text-sm font-semibold text-foreground">Rabaty przewidywanych kosztów</h3>
                <ServiceDiscountsForm
                  discounts={service.estimateDiscounts}
                  onChange={(estimateDiscounts) => setService({ ...service, estimateDiscounts })}
                />
              </div>
              <div className="mt-6">
                <ServiceCostBreakdownPanel
                  title="Podsumowanie przewidywanych kosztów"
                  breakdown={costs.estimate}
                  discounts={service.estimateDiscounts}
                  kilometerZone={costs.estimate.kilometerZone}
                  suggestedCarHours={costs.estimate.suggestedCarHoursFromZone}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <CardContent className="py-5">
              <ServiceLineItemsForm
                title="Koszty rzeczywiste po serwisie"
                items={service.actual}
                zoneSettings={service.zoneSettings}
                onChange={(actual) => setService({ ...service, actual })}
              />
              <div className="mt-6 grid gap-4">
                <h3 className="text-sm font-semibold text-foreground">Rabaty rozliczenia</h3>
                <ServiceDiscountsForm
                  discounts={service.actualDiscounts}
                  onChange={(actualDiscounts) => setService({ ...service, actualDiscounts })}
                />
              </div>
              <div className="mt-6">
                <ServiceCostBreakdownPanel
                  title="Podsumowanie rzeczywistych"
                  breakdown={costs.actual}
                  discounts={service.actualDiscounts}
                  kilometerZone={costs.actual.kilometerZone}
                  suggestedCarHours={costs.actual.suggestedCarHoursFromZone}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4">
            <ServiceComparisonTable
              estimate={costs.estimate}
              actual={costs.actual}
              estimateDiscounts={service.estimateDiscounts}
              actualDiscounts={service.actualDiscounts}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <ServiceCostBreakdownPanel
                title="Przewidywane koszty"
                breakdown={costs.estimate}
                discounts={service.estimateDiscounts}
                kilometerZone={costs.estimate.kilometerZone}
                suggestedCarHours={costs.estimate.suggestedCarHoursFromZone}
              />
              <ServiceCostBreakdownPanel
                title="Rzeczywiste"
                breakdown={costs.actual}
                discounts={service.actualDiscounts}
                kilometerZone={costs.actual.kilometerZone}
                suggestedCarHours={costs.actual.suggestedCarHoursFromZone}
              />
            </div>
          </div>
        ) : null}

        {showReport ? (
          <ServiceReport service={service} projectName={projectName} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={() => goToStep(step - 1)}>
              Wstecz
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => goToStep(step + 1)}>
              Dalej
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={isSaving} onClick={() => save()}>
            {isSaving ? "Zapisywanie…" : "Zapisz"}
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => settle()}>
            Rozlicz serwis
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowReport((value) => !value)}>
            {showReport ? "Ukryj podgląd" : "Pokaż podgląd"}
          </Button>
        </div>
      </div>

      <SummaryCard estimate={costs.estimate} actual={costs.actual} className="hidden xl:block" />
    </div>
  );
}
