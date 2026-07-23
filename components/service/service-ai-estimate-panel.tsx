"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ServiceCostBreakdownPanel } from "@/components/service/service-cost-breakdown";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  aggregateAiTaskHours,
  buildLineItemsFromAiEstimate,
} from "@/lib/service/apply-ai-estimate";
import type {
  ServiceAiEstimateProposal,
  ServiceAiEstimateRecord,
  ServiceAiRecognizedTask,
  ServiceAiTravelContext,
} from "@/lib/service/ai-estimate-types";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import type {
  ServiceCostBreakdown,
  ServiceDiscounts,
  ServiceLineItems,
  ServiceRates,
  KilometerZoneSettings,
  ServiceType,
} from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

type AiEstimateApiResponse = {
  proposal: ServiceAiEstimateProposal;
  travelContext: ServiceAiTravelContext;
  lineItemsPreview: ServiceLineItems;
  costBreakdown: ServiceCostBreakdown;
  referenceCasesUsed: number;
  projectContextUsed?: boolean;
  warrantyContextUsed?: boolean;
};

const WARRANTY_LABELS: Record<ServiceAiRecognizedTask["warrantyStatus"], string> = {
  warranty: "Gwarancyjne",
  paid: "Płatne",
  mixed: "Mieszane",
  unknown: "Niepewne",
};

function confidenceLabel(value: number) {
  if (value >= 0.75) {
    return "Wysoka";
  }
  if (value >= 0.5) {
    return "Średnia";
  }
  return "Niska";
}

function confidenceClass(value: number) {
  if (value >= 0.75) {
    return "text-emerald-600";
  }
  if (value >= 0.5) {
    return "text-amber-600";
  }
  return "text-rose-600";
}

function patchTask(
  tasks: ServiceAiRecognizedTask[],
  index: number,
  patch: Partial<ServiceAiRecognizedTask>,
) {
  return tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task));
}

function rebuildPreview(input: {
  proposal: ServiceAiEstimateProposal;
  travelContext: ServiceAiTravelContext;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  discounts: ServiceDiscounts;
}) {
  const lineItemsPreview = buildLineItemsFromAiEstimate({
    proposal: input.proposal,
    travelContext: input.travelContext,
  });
  const costBreakdown = calculateServiceCost(
    lineItemsPreview,
    input.rates,
    input.zoneSettings,
    input.discounts,
  );
  return { lineItemsPreview, costBreakdown };
}

