"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { ProjectSatisfactionSummaryCard } from "@/components/dashboard/project-satisfaction-summary-card";
import { StarRatingInput } from "@/components/dashboard/star-rating-input";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import {
  FULFILLMENT_STATUS_LABELS,
  type FulfillmentStatus,
  type ProjectSatisfactionBundle,
  type ReviewSide,
} from "@/lib/dashboard/satisfaction-types";
import { cn } from "@/lib/utils";
import { useProjectSatisfactionStore } from "@/store/project-satisfaction-store";

const EMPTY_BUNDLE: ProjectSatisfactionBundle = {
  agreementFulfillments: [],
  specificationFulfillments: [],
  stageSatisfactions: [],
  overview: null,
};

const STATUS_OPTIONS: Array<{
  status: FulfillmentStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { status: "met", label: "Spełnione", icon: Check, tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { status: "partial", label: "Częściowo", icon: Minus, tone: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
  { status: "not_met", label: "Niespełnione", icon: X, tone: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
];

function FulfillmentStatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: FulfillmentStatus;
  disabled?: boolean;
  onChange: (status: FulfillmentStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.status;
        return (
          <button
            key={option.status}
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
              active ? option.tone : "border-border/70 text-muted hover:border-accent/30",
              disabled && "cursor-not-allowed opacity-60",
            )}
            onClick={() => onChange(option.status)}
          >
            <Icon className="h-3 w-3" />
            {option.label}
          </button>
        );
      })}
      {value === "pending" ? (
        <span className="self-center text-[11px] text-muted">Wybierz status spełnienia</span>
      ) : null}
    </div>
  );
}

