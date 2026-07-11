"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CommercialPartyPicker, type CommercialPartyKind } from "@/components/commercial-party-picker";
import { ClientOfferPanel } from "@/components/service/client-offer-panel";
import { ClientOfferHistoryPanel } from "@/components/service/client-offer-history-panel";
import { OfferValidityField } from "@/components/service/offer-validity-field";
import { ServiceAiEstimatePanel } from "@/components/service/service-ai-estimate-panel";
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
import { ServiceOptionalItemsForm } from "@/components/service/service-optional-items-form";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { ServiceFixedPriceTablesForm } from "@/components/service/service-fixed-price-tables-form";
import { ServiceMaterialItemsForm } from "@/components/service/service-material-items-form";
import { SettlementOfferPanel } from "@/components/service/settlement-offer-panel";
import { useServiceDetailAutoRefresh } from "@/lib/hooks/use-service-detail-auto-refresh";
import { buildCombinedBilling } from "@/lib/service/optional-items";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";
import {
  copyEstimateToActual,
  isActualPristine,
  prepareServiceForActualStep,
} from "@/lib/service/copy-estimate-to-actual";
import { finalizeAiEstimateOnSettle } from "@/lib/service/finalize-ai-estimate-on-settle";
import { isServiceSettled } from "@/lib/service/report-document";
import { syncLineItemsMaterialsCost } from "@/lib/service/material-items";
import { createServiceFormSnapshot } from "@/lib/service/service-form-snapshot";
import {
  SERVICE_PRICING_MODELS,
  SERVICE_STATUSES,
  SERVICE_TYPES,
  type ServiceRecord,
} from "@/lib/service/types";
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

function initialMainTab(service: ServiceRecord): MainTab {
  if (isServiceSettled(service)) {
    return "settlement";
  }
  return "quote";
}

function initialStep(service: ServiceRecord) {
  if (isServiceSettled(service)) {
    return QUOTE_STEPS.length + SETTLEMENT_STEPS.length - 1;
  }
  return 0;
}