export function ServiceAiEstimatePanel({
  description: initialDescription,
  autoRunOnMount = false,
  serviceType,
  clientId,
  projectId,
  clientLocation,
  rates,
  zoneSettings,
  discounts,
  existingRecord,
  onApply,
}: {
  description?: string;
  /** Uruchom szacowanie automatycznie po zamontowaniu (np. notatka o kosztach dodatkowych ze zgłoszenia). */
  autoRunOnMount?: boolean;
  serviceType: ServiceType;
  clientId: string | null;
  projectId?: string | null;
  clientLocation: string;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  discounts: ServiceDiscounts;
  existingRecord?: ServiceAiEstimateRecord | null;
  onApply: (payload: {
    estimate: ServiceLineItems;
    aiEstimate: ServiceAiEstimateRecord;
    titleHint?: string;
  }) => void;
}) {
  const [description, setDescription] = useState(
    initialDescription ?? existingRecord?.description ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ServiceAiEstimateProposal | null>(
    existingRecord?.proposal ?? null,
  );
  const [travelContext, setTravelContext] = useState<ServiceAiTravelContext | null>(
    existingRecord?.travelContext ?? null,
  );
  const [referenceCasesUsed, setReferenceCasesUsed] = useState(0);
  const [projectContextUsed, setProjectContextUsed] = useState(false);
  const [warrantyContextUsed, setWarrantyContextUsed] = useState(false);
  const [editing, setEditing] = useState(!existingRecord?.appliedAt);
  const autoRunTriggeredRef = useRef(false);

  useEffect(() => {
    if (!autoRunOnMount || autoRunTriggeredRef.current) {
      return;
    }
    if (existingRecord || !initialDescription?.trim()) {
      return;
    }
    autoRunTriggeredRef.current = true;
    void runEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uruchom raz po zamontowaniu z notatką z linku zgłoszenia
  }, []);

  const preview = useMemo(() => {
    if (!proposal || !travelContext) {
      return null;
    }
    return rebuildPreview({ proposal, travelContext, rates, zoneSettings, discounts });
  }, [proposal, travelContext, rates, zoneSettings, discounts]);

  const hourTotals = useMemo(() => {
    if (!proposal) {
      return null;
    }
    return aggregateAiTaskHours(proposal.recognizedTasks);
  }, [proposal]);

  async function runEstimate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/service-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          serviceType,
          clientId,
          projectId: projectId ?? undefined,
          clientLocation,
        }),
      });

      const payload = (await response.json()) as AiEstimateApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować szacunku.");
      }

      setProposal(payload.proposal);
      setTravelContext(payload.travelContext);
      setReferenceCasesUsed(payload.referenceCasesUsed);
      setProjectContextUsed(Boolean(payload.projectContextUsed));
      setWarrantyContextUsed(Boolean(payload.warrantyContextUsed));
      setEditing(true);
    } catch (estimateError) {
      setError(
        estimateError instanceof Error ? estimateError.message : "Nie udało się oszacować prac.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleTaskChange(index: number, patch: Partial<ServiceAiRecognizedTask>) {
    if (!proposal) {
      return;
    }
    setProposal({
      ...proposal,
      recognizedTasks: patchTask(proposal.recognizedTasks, index, patch),
    });
  }

  function handleReject() {
    setProposal(null);
    setTravelContext(null);
    setError(null);
    setEditing(true);
  }

  function handleApply() {
    if (!proposal || !travelContext || !preview) {
      return;
    }

    const now = new Date().toISOString();
    const aiEstimate: ServiceAiEstimateRecord = {
      createdAt: existingRecord?.createdAt ?? now,
      description,
      proposal,
      travelContext,
      appliedAt: now,
      appliedLineItems: preview.lineItemsPreview,
      calculatedCosts: preview.costBreakdown,
      variance: existingRecord?.variance ?? null,
    };

    onApply({
      estimate: preview.lineItemsPreview,
      aiEstimate,
      titleHint: proposal.recognizedTasks.map((task) => task.name).slice(0, 2).join(", "),
    });
    setEditing(false);
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="page-section-title text-base font-semibold">Szacowanie AI</h3>
          <p className="mt-1 text-sm text-muted">
            Opisz zgłoszenie — AI zaproponuje orientacyjne godziny i dojazd. Kwoty liczy aplikacja
            ze stawek. Propozycja wymaga zatwierdzenia.
            {projectId ? " Uwzględniana jest specyfikacja i wdrożenie wybranego projektu." : ""}
          </p>
        </div>
        {existingRecord?.appliedAt ? (
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-border">
            Zastosowano {new Date(existingRecord.appliedAt).toLocaleString("pl-PL")}
          </span>
        ) : null}
      </div>

      <Field label="Opis prac / zgłoszenia">
        <Textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Np. Klient zgłasza, że nie działa kamera, chce dołożyć Access Point w garażu…"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading || !description.trim()} onClick={() => void runEstimate()}>
          {loading ? "Szacowanie…" : "Oszacuj z AI"}
        </Button>
        {proposal ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Edytuj przed zastosowaniem
            </Button>
            <Button type="button" variant="ghost" onClick={handleReject}>
              Odrzuć
            </Button>
          </>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {proposal && preview && travelContext ? (
        <div className="grid gap-4 border-t border-border/60 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted">{proposal.summary}</p>
            <p className={cn("font-semibold", confidenceClass(proposal.confidence))}>
              Pewność: {Math.round(proposal.confidence * 100)}% ({confidenceLabel(proposal.confidence)})
            </p>
          </div>

          {referenceCasesUsed > 0 ? (
            <p className="text-xs text-muted">
              Uwzględniono {referenceCasesUsed} podobnych rozliczeń historycznych.
            </p>
          ) : null}

          {projectContextUsed ? (
            <p className="text-xs text-muted">
              Uwzględniono specyfikację projektu, ustalenia z klientem i zadania wdrożenia.
            </p>
          ) : null}

          {warrantyContextUsed ? (
            <p className="text-xs text-muted">
              Uwzględniono status gwarancji projektu — podział prac gwarancyjnych i płatnych w
              podsumowaniu wymaga weryfikacji.
            </p>
          ) : null}

          {travelContext.geocodeNote ? (
            <p className="rounded-lg bg-background/80 px-3 py-2 text-xs text-muted ring-1 ring-border/70">
              {travelContext.geocodeNote}
              {travelContext.geocoded
                ? ` · ${travelContext.oneWayDistanceKm} km w jedną stronę · ${travelContext.resolvedTrips} wyjazd(y) · ${travelContext.resolvedOvernights} nocleg(i).`
                : null}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border/80">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Zadanie</th>
                  <th className="px-2 py-2">Inst.</th>
                  <th className="px-2 py-2">Pom.</th>
                  <th className="px-2 py-2">Prog. u kl.</th>
                  <th className="px-2 py-2">Prog. zdal.</th>
                  <th className="px-2 py-2">Nadz.</th>
                  <th className="px-3 py-2">Uwagi</th>
                </tr>
              </thead>
              <tbody>
                {proposal.recognizedTasks.map((task, index) => (
                  <tr key={`${task.name}-${index}`} className="border-t border-border/60">
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium text-foreground">{task.name}</p>
                      <p className="text-xs text-muted">
                        {WARRANTY_LABELS[task.warrantyStatus]}
                        {task.requiresTrip ? " · wymaga wyjazdu" : ""}
                      </p>
                    </td>
                    {(
                      [
                        ["installerHours", task.installerHours],
                        ["helperHours", task.helperHours],
                        ["programmerOnsiteHours", task.programmerOnsiteHours],
                        ["programmerRemoteHours", task.programmerRemoteHours],
                        ["supervisorHours", task.supervisorHours],
                      ] as const
                    ).map(([key, value]) => (
                      <td key={key} className="px-2 py-2 align-top">
                        <NumericInput
                          className="w-16"
                          value={value}
                          disabled={!editing}
                          onChange={(next) => handleTaskChange(index, { [key]: next })}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 align-top text-xs text-muted">{task.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hourTotals ? (
            <p className="text-sm text-muted">
              Suma godzin: instalator {hourTotals.installerHours} · pomocnik {hourTotals.helperHours}{" "}
              · programista u klienta {hourTotals.programmerOnsiteHours} · programista zdalnie{" "}
              {hourTotals.programmerRemoteHours} · nadzór {hourTotals.supervisorHours}
            </p>
          ) : null}

          {proposal.materials.length > 0 ? (
            <div className="grid gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium text-foreground">Sprzęt / materiały (orientacyjnie)</p>
              {proposal.materials.map((item) => (
                <div key={item.name}>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted">
                    {item.estimatedNetPriceMin}–{item.estimatedNetPriceMax} zł netto · pewność{" "}
                    {Math.round(item.confidence * 100)}%
                    {item.verificationRequired ? " · do weryfikacji" : ""}
                  </p>
                  {item.notes ? <p className="text-xs text-muted">{item.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {proposal.questions.length > 0 ? (
            <div className="rounded-xl border border-border/80 bg-background/60 p-3 text-sm">
              <p className="mb-2 font-medium">Pytania doprecyzowujące</p>
              <ul className="list-disc space-y-1 pl-5 text-muted">
                {proposal.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {proposal.riskFlags.length > 0 ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 text-sm text-rose-700">
              {proposal.riskFlags.map((flag) => (
                <p key={flag}>⚠ {flag}</p>
              ))}
            </div>
          ) : null}

          <ServiceCostBreakdownPanel
            title="Podsumowanie kosztów (ze stawek aplikacji)"
            breakdown={preview.costBreakdown}
            discounts={discounts}
            kilometerZone={preview.costBreakdown.kilometerZone}
            suggestedCarHours={preview.costBreakdown.suggestedCarHoursFromZone}
          />

          <p className="text-xs text-muted">
            Dojazd: {formatMoney(preview.costBreakdown.categories.car)} · czas w aucie:{" "}
            {formatMoney(preview.costBreakdown.categories.carHours)} · noclegi:{" "}
            {formatMoney(preview.costBreakdown.categories.accommodations)} · materiały (orient.):{" "}
            {formatMoney(preview.costBreakdown.categories.materials)}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleApply}>
              Zastosuj do rozliczenia
            </Button>
          </div>
        </div>
      ) : null}

      {existingRecord?.variance ? (
        <div className="rounded-xl border border-border/80 bg-background/70 p-3 text-sm">
          <p className="font-medium text-foreground">Porównanie szacunku AI z rozliczeniem</p>
          <p className="mt-1 text-muted">{existingRecord.variance.summary}</p>
        </div>
      ) : null}
    </div>
  );
}
