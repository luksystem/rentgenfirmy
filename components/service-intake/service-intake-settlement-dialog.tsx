"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, StackedDialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { buildServiceIntakeOfferHref } from "@/lib/service-intake/offer-link";
import {
  SERVICE_INTAKE_RESOLUTION_OUTCOME_LABELS,
  SERVICE_INTAKE_RESOLUTION_OUTCOMES,
  type ServiceIntakeRecord,
  type ServiceIntakeResolutionOutcome,
  type ServiceIntakeSettlementFeedback,
} from "@/lib/service-intake/types";

export function ServiceIntakeSettlementDialog({
  intake,
  open,
  onOpenChange,
  onSubmit,
}: {
  intake: ServiceIntakeRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: ServiceIntakeSettlementFeedback) => Promise<void>;
}) {
  const router = useRouter();
  const [resolutionOutcome, setResolutionOutcome] =
    useState<ServiceIntakeResolutionOutcome>("full");
  const [resolutionCause, setResolutionCause] = useState("");
  const [extraCosts, setExtraCosts] = useState(false);
  const [extraCostsNote, setExtraCostsNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !intake) {
      return;
    }
    setResolutionOutcome(intake.resolutionOutcome ?? "full");
    setResolutionCause(intake.resolutionCause ?? "");
    setExtraCosts(Boolean(intake.extraCosts));
    setExtraCostsNote(intake.extraCostsNote ?? "");
    setError(null);
  }, [open, intake]);

  /** Zapisuje feedback rozliczenia (przenosi zgłoszenie do "Rozliczanie"). Zwraca sukces. */
  async function submitFeedback(): Promise<boolean> {
    if (!resolutionCause.trim()) {
      setError("Podaj przyczynę / co było problemem.");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        resolutionOutcome,
        resolutionCause: resolutionCause.trim(),
        extraCosts,
        extraCostsNote: extraCostsNote.trim(),
      });
      return true;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się rozliczyć.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (await submitFeedback()) {
      onOpenChange(false);
    }
  }

  /** Najpierw zapisuje rozliczenie, dopiero potem przenosi do oferty — inaczej zgłoszenie zostawało w "W trakcie". */
  async function handleSubmitAndNavigate(href: string) {
    if (await submitFeedback()) {
      router.push(href);
    }
  }

  if (!intake) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <StackedDialogContent showCloseButton className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rozlicz: {intake.referenceNumber}</DialogTitle>
          <DialogDescription>
            Krótki feedback przed przeniesieniem do rozliczania.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Czy problem rozwiązany całkowicie?">
            <Select
              value={resolutionOutcome}
              onChange={(event) =>
                setResolutionOutcome(event.target.value as ServiceIntakeResolutionOutcome)
              }
            >
              {SERVICE_INTAKE_RESOLUTION_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {SERVICE_INTAKE_RESOLUTION_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Co było przyczyną?">
            <Textarea
              value={resolutionCause}
              onChange={(event) => setResolutionCause(event.target.value)}
              rows={3}
              placeholder="Krótki opis przyczyny / naprawy"
            />
          </Field>

          <Field label="Dodatkowe koszty?">
            <Select
              value={extraCosts ? "yes" : "no"}
              onChange={(event) => setExtraCosts(event.target.value === "yes")}
            >
              <option value="no">Nie</option>
              <option value="yes">Tak</option>
            </Select>
          </Field>

          {extraCosts ? (
            <div className="grid gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                ⚠ Koszty dodatkowe — nie zapomnij przygotować lub rozliczyć oferty
              </p>
              <Field label="Notatka o kosztach">
                <Textarea
                  value={extraCostsNote}
                  onChange={(event) => setExtraCostsNote(event.target.value)}
                  rows={2}
                  placeholder="Co dokładnie i dlaczego — trafi do opisu w szacowaniu AI nowej oferty"
                />
              </Field>
              {intake.serviceId ? (
                <Button
                  type="button"
                  className="justify-self-start"
                  disabled={saving}
                  onClick={() => void handleSubmitAndNavigate(`/oferty/${intake.serviceId}`)}
                >
                  {saving ? "Zapisywanie…" : "Rozlicz i otwórz ofertę"}
                </Button>
              ) : (
                <div className="grid gap-1.5 justify-items-start">
                  <Button
                    type="button"
                    className="justify-self-start"
                    disabled={saving}
                    onClick={() =>
                      void handleSubmitAndNavigate(
                        buildServiceIntakeOfferHref(intake, {
                          extraCosts: true,
                          extraCostsNote,
                        }),
                      )
                    }
                  >
                    {saving ? "Zapisywanie…" : "Rozlicz i utwórz ofertę — koszty dodatkowe"}
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  {extraCostsNote.trim() ? (
                    <p className="text-[11px] text-amber-100/80">
                      Notatka trafi do szacowania AI — oferta wstępnie wyceni się automatycznie.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? "Zapisywanie…" : "Rozlicz"}
            </Button>
          </div>
        </div>
      </StackedDialogContent>
    </Dialog>
  );
}
