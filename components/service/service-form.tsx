"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ServiceComparisonTable } from "@/components/service/service-comparison-table";
import { ServiceCostBreakdownPanel } from "@/components/service/service-cost-breakdown";
import { ServiceLineItemsForm } from "@/components/service/service-line-items-form";
import { ServiceReport } from "@/components/service/service-report";
import { SummaryCard } from "@/components/service/summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { VAT_RATES, SERVICE_STATUSES, SERVICE_TYPES, type ServiceRecord } from "@/lib/service/types";
import { validateService } from "@/lib/service/validate";
import { cn } from "@/lib/utils";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";

const STEPS = [
  "Dane klienta i zgłoszenia",
  "Stawki i rabaty",
  "Estymacja przed wyjazdem",
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
      const saved = await upsertService(payload);
      router.push("/serwis");
      return saved;
    } catch {
      setErrors(["Nie udało się zapisać serwisu. Sprawdź połączenie z Supabase."]);
    }
  }

  async function settle() {
    const validationErrors = validateService(service);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: ServiceRecord = {
      ...service,
      updatedAt: new Date().toISOString(),
      status: "Rozliczony",
      projectId: withoutProject ? null : service.projectId,
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
              onClick={() => setStep(index)}
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
              <Field label="Imię i nazwisko klienta">
                <Input
                  value={service.client.fullName}
                  onChange={(e) =>
                    setService({
                      ...service,
                      client: { ...service.client, fullName: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Obiekt / lokalizacja">
                <Input
                  value={service.client.location}
                  onChange={(e) =>
                    setService({
                      ...service,
                      client: { ...service.client, location: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={service.client.email}
                  onChange={(e) =>
                    setService({
                      ...service,
                      client: { ...service.client, email: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Telefon">
                <Input
                  value={service.client.phone}
                  onChange={(e) =>
                    setService({
                      ...service,
                      client: { ...service.client, phone: e.target.value },
                    })
                  }
                />
              </Field>

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
                Stawki i progi stref możesz też edytować globalnie w{" "}
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

              <Field label="Próg strefy 1 (km w jedną stronę)">
                <NumericInput
                  decimals={false}
                  value={service.zoneSettings.zone1ThresholdKm}
                  onChange={(value) =>
                    setService({
                      ...service,
                      zoneSettings: {
                        ...service.zoneSettings,
                        zone1ThresholdKm: value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Próg strefy 2">
                <NumericInput
                  decimals={false}
                  value={service.zoneSettings.zone2ThresholdKm}
                  onChange={(value) =>
                    setService({
                      ...service,
                      zoneSettings: {
                        ...service.zoneSettings,
                        zone2ThresholdKm: value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Próg strefy 3">
                <NumericInput
                  decimals={false}
                  value={service.zoneSettings.zone3ThresholdKm}
                  onChange={(value) =>
                    setService({
                      ...service,
                      zoneSettings: {
                        ...service.zoneSettings,
                        zone3ThresholdKm: value,
                      },
                    })
                  }
                />
              </Field>

              <Field label="Rabat procentowy %">
                <NumericInput
                  value={service.discounts.percentDiscount}
                  onChange={(value) =>
                    setService({
                      ...service,
                      discounts: {
                        ...service.discounts,
                        percentDiscount: Math.min(100, value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Rabat specjalny PLN">
                <NumericInput
                  value={service.discounts.specialDiscountPln}
                  onChange={(value) =>
                    setService({
                      ...service,
                      discounts: {
                        ...service.discounts,
                        specialDiscountPln: value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Stawka VAT">
                <Select
                  value={service.discounts.vatRate}
                  onChange={(e) =>
                    setService({
                      ...service,
                      discounts: {
                        ...service.discounts,
                        vatRate: Number(e.target.value) as ServiceRecord["discounts"]["vatRate"],
                      },
                    })
                  }
                >
                  {VAT_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </Select>
              </Field>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <CardContent className="py-5">
              <ServiceLineItemsForm
                title="Estymacja przed wyjazdem"
                items={service.estimate}
                zoneSettings={service.zoneSettings}
                onChange={(estimate) => setService({ ...service, estimate })}
              />
              <div className="mt-6">
                <ServiceCostBreakdownPanel
                  title="Podsumowanie estymacji"
                  breakdown={costs.estimate}
                  discounts={service.discounts}
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
              <div className="mt-6">
                <ServiceCostBreakdownPanel
                  title="Podsumowanie rzeczywistych"
                  breakdown={costs.actual}
                  discounts={service.discounts}
                  kilometerZone={costs.actual.kilometerZone}
                  suggestedCarHours={costs.actual.suggestedCarHoursFromZone}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4">
            <ServiceComparisonTable estimate={costs.estimate} actual={costs.actual} />
            <div className="grid gap-4 lg:grid-cols-2">
              <ServiceCostBreakdownPanel
                title="Estymacja"
                breakdown={costs.estimate}
                discounts={service.discounts}
                kilometerZone={costs.estimate.kilometerZone}
                suggestedCarHours={costs.estimate.suggestedCarHoursFromZone}
              />
              <ServiceCostBreakdownPanel
                title="Rzeczywiste"
                breakdown={costs.actual}
                discounts={service.discounts}
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
            <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
              Wstecz
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
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