export function ProjectSatisfactionPanel({
  projectId,
  agreements,
  specificationItems,
  authorName,
  authorSide,
  seedBundle,
}: {
  projectId: string;
  agreements: ProjectClientAgreement[];
  specificationItems: ProjectSpecificationItem[];
  authorName: string;
  authorSide: ReviewSide;
  seedBundle?: ProjectSatisfactionBundle;
}) {
  const bundle = useProjectSatisfactionStore(
    (state) => state.byProject[projectId] ?? seedBundle ?? EMPTY_BUNDLE,
  );
  const loading = useProjectSatisfactionStore((state) => state.loadingProjects[projectId]);
  const ensureSatisfaction = useProjectSatisfactionStore((state) => state.ensureSatisfaction);
  const seedSatisfaction = useProjectSatisfactionStore((state) => state.seedSatisfaction);
  const saveAgreementFulfillment = useProjectSatisfactionStore((state) => state.saveAgreementFulfillment);
  const saveSpecificationFulfillment = useProjectSatisfactionStore(
    (state) => state.saveSpecificationFulfillment,
  );
  const saveOverview = useProjectSatisfactionStore((state) => state.saveOverview);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [expectationScore, setExpectationScore] = useState<number>(0);
  const [realityScore, setRealityScore] = useState<number>(0);
  const [overallNote, setOverallNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seedBundle) {
      seedSatisfaction(projectId, seedBundle);
    }
    void ensureSatisfaction(projectId, { force: seedBundle !== undefined });
  }, [ensureSatisfaction, projectId, seedBundle, seedSatisfaction]);

  useEffect(() => {
    setExpectationScore(bundle.overview?.expectationScore ?? 0);
    setRealityScore(bundle.overview?.realityScore ?? 0);
    setOverallNote(bundle.overview?.overallNote ?? "");
  }, [bundle.overview]);

  const reviewableAgreements = useMemo(
    () =>
      agreements.filter(
        (entry) => entry.status === "accepted" || entry.status === "pending_client" || entry.status === "rejected",
      ),
    [agreements],
  );

  function getAgreementStatus(agreementId: string): FulfillmentStatus {
    return (
      bundle.agreementFulfillments.find((entry) => entry.agreementId === agreementId)?.status ?? "pending"
    );
  }

  function getAgreementNote(agreementId: string): string {
    return bundle.agreementFulfillments.find((entry) => entry.agreementId === agreementId)?.note ?? "";
  }

  function getSpecStatus(specId: string): FulfillmentStatus {
    return (
      bundle.specificationFulfillments.find((entry) => entry.specificationItemId === specId)?.status ??
      "pending"
    );
  }

  function getSpecNote(specId: string): string {
    return (
      bundle.specificationFulfillments.find((entry) => entry.specificationItemId === specId)?.note ?? ""
    );
  }

  async function handleAgreementChange(agreementId: string, status: FulfillmentStatus, note?: string) {
    setSavingId(`agreement-${agreementId}`);
    setError(null);
    try {
      await saveAgreementFulfillment(projectId, {
        agreementId,
        status,
        note: note ?? getAgreementNote(agreementId),
        reviewedByName: authorName,
        reviewedBySide: authorSide,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać oceny ustaleń.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSpecChange(specId: string, status: FulfillmentStatus, note?: string) {
    setSavingId(`spec-${specId}`);
    setError(null);
    try {
      await saveSpecificationFulfillment(projectId, {
        specificationItemId: specId,
        status,
        note: note ?? getSpecNote(specId),
        reviewedByName: authorName,
        reviewedBySide: authorSide,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać oceny specyfikacji.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveOverview() {
    setOverviewSaving(true);
    setError(null);
    try {
      await saveOverview(projectId, {
        expectationScore: expectationScore > 0 ? expectationScore : null,
        realityScore: realityScore > 0 ? realityScore : null,
        overallNote,
        reviewedByName: authorName,
        reviewedBySide: authorSide,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać oceny projektu.");
    } finally {
      setOverviewSaving(false);
    }
  }

  if (loading && !bundle.agreementFulfillments.length && !bundle.stageSatisfactions.length) {
    return <p className="text-sm text-muted">Ładowanie ocen…</p>;
  }

  return (
    <div className="grid min-w-0 gap-6">
      <ProjectSatisfactionSummaryCard bundle={bundle} />

      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Weryfikacja ustaleń</h3>
          <p className="text-xs text-muted">
            Przy przekazaniu instalacji odhacz, czy ustalenia zostały spełnione zgodnie z oczekiwaniami.
          </p>
        </div>

        {reviewableAgreements.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-surface-muted/20 px-3 py-2 text-sm text-muted">
            Brak ustaleń do weryfikacji.
          </p>
        ) : (
          <div className="grid gap-3">
            {reviewableAgreements.map((agreement) => {
              const status = getAgreementStatus(agreement.id);
              const note = getAgreementNote(agreement.id);
              const isSaving = savingId === `agreement-${agreement.id}`;

              return (
                <div
                  key={agreement.id}
                  className="rounded-xl border border-border/70 bg-surface-muted/10 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{agreement.title}</p>
                      {agreement.body ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{agreement.body}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {FULFILLMENT_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <FulfillmentStatusPicker
                    value={status}
                    disabled={isSaving}
                    onChange={(next) => void handleAgreementChange(agreement.id, next, note)}
                  />
                  <Field label="Uwagi (opcjonalnie)" className="mt-2">
                    <Textarea
                      value={note}
                      disabled={isSaving}
                      rows={2}
                      placeholder="Co zostało spełnione, a co wymaga poprawy?"
                      onChange={(event) => {
                        const nextNote = event.target.value;
                        if (status !== "pending") {
                          void handleAgreementChange(agreement.id, status, nextNote);
                        }
                      }}
                      onBlur={(event) => {
                        const nextStatus = getAgreementStatus(agreement.id);
                        if (nextStatus !== "pending") {
                          void handleAgreementChange(agreement.id, nextStatus, event.target.value);
                        }
                      }}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Weryfikacja specyfikacji</h3>
          <p className="text-xs text-muted">
            Sprawdź, czy elementy specyfikacji odpowiadają temu, co zostało zrealizowane.
          </p>
        </div>

        {specificationItems.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-surface-muted/20 px-3 py-2 text-sm text-muted">
            Brak pozycji specyfikacji do weryfikacji.
          </p>
        ) : (
          <div className="grid gap-3">
            {specificationItems.map((item) => {
              const status = getSpecStatus(item.id);
              const note = getSpecNote(item.id);
              const isSaving = savingId === `spec-${item.id}`;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-surface-muted/10 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {FULFILLMENT_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <FulfillmentStatusPicker
                    value={status}
                    disabled={isSaving}
                    onChange={(next) => void handleSpecChange(item.id, next, note)}
                  />
                  <Field label="Uwagi (opcjonalnie)" className="mt-2">
                    <Textarea
                      value={note}
                      disabled={isSaving}
                      rows={2}
                      onBlur={(event) => {
                        const nextStatus = getSpecStatus(item.id);
                        if (nextStatus !== "pending") {
                          void handleSpecChange(item.id, nextStatus, event.target.value);
                        }
                      }}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-xl border border-accent/25 bg-accent/5 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ocena projektu: oczekiwania vs rzeczywistość</h3>
          <p className="text-xs text-muted">
            Podsumuj ogólne wrażenie z wdrożenia — przed rozpoczęciem i po zakończeniu.
          </p>
        </div>

        <Field label="Oczekiwania przed projektem (0–10)">
          <StarRatingInput value={expectationScore} onChange={setExpectationScore} disabled={overviewSaving} />
        </Field>

        <Field label="Rzeczywistość po wdrożeniu (0–10)">
          <StarRatingInput value={realityScore} onChange={setRealityScore} disabled={overviewSaving} />
        </Field>

        <Field label="Podsumowanie (opcjonalnie)">
          <Textarea
            value={overallNote}
            disabled={overviewSaving}
            rows={3}
            placeholder="Co najbardziej Cię zaskoczyło? Co możemy poprawić?"
            onChange={(event) => setOverallNote(event.target.value)}
          />
        </Field>

        <Button
          type="button"
          size="sm"
          className="w-fit"
          disabled={overviewSaving}
          onClick={() => void handleSaveOverview()}
        >
          {overviewSaving ? "Zapisywanie…" : "Zapisz ocenę projektu"}
        </Button>
      </section>

      {bundle.stageSatisfactions.length > 0 ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-foreground">Oceny etapów procesu</h3>
          <div className="grid gap-2">
            {bundle.stageSatisfactions.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-border/70 bg-surface-muted/10 px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">{entry.stageTitle}</p>
                <p className="mt-1 text-xs text-muted">
                  Ocena: {entry.score}/10
                  {entry.bestAspect ? ` · Najlepsze: ${entry.bestAspect}` : ""}
                  {entry.worstAspect ? ` · Do poprawy: ${entry.worstAspect}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
