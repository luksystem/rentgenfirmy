"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientPicker } from "@/components/client-picker";
import { ClientOfferPanel } from "@/components/service/client-offer-panel";
import { ClientOfferHistoryPanel } from "@/components/service/client-offer-history-panel";
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
import { useServiceDetailAutoRefresh } from "@/lib/hooks/use-service-detail-auto-refresh";
import {
  copyEstimateToActual,
  prepareServiceForActualStep,
} from "@/lib/service/copy-estimate-to-actual";
import { SERVICE_STATUSES, SERVICE_TYPES, type ServiceRecord } from "@/lib/service/types";
import { validateService } from "@/lib/service/validate";
import { cn, formatMoney } from "@/lib/utils";
import { buildServiceCosts, useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";

const QUOTE_STEPS = [
  { label: "Dane", full: "Dane klienta i zgłoszenia" },
  { label: "Stawki", full: "Stawki robocizny i dojazdu" },
  { label: "Koszty", full: "Przewidywane koszty przed wyjazdem" },
] as const;

const SETTLEMENT_STEPS = [
  { label: "Rzeczywiste", full: "Koszty rzeczywiste po serwisie" },
  { label: "Podsumowanie", full: "Porównanie i rozliczenie" },
] as const;

type MainTab = "quote" | "settlement" | "client" | "preview";

const MAIN_TABS: { id: MainTab; label: string; hint: string }[] = [
  { id: "quote", label: "Wycena", hint: "Dane, stawki i przewidywane koszty przed wyjazdem." },
  {
    id: "settlement",
    label: "Rozliczenie",
    hint: "Koszty po serwisie i porównanie z wyceną — uzupełnij po wykonaniu prac.",
  },
  { id: "client", label: "Klient", hint: "Link oferty, status odpowiedzi i historia." },
  { id: "preview", label: "Podgląd", hint: "Dokument wysyłany klientowi — PDF i druk." },
];

function stepForMainTab(tab: MainTab, currentStep: number) {
  switch (tab) {
    case "quote":
      return Math.min(currentStep, QUOTE_STEPS.length - 1);
    case "settlement":
      return Math.max(currentStep, QUOTE_STEPS.length);
    default:
      return currentStep;
  }
}

function clientTabBadge(service: ServiceRecord) {
  const status = service.clientOffer.status;
  if (status === "pending") {
    return "Oczekuje";
  }
  if (status === "negotiation") {
    return "Negocjacja";
  }
  if (status === "accepted") {
    return "Zaakceptowana";
  }
  if (status === "rejected") {
    return "Odrzucona";
  }
  if (service.clientOffer.token) {
    return "Link";
  }
  return null;
}

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
  const [mainTab, setMainTab] = useState<MainTab>("quote");
  const [step, setStep] = useState(0);
  const [withoutProject, setWithoutProject] = useState(!initialService.projectId);
  const [errors, setErrors] = useState<string[]>([]);

  useServiceDetailAutoRefresh(service, setService);

  const costs = useMemo(() => buildServiceCosts(service), [service]);
  const clientBadge = useMemo(() => clientTabBadge(service), [service]);

  const projectName = service.projectId
    ? projects.find((p) => p.id === service.projectId)?.name
    : undefined;

  const activeMainTab = MAIN_TABS.find((tab) => tab.id === mainTab)!;
  const quoteStepIndex = mainTab === "quote" ? step : -1;
  const settlementStepIndex = mainTab === "settlement" ? step - QUOTE_STEPS.length : -1;

  function switchMainTab(tab: MainTab) {
    setMainTab(tab);
    setStep(stepForMainTab(tab, step));
    setErrors([]);
  }

  function goToStep(nextStep: number) {
    if (nextStep === QUOTE_STEPS.length) {
      setService((current) => prepareServiceForActualStep(current));
      setMainTab("settlement");
    } else if (nextStep < QUOTE_STEPS.length) {
      setMainTab("quote");
    } else {
      setMainTab("settlement");
    }

    setStep(nextStep);
    setErrors([]);
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
      router.push("/oferty");
    } catch {
      setErrors(["Nie udało się zapisać oferty. Sprawdź połączenie z Supabase."]);
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
      setMainTab("settlement");
      setStep(QUOTE_STEPS.length + SETTLEMENT_STEPS.length - 1);
    } catch {
      setErrors(["Nie udało się rozliczyć oferty. Sprawdź połączenie z Supabase."]);
    }
  }

  const subSteps = mainTab === "quote" ? QUOTE_STEPS : mainTab === "settlement" ? SETTLEMENT_STEPS : [];
  const subStepIndex = mainTab === "quote" ? quoteStepIndex : settlementStepIndex;
  const subStepFullLabel =
    subStepIndex >= 0 && subSteps[subStepIndex] ? subSteps[subStepIndex].full : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="grid gap-5">
        <div className="sticky top-0 z-20 -mx-1 space-y-3 rounded-2xl border border-border/80 bg-background/95 p-3 backdrop-blur sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {service.title.trim() || "Nowa oferta"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                brutto wyceny{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(costs.estimate.grossTotal)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 xl:hidden">
              <span className="rounded-full border border-border px-2.5 py-1 text-xs tabular-nums text-muted">
                netto {formatMoney(costs.estimate.netTotal)}
              </span>
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto pb-0.5"
            aria-label="Sekcje oferty"
          >
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMainTab(tab.id)}
                className={cn(
                  "relative shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
                  mainTab === tab.id
                    ? "bg-accent-soft text-foreground ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.id === "client" && clientBadge ? (
                  <span className="ml-1.5 inline-flex rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {clientBadge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <p className="text-xs leading-relaxed text-muted">{activeMainTab.hint}</p>

          {(mainTab === "quote" || mainTab === "settlement") && subSteps.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
              {subSteps.map((item, index) => {
                const absoluteStep =
                  mainTab === "quote" ? index : QUOTE_STEPS.length + index;
                const isActive = subStepIndex === index;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => goToStep(absoluteStep)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      isActive
                        ? "border-foreground/20 bg-foreground/5 text-foreground"
                        : "border-border text-muted hover:border-border/80 hover:text-foreground",
                    )}
                  >
                    {index + 1}. {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {subStepFullLabel ? (
            <p className="text-xs font-medium text-foreground/80">{subStepFullLabel}</p>
          ) : null}
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

        {mainTab === "quote" && step === 0 ? (
          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
              <Field label="Tytuł oferty / zgłoszenia" className="sm:col-span-2">
                <Input
                  value={service.title}
                  onChange={(e) => setService({ ...service, title: e.target.value })}
                />
              </Field>
              <Field label="Typ oferty">
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
              <Field label="Status oferty">
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
                  Oferta bez projektu
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

        {mainTab === "quote" && step === 1 ? (
          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm text-muted">
                Stawki i progi stref możesz edytować globalnie w{" "}
                <Link href="/oferty/ustawienia" className="text-accent underline">
                  ustawieniach ofert
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

        {mainTab === "quote" && step === 2 ? (
          <Card>
            <CardContent className="py-5">
              <ServiceLineItemsForm
                title="Przewidywane koszty przed wyjazdem"
                items={service.estimate}
                zoneSettings={service.zoneSettings}
                onChange={(estimate) => setService({ ...service, estimate })}
              />
              <div className="mt-6 grid gap-4 border-t border-border/60 pt-6">
                <h3 className="text-sm font-semibold text-foreground">Rabaty przewidywanych kosztów</h3>
                <ServiceDiscountsForm
                  discounts={service.estimateDiscounts}
                  onChange={(estimateDiscounts) => setService({ ...service, estimateDiscounts })}
                />
              </div>
              <div className="mt-6 border-t border-border/60 pt-6">
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

        {mainTab === "settlement" && step === QUOTE_STEPS.length ? (
          <Card>
            <CardContent className="py-5">
              <ServiceLineItemsForm
                title="Koszty rzeczywiste po serwisie"
                items={service.actual}
                zoneSettings={service.zoneSettings}
                onChange={(actual) => setService({ ...service, actual })}
              />
              <div className="mt-6 grid gap-4 border-t border-border/60 pt-6">
                <h3 className="text-sm font-semibold text-foreground">Rabaty rozliczenia</h3>
                <ServiceDiscountsForm
                  discounts={service.actualDiscounts}
                  onChange={(actualDiscounts) => setService({ ...service, actualDiscounts })}
                />
              </div>
              <div className="mt-6 border-t border-border/60 pt-6">
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

        {mainTab === "settlement" && step === QUOTE_STEPS.length + 1 ? (
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

        {mainTab === "client" ? (
          <div className="grid gap-4">
            <ClientOfferPanel service={service} onServiceUpdated={setService} />
            <ClientOfferHistoryPanel service={service} />
          </div>
        ) : null}

        {mainTab === "preview" ? (
          <div className="grid gap-4">
            <Card>
              <CardContent className="py-4">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={service.detailedSettlement}
                    onChange={(event) =>
                      setService({ ...service, detailedSettlement: event.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                  />
                  <span>
                    <span className="font-medium text-foreground">Rozliczenie szczegółowe</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Pełne rozbicie kosztów w dokumencie dla klienta (pokaż szczegóły pozycji)
                    </span>
                  </span>
                </label>
              </CardContent>
            </Card>
            <ServiceReport service={service} projectName={projectName} />
          </div>
        ) : null}

        <div className="sticky bottom-0 z-20 -mx-1 rounded-2xl border border-border/80 bg-background/95 p-3 backdrop-blur sm:p-4">
          <div className="flex flex-wrap gap-2">
            {(mainTab === "quote" || mainTab === "settlement") && step > 0 ? (
              <Button type="button" variant="secondary" onClick={() => goToStep(step - 1)}>
                Wstecz
              </Button>
            ) : null}
            {(mainTab === "quote" || mainTab === "settlement") &&
            step < QUOTE_STEPS.length + SETTLEMENT_STEPS.length - 1 ? (
              <Button type="button" onClick={() => goToStep(step + 1)}>
                Dalej
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={isSaving} onClick={() => save()}>
              {isSaving ? "Zapisywanie…" : "Zapisz"}
            </Button>
            {mainTab === "settlement" || mainTab === "preview" ? (
              <Button type="button" disabled={isSaving} onClick={() => settle()}>
                Rozlicz ofertę
              </Button>
            ) : null}
            {mainTab === "quote" && step === QUOTE_STEPS.length - 1 ? (
              <Button type="button" variant="outline" onClick={() => switchMainTab("client")}>
                Wyślij klientowi →
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <SummaryCard estimate={costs.estimate} actual={costs.actual} className="hidden xl:block" />
    </div>
  );
}