function ViewSwitchBar({
  title,
  variant,
  children,
  columnsClassName,
  mobileScroll = false,
}: {
  title: string;
  variant: "primary" | "secondary";
  children: ReactNode;
  columnsClassName: string;
  mobileScroll?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2 sm:p-2.5 min-w-0 max-w-full",
        variant === "primary"
          ? "border-accent/35 bg-accent/12 shadow-sm shadow-accent/5"
          : "border-border/90 bg-surface-muted/90",
      )}
    >
      <p
        className={cn(
          "mb-2 hidden px-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:block",
          variant === "primary" ? "text-accent" : "text-muted",
        )}
      >
        {title}
      </p>
      <div
        className={cn(
          "grid gap-1.5 min-w-0 max-w-full",
          mobileScroll ? cn("grid-cols-2 sm:grid", columnsClassName) : columnsClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ViewSwitchButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-10 w-full items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold leading-tight transition sm:min-h-10 sm:px-2 sm:text-sm",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
          : "text-muted hover:bg-background/60 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ServiceForm({
  initialService,
}: {
  initialService: ServiceRecord;
}) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const contacts = useAppStore((s) => s.contacts);
  const addClient = useAppStore((s) => s.addClient);
  const addContact = useAppStore((s) => s.addContact);
  const upsertService = useServiceStore((s) => s.upsertService);
  const isSaving = useServiceStore((s) => s.isSaving);

  const [service, setService] = useState(initialService);
  const [partyKind, setPartyKind] = useState<CommercialPartyKind>(() =>
    initialService.contactId && !initialService.clientId ? "contact" : "client",
  );
  const [mainTab, setMainTab] = useState<MainTab>(() => initialMainTab(initialService));
  const [step, setStep] = useState(() => initialStep(initialService));
  const [withoutProject, setWithoutProject] = useState(!initialService.projectId);
  const [errors, setErrors] = useState<string[]>([]);
  const [settleSuccess, setSettleSuccess] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    createServiceFormSnapshot(initialService, !initialService.projectId),
  );
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const [isLeaveSaving, setIsLeaveSaving] = useState(false);

  const markSaved = useCallback((saved: ServiceRecord, savedWithoutProject: boolean) => {
    setSavedSnapshot(createServiceFormSnapshot(saved, savedWithoutProject));
  }, []);

  const handleRemoteSync = useCallback(
    (synced: ServiceRecord) => {
      markSaved(synced, withoutProject);
    },
    [markSaved, withoutProject],
  );

  useServiceDetailAutoRefresh(service, setService, handleRemoteSync);

  const costs = useMemo(() => buildServiceCosts(service), [service]);
  const quoteBilling = useMemo(
    () => buildCombinedBilling(service, costs.estimate),
    [costs.estimate, service],
  );
  const settlementBilling = useMemo(
    () => buildCombinedBilling(service, costs.actual),
    [costs.actual, service],
  );
  const clientBadge = useMemo(() => clientTabBadge(service), [service]);
  const settled = isServiceSettled(service);
  const isFixedPrice = service.pricingModel === "fixed_price";
  const isOfferLocked = service.clientOffer.status === "accepted";
  const clientProjects = useMemo(
    () =>
      service.clientId
        ? projects
            .filter((project) => project.clientId === service.clientId)
            .sort((a, b) => a.name.localeCompare(b.name, "pl"))
        : [],
    [projects, service.clientId],
  );
  const quoteSteps = useMemo(
    () => (isFixedPrice ? QUOTE_STEPS.filter((step) => step.label !== "Stawki") : [...QUOTE_STEPS]),
    [isFixedPrice],
  );
  const quoteStepCount = quoteSteps.length;
  const clientHasProjects = clientProjects.length > 0;

  useEffect(() => {
    if (partyKind === "client" && clientHasProjects && withoutProject) {
      setWithoutProject(false);
    }
  }, [partyKind, clientHasProjects, withoutProject]);

  const visibleMainTabs = useMemo(
    () => MAIN_TABS.filter((tab) => !(isFixedPrice && tab.id === "settlement")),
    [isFixedPrice],
  );
  const isDirty = useMemo(
    () => createServiceFormSnapshot(service, withoutProject) !== savedSnapshot,
    [savedSnapshot, service, withoutProject],
  );

  const handleAttemptLeave = useCallback((href: string) => {
    setPendingLeaveHref(href);
  }, []);

  useUnsavedChangesGuard(isDirty, handleAttemptLeave);

  const projectName = service.projectId
    ? projects.find((p) => p.id === service.projectId)?.name
    : undefined;

  const activeMainTab = visibleMainTabs.find((tab) => tab.id === mainTab) ?? visibleMainTabs[0]!;
  const quoteStepIndex = mainTab === "quote" ? step : -1;
  const settlementStepIndex = mainTab === "settlement" ? step - QUOTE_STEPS.length : -1;

  function switchMainTab(tab: MainTab) {
    if (tab === "settlement") {
      setService((current) => prepareServiceForActualStep(current));
    }
    setMainTab(tab);
    setStep(stepForMainTab(tab, step));
    setErrors([]);
    setSettleSuccess(false);
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

  async function persistOffer(redirectTo?: string | null) {
    const validationErrors = validateService(service);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return false;
    }

    const payload: ServiceRecord = {
      ...service,
      updatedAt: new Date().toISOString(),
      status: service.status,
      projectId: withoutProject ? null : service.projectId,
    };

    try {
      const saved = await upsertService(payload);
      setService(saved);
      markSaved(saved, withoutProject);
      setSettleSuccess(false);
      setErrors([]);
      if (redirectTo) {
        router.push(redirectTo);
      }
      return true;
    } catch {
      setErrors(["Nie udało się zapisać oferty. Sprawdź połączenie z Supabase."]);
      return false;
    }
  }

  async function save() {
    await persistOffer("/oferty");
  }

  async function settle() {
    const prepared = isActualPristine(service) ? copyEstimateToActual(service) : service;
    const validationErrors = validateService(prepared);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSettleSuccess(false);
      return;
    }

    const payload: ServiceRecord = finalizeAiEstimateOnSettle({
      ...prepared,
      updatedAt: new Date().toISOString(),
      status: "Rozliczony",
      projectId: withoutProject ? null : prepared.projectId,
    });

    try {
      const saved = await upsertService(payload);
      setService(saved);
      markSaved(saved, withoutProject);
      setErrors([]);
      setSettleSuccess(true);
      setMainTab("preview");
      setStep(QUOTE_STEPS.length + SETTLEMENT_STEPS.length - 1);
    } catch {
      setSettleSuccess(false);
      setErrors(["Nie udało się rozliczyć oferty. Sprawdź połączenie z Supabase."]);
    }
  }

  function handleServiceUpdated(updated: ServiceRecord) {
    setService(updated);
    markSaved(updated, withoutProject);
    setSettleSuccess(false);
  }

  async function handleLeaveSave() {
    if (!pendingLeaveHref) {
      return;
    }

    setIsLeaveSaving(true);
    const saved = await persistOffer(pendingLeaveHref);
    setIsLeaveSaving(false);
    if (saved) {
      setPendingLeaveHref(null);
    }
  }

  function handleLeaveWithoutSaving() {
    if (!pendingLeaveHref) {
      return;
    }

    const href = pendingLeaveHref;
    setPendingLeaveHref(null);
    router.push(href);
  }

  const subSteps = mainTab === "quote" ? quoteSteps : mainTab === "settlement" ? SETTLEMENT_STEPS : [];
  const subStepIndex = mainTab === "quote" ? quoteStepIndex : settlementStepIndex;
  const subStepFullLabel =
    subStepIndex >= 0 && subSteps[subStepIndex] ? subSteps[subStepIndex].full : null;

  return (
    <>
      {pendingLeaveHref ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <Card className="w-full max-w-md border-border shadow-2xl">
            <CardContent className="grid gap-4 py-5">
              <div>
                <p className="text-base font-semibold text-foreground">Niezapisane zmiany</p>
                <p className="mt-1 text-sm text-muted">
                  Oferta ma zmiany, których jeszcze nie zapisano. Co chcesz zrobić?
                </p>
              </div>
              <div className="grid gap-2">
                <Button type="button" disabled={isLeaveSaving || isSaving} onClick={() => void handleLeaveSave()}>
                  {isLeaveSaving || isSaving ? "Zapisywanie…" : "Zapisz i wyjdź"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isLeaveSaving || isSaving}
                  onClick={handleLeaveWithoutSaving}
                >
                  Wyjdź bez zapisu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLeaveSaving || isSaving}
                  onClick={() => setPendingLeaveHref(null)}
                >
                  Anuluj
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

    <div className="grid w-full min-w-0 max-w-full gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 max-w-full gap-5 pb-2">
        <div className="sticky top-16 z-10 min-w-0 max-w-full space-y-2 overflow-hidden rounded-2xl border border-border/80 bg-background/95 p-2 backdrop-blur sm:space-y-2.5 sm:p-3 xl:top-0 xl:z-20 xl:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                {service.title.trim() || "Nowa oferta"}
              </p>
              <p className="mt-0.5 hidden text-xs text-muted sm:block">
                {settled ? (
                  <>
                    brutto rozliczenia{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(settlementBilling.grossTotal)}
                    </span>
                    <span className="mx-1.5 text-border">·</span>
                    wycena {formatMoney(quoteBilling.grossTotal)}
                  </>
                ) : (
                  <>
                    brutto wyceny{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(quoteBilling.grossTotal)}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-muted sm:hidden">
                {formatMoney(settled ? settlementBilling.grossTotal : quoteBilling.grossTotal)} brutto
              </p>
            </div>
            <div className="shrink-0 xl:hidden">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] tabular-nums text-muted sm:px-2.5 sm:text-xs">
                {formatMoney(settled ? settlementBilling.netTotal : quoteBilling.netTotal)} netto
              </span>
            </div>
          </div>

          <ViewSwitchBar
            title="Widok oferty"
            variant="primary"
            mobileScroll
            columnsClassName="sm:grid-cols-4"
          >
            {visibleMainTabs.map((tab) => (
              <ViewSwitchButton
                key={tab.id}
                active={mainTab === tab.id}
                onClick={() => switchMainTab(tab.id)}
                className={cn(tab.id === "client" && clientBadge && "flex-col gap-1 py-2.5")}
              >
                <span>{tab.label}</span>
                {tab.id === "client" && clientBadge ? (
                  <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                    {clientBadge}
                  </span>
                ) : null}
              </ViewSwitchButton>
            ))}
          </ViewSwitchBar>

          <p className="hidden rounded-lg border border-border/60 bg-surface-muted/40 px-3 py-2 text-xs leading-relaxed text-muted sm:block">
            {activeMainTab.hint}
          </p>

          {(mainTab === "quote" || mainTab === "settlement") && subSteps.length > 0 ? (
            <ViewSwitchBar
              title={mainTab === "quote" ? "Kroki wyceny" : "Kroki rozliczenia"}
              variant="secondary"
              mobileScroll
              columnsClassName={
                mainTab === "quote"
                  ? isFixedPrice
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-3"
                  : "sm:grid-cols-2"
              }
            >
              {subSteps.map((item, index) => {
                const absoluteStep =
                  mainTab === "quote"
                    ? isFixedPrice
                      ? index === 0
                        ? 0
                        : 2
                      : index
                    : QUOTE_STEPS.length + index;
                const isActive = subStepIndex === index;

                return (
                  <ViewSwitchButton
                    key={item.label}
                    active={isActive}
                    onClick={() => goToStep(absoluteStep)}
                  >
                    {item.label}
                  </ViewSwitchButton>
                );
              })}
            </ViewSwitchBar>
          ) : null}

          {subStepFullLabel ? (
            <p className="hidden text-xs font-medium text-foreground/80 sm:block">{subStepFullLabel}</p>
          ) : null}
        </div>

        {settleSuccess ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="py-3 text-sm text-emerald-200">
              Oferta rozliczona i zapisana — nie musisz klikać „Zapisz”. Możesz jeszcze edytować
              koszty rzeczywiste, wtedy użyj „Zapisz rozliczenie”.
              {!isFixedPrice ? (
                <span className="mt-2 block">
                  Wyślij klientowi link rozliczenia w zakładce „Klient” — po akceptacji zlecenie
                  zostanie zaktualizowane kosztami rzeczywistymi.
                </span>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

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

        {isOfferLocked && mainTab === "quote" ? (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="py-3 text-sm text-amber-100">
              Klient zaakceptował tę ofertę — stawki i przewidywane koszty są zablokowane, aby
              wycena zgadzała się z tym, co klient zaakceptował. Rzeczywiste koszty uzupełnij w
              zakładce „Rozliczenie”.
            </CardContent>
          </Card>
        ) : null}

        {mainTab === "quote" && step === 0 ? (
          <Card className="min-w-0 overflow-hidden">
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
              <Field label="Model wyceny">
                <Select
                  value={service.pricingModel}
                  disabled={isOfferLocked}
                  onChange={(e) => {
                    const pricingModel = e.target.value as ServiceRecord["pricingModel"];
                    setService({
                      ...service,
                      pricingModel,
                      fixedPriceTables:
                        pricingModel === "fixed_price" && service.fixedPriceTables.length === 0
                          ? []
                          : service.fixedPriceTables,
                    });
                    if (pricingModel === "fixed_price") {
                      setMainTab("quote");
                    }
                  }}
                >
                  {SERVICE_PRICING_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model === "hourly" ? "Według stawek godzinowych" : "Fixed price (ryczałt)"}
                    </option>
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
                <CommercialPartyPicker
                  mode="offer"
                  partyKind={partyKind}
                  onPartyKindChange={(kind) => {
                    setPartyKind(kind);
                    setWithoutProject(!service.projectId);
                    if (kind === "client") {
                      setService({ ...service, contactId: null, projectId: null });
                    } else {
                      setService({ ...service, clientId: null, projectId: null });
                    }
                  }}
                  clients={clients}
                  contacts={contacts}
                  clientId={service.clientId}
                  contactId={service.contactId}
                  partySnapshot={service.client}
                  onSelectClient={(clientId, snapshot) =>
                    setService({ ...service, clientId, contactId: null, client: snapshot, projectId: null })
                  }
                  onSelectContact={(contactId, snapshot) =>
                    setService({ ...service, contactId, clientId: null, client: snapshot, projectId: null })
                  }
                  onCreateClient={addClient}
                  onCreateContact={addContact}
                />
              </div>

              <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border/80 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={withoutProject}
                    disabled={partyKind === "client" && clientHasProjects}
                    onChange={(e) => {
                      setWithoutProject(e.target.checked);
                      if (e.target.checked) {
                        setService({ ...service, projectId: null });
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  Oferta bez projektu
                </label>
                {partyKind === "client" && clientHasProjects && withoutProject ? (
                  <p className="text-xs text-amber-200">
                    Ten klient ma przypisane projekty — wybierz projekt z listy poniżej.
                  </p>
                ) : null}
                {!withoutProject ? (
                  <ProjectSelectSearchable
                    projects={clientProjects}
                    clients={clients}
                    value={service.projectId}
                    onChange={(projectId) => setService({ ...service, projectId })}
                    emptyLabel="Wybierz projekt klienta"
                    disabled={!service.clientId}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mainTab === "quote" && step === 1 && !isFixedPrice ? (
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
              <fieldset disabled={isOfferLocked} className="contents">
                <p className="sm:col-span-2 text-sm text-muted">
                  Stawki i progi stref możesz edytować globalnie w{" "}
                  <Link href="/oferty/ustawienia" className="text-accent underline">
                    ustawieniach stawek serwisu
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
              </fieldset>
            </CardContent>
          </Card>
        ) : null}

        {mainTab === "quote" && step === 2 ? (
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="py-5">
              <fieldset disabled={isOfferLocked} className="contents">
                {isFixedPrice ? (
                  <ServiceFixedPriceTablesForm
                    tables={service.fixedPriceTables}
                    defaultVat={service.estimateDiscounts.vatRate}
                    onChange={(fixedPriceTables) => setService({ ...service, fixedPriceTables })}
                    disabled={isOfferLocked}
                  />
                ) : (
                  <>
                <ServiceAiEstimatePanel
                  serviceType={service.serviceType}
                  clientId={service.clientId}
                  projectId={withoutProject ? null : service.projectId}
                  clientLocation={service.client.location}
                  rates={service.rates}
                  zoneSettings={service.zoneSettings}
                  discounts={service.estimateDiscounts}
                  existingRecord={service.aiEstimate}
                  onApply={({ estimate, aiEstimate, titleHint }) => {
                    setService({
                      ...service,
                      estimate,
                      aiEstimate,
                      title: service.title.trim() || titleHint || service.title,
                    });
                  }}
                />
                <div className="mt-6 border-t border-border/60 pt-6">
                <ServiceLineItemsForm
                  title="Przewidywane koszty przed wyjazdem"
                  items={service.estimate}
                  zoneSettings={service.zoneSettings}
                  serviceId={service.id}
                  onChange={(estimate) =>
                    setService({ ...service, estimate: syncLineItemsMaterialsCost(estimate) })
                  }
                  disabled={isOfferLocked}
                />
                </div>
                <div className="mt-6 border-t border-border/60 pt-6">
                  <ServiceMaterialItemsForm
                    items={service.estimate.materialItems}
                    disabled={isOfferLocked}
                    onChange={(materialItems) =>
                      setService({
                        ...service,
                        estimate: syncLineItemsMaterialsCost({
                          ...service.estimate,
                          materialItems,
                        }),
                      })
                    }
                  />
                </div>
                <div className="mt-6 grid gap-4 border-t border-border/60 pt-6">
                  <h3 className="text-sm font-semibold text-foreground">Rabaty przewidywanych kosztów</h3>
                  <ServiceDiscountsForm
                    discounts={service.estimateDiscounts}
                    onChange={(estimateDiscounts) => setService({ ...service, estimateDiscounts })}
                  />
                </div>
                <div className="mt-6 border-t border-border/60 pt-6">
                  <ServiceOptionalItemsForm
                    items={service.optionalItems}
                    mode="edit"
                    onChange={(optionalItems) => setService({ ...service, optionalItems })}
                  />
                </div>
                  </>
                )}
              </fieldset>
              <div className="mt-6 border-t border-border/60 pt-6">
                <ServiceCostBreakdownPanel
                  title="Podsumowanie przewidywanych kosztów"
                  breakdown={costs.estimate}
                  discounts={service.estimateDiscounts}
                  kilometerZone={costs.estimate.kilometerZone}
                  suggestedCarHours={costs.estimate.suggestedCarHoursFromZone}
                />
                {quoteBilling.optional.grossTotal > 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    Po wyborze klienta pozycje opcjonalne mogą doliczyć do{" "}
                    <span className="font-semibold text-foreground">
                      +{formatMoney(quoteBilling.optional.grossTotal)} brutto
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mainTab === "settlement" && !isFixedPrice && step === QUOTE_STEPS.length ? (
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="py-5">
              <ServiceLineItemsForm
                title="Koszty rzeczywiste po serwisie"
                items={service.actual}
                zoneSettings={service.zoneSettings}
                serviceId={service.id}
                showWarrantyHours
                onChange={(actual) =>
                  setService({ ...service, actual: syncLineItemsMaterialsCost(actual) })
                }
              />
              <div className="mt-6 border-t border-border/60 pt-6">
                <ServiceMaterialItemsForm
                  items={service.actual.materialItems}
                  onChange={(materialItems) =>
                    setService({
                      ...service,
                      actual: syncLineItemsMaterialsCost({
                        ...service.actual,
                        materialItems,
                      }),
                    })
                  }
                />
              </div>
              <div className="mt-6 grid gap-4 border-t border-border/60 pt-6">
                <h3 className="text-sm font-semibold text-foreground">Rabaty rozliczenia</h3>
                <ServiceDiscountsForm
                  discounts={service.actualDiscounts}
                  onChange={(actualDiscounts) => setService({ ...service, actualDiscounts })}
                />
              </div>
              <div className="mt-6 border-t border-border/60 pt-6">
                <ServiceOptionalItemsForm
                  items={service.optionalItems}
                  mode="settlement"
                  onChange={(optionalItems) => setService({ ...service, optionalItems })}
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
                {settlementBilling.optional.grossTotal > 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    W rozliczeniu uwzględniono pozycje opcjonalne:{" "}
                    <span className="font-semibold text-foreground">
                      +{formatMoney(settlementBilling.optional.grossTotal)} brutto
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mainTab === "settlement" && !isFixedPrice && step === QUOTE_STEPS.length + 1 ? (
          <div className="grid gap-4">
            {service.showEstimateComparison ? (
              <ServiceComparisonTable
                estimate={costs.estimate}
                actual={costs.actual}
                estimateDiscounts={service.estimateDiscounts}
                actualDiscounts={service.actualDiscounts}
              />
            ) : null}
            {service.aiEstimate?.variance ? (
              <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 text-sm">
                <h3 className="font-semibold text-foreground">Analiza szacunku AI vs rozliczenie</h3>
                <p className="mt-2 text-muted">{service.aiEstimate.variance.summary}</p>
                <p className="mt-2 text-xs text-muted">
                  Szacunek netto: {formatMoney(service.aiEstimate.variance.estimateNetTotal)} ·
                  rozliczenie netto: {formatMoney(service.aiEstimate.variance.actualNetTotal)} ·
                  odchylenie: {service.aiEstimate.variance.netDeltaPercent >= 0 ? "+" : ""}
                  {service.aiEstimate.variance.netDeltaPercent}%
                </p>
              </div>
            ) : null}
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
            <OfferValidityField service={service} onChange={setService} />
            <ClientOfferPanel service={service} onServiceUpdated={handleServiceUpdated} />
            <SettlementOfferPanel service={service} onServiceUpdated={handleServiceUpdated} />
            <ClientOfferHistoryPanel service={service} />
          </div>
        ) : null}

        {mainTab === "preview" ? (
          <div className="grid min-w-0 max-w-full gap-4">
            <Card>
              <CardContent className="grid gap-4 py-4">
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
                    <span className="font-medium text-foreground">Pokaż szczegóły</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Pełne rozbicie kosztów w dokumencie (pokaż szczegóły pozycji)
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={service.showEstimateComparison}
                    onChange={(event) =>
                      setService({
                        ...service,
                        showEstimateComparison: event.target.checked,
                      })
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                  />
                  <span>
                    <span className="font-medium text-foreground">Pokaż porównanie z wyceną</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      W rozliczeniu pokaż przewidywane koszty obok rzeczywistych. Odznacz przy
                      rozliczeniu powykonawczym bez wyceny.
                    </span>
                  </span>
                </label>
              </CardContent>
            </Card>
            <div className="min-w-0 max-w-full overflow-hidden">
              <ServiceReport service={service} projectName={projectName} />
            </div>
          </div>
        ) : null}

        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-20 min-w-0 max-w-full rounded-xl border border-border/80 bg-background/95 p-2 backdrop-blur sm:p-3 xl:bottom-0">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            {(mainTab === "quote" || mainTab === "settlement") && step > 0 ? (
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => goToStep(step - 1)}>
                Wstecz
              </Button>
            ) : null}
            {(mainTab === "quote" || mainTab === "settlement") &&
            step < QUOTE_STEPS.length + SETTLEMENT_STEPS.length - 1 ? (
              <Button type="button" className="w-full sm:w-auto" onClick={() => goToStep(step + 1)}>
                Dalej
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={isSaving} className="w-full sm:w-auto" onClick={() => save()}>
              {isSaving ? "Zapisywanie…" : settled ? "Zapisz rozliczenie" : "Zapisz"}
            </Button>
            {!settled && !isFixedPrice && (mainTab === "settlement" || mainTab === "preview") ? (
              <Button type="button" disabled={isSaving} className="col-span-2 w-full sm:col-span-1 sm:w-auto" onClick={() => void settle()}>
                {isSaving ? "Zapisywanie…" : "Rozlicz i zapisz"}
              </Button>
            ) : null}
            {mainTab === "quote" && step === quoteStepCount - 1 ? (
              <Button type="button" variant="outline" className="col-span-2 w-full sm:col-span-1 sm:w-auto" onClick={() => switchMainTab("client")}>
                Wyślij klientowi →
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <SummaryCard estimate={costs.estimate} actual={costs.actual} className="hidden xl:block" />
    </div>
    </>
  );
}
