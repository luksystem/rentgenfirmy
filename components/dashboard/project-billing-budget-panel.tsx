"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AgreementCostFields } from "@/components/dashboard/agreement-cost-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  CONTRACT_QUOTA_UNIT_LABELS,
  CONTRACT_QUOTA_UNITS,
  DEFAULT_AGREEMENT_VAT_RATE,
  emptyBillingSettings,
  normalizeAgreementVatRate,
  type ContractQuotaUnit,
  type ProjectContractQuota,
  type ProjectContractQuotaInput,
} from "@/lib/settlements/types";
import type { TimeCategory } from "@/lib/time-tracking/types";
import { useProjectSettlementStore } from "@/store/project-settlement-store";

export function ProjectBillingBudgetPanel({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  actorName?: string;
  readOnly?: boolean;
}) {
  const bundle = useProjectSettlementStore((state) => state.byProject[projectId]);
  const loading = useProjectSettlementStore((state) => state.loadingProjects[projectId]);
  const ensureSettlements = useProjectSettlementStore((state) => state.ensureSettlements);
  const saveBillingSettings = useProjectSettlementStore((state) => state.saveBillingSettings);
  const addQuota = useProjectSettlementStore((state) => state.addQuota);
  const updateQuota = useProjectSettlementStore((state) => state.updateQuota);
  const removeQuota = useProjectSettlementStore((state) => state.removeQuota);

  const settings = bundle?.settings ?? emptyBillingSettings(projectId);
  const quotas = bundle?.quotas ?? [];

  const [fixedPriceEnabled, setFixedPriceEnabled] = useState(settings.fixedPriceEnabled);
  const [hourlyEnabled, setHourlyEnabled] = useState(settings.hourlyEnabled);
  const [contractNet, setContractNet] = useState<number | null>(settings.contractAmountNet);
  const [contractVat, setContractVat] = useState(
    normalizeAgreementVatRate(settings.contractVatRate ?? DEFAULT_AGREEMENT_VAT_RATE),
  );
  const [hourlyRateNet, setHourlyRateNet] = useState<string>(
    settings.hourlyRateNet != null ? String(settings.hourlyRateNet) : "",
  );
  const [notes, setNotes] = useState(settings.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<TimeCategory[]>([]);

  const [quotaLabel, setQuotaLabel] = useState("");
  const [quotaQty, setQuotaQty] = useState("0");
  const [quotaUnit, setQuotaUnit] = useState<ContractQuotaUnit>("hours");
  const [quotaNotes, setQuotaNotes] = useState("");
  const [quotaCategoryId, setQuotaCategoryId] = useState("");

  useEffect(() => {
    void ensureSettlements(projectId, { sync: !readOnly, force: false }).catch(() => undefined);
  }, [ensureSettlements, projectId, readOnly]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/time-tracking/meta", { credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          meta?: { categories?: TimeCategory[] };
        };
        if (!cancelled && response.ok) {
          setCategories(payload.meta?.categories ?? []);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bundle?.settings) {
      return;
    }
    setFixedPriceEnabled(bundle.settings.fixedPriceEnabled);
    setHourlyEnabled(bundle.settings.hourlyEnabled);
    setContractNet(bundle.settings.contractAmountNet);
    setContractVat(
      normalizeAgreementVatRate(bundle.settings.contractVatRate ?? DEFAULT_AGREEMENT_VAT_RATE),
    );
    setHourlyRateNet(
      bundle.settings.hourlyRateNet != null ? String(bundle.settings.hourlyRateNet) : "",
    );
    setNotes(bundle.settings.notes);
  }, [bundle?.settings]);

  async function handleSaveSettings() {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const rateRaw = hourlyRateNet.trim() ? Number(hourlyRateNet) : null;
      await saveBillingSettings(projectId, {
        fixedPriceEnabled,
        hourlyEnabled,
        contractAmountNet: contractNet,
        contractVatRate: contractVat,
        hourlyRateNet: rateRaw != null && Number.isFinite(rateRaw) ? rateRaw : null,
        notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać budżetu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddQuota() {
    if (readOnly || !quotaLabel.trim()) return;
    if (quotaUnit === "hours" && !quotaCategoryId) {
      setError("Dla godzin wybierz kategorię czasu pracy.");
      return;
    }
    setError(null);
    await addQuota(projectId, {
      label: quotaLabel.trim(),
      quantity: Number(quotaQty) || 0,
      unit: quotaUnit,
      notes: quotaNotes.trim(),
      timeCategoryId: quotaUnit === "hours" ? quotaCategoryId : null,
    });
    setQuotaLabel("");
    setQuotaQty("0");
    setQuotaNotes("");
    setQuotaCategoryId("");
  }

  if (loading && !bundle) {
    return <p className="text-sm text-muted">Ładowanie budżetu…</p>;
  }

  return (
    <div className="grid min-w-0 max-w-full gap-6 overflow-x-hidden">
      <section className="grid min-w-0 gap-3">
        <h3 className="page-section-subtitle text-sm">Model rozliczenia</h3>
        <div className="flex min-w-0 flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={fixedPriceEnabled}
              disabled={readOnly}
              onChange={(event) => setFixedPriceEnabled(event.target.checked)}
            />
            Fixed price (kwota umowy)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={hourlyEnabled}
              disabled={readOnly}
              onChange={(event) => setHourlyEnabled(event.target.checked)}
            />
            Godzinowo (czas pracy z zakładki Czas pracy)
          </label>
        </div>
        {fixedPriceEnabled || hourlyEnabled ? (
          <p className="text-xs text-muted">
            {fixedPriceEnabled && hourlyEnabled
              ? "Oba tryby: kwota umowy jest bazą, a zużycie godzin z czasu pracy dokładane jest według stawki."
              : fixedPriceEnabled
                ? "Rozliczenie według kwoty umowy głównej."
                : "Zużycie godzin pobierane jest z wpisów czasu pracy projektu i porównywane z polami kontraktu według kategorii."}
          </p>
        ) : null}

        {fixedPriceEnabled ? (
          <div className="rounded-xl border border-border/70 p-3">
            <p className="mb-2 text-xs font-medium text-muted">Kwota umowy głównej</p>
            <p className="mb-2 text-xs text-muted">
              Ta sama kwota co pozycja „Umowa główna” w rozliczeniach — zapis aktualizuje obie.
            </p>
            <AgreementCostFields
              net={contractNet}
              vatRate={contractVat}
              onChange={(value) => {
                setContractNet(value.proposedCostNet);
                setContractVat(value.proposedCostVatRate);
              }}
            />
          </div>
        ) : null}

        {hourlyEnabled ? (
          <Field label="Stawka godzinowa netto (PLN/h)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={hourlyRateNet}
              disabled={readOnly}
              placeholder="np. 180"
              onChange={(event) => setHourlyRateNet(event.target.value)}
            />
          </Field>
        ) : null}

        <Field label="Notatki do budżetu">
          <Textarea
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
        </Field>

        {!readOnly ? (
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => void handleSaveSettings()} disabled={saving}>
              {saving ? "Zapisywanie…" : "Zapisz budżet"}
            </Button>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h3 className="page-section-subtitle text-sm">Pola w ramach kontraktu</h3>
        <p className="text-xs text-muted">
          Dla godzin: podaj opis i kategorię czasu pracy — w rozliczeniu zużycie liczy się z wpisów tej
          kategorii. Kategorie edytujesz w{" "}
          <a href="/ustawienia/czas-pracy" className="text-accent hover:underline">
            ustawieniach czasu pracy
          </a>
          .
        </p>
        {quotas.length === 0 ? (
          <p className="text-sm text-muted">Brak zdefiniowanych pól.</p>
        ) : (
          <ul className="grid gap-2">
            {quotas.map((quota) => (
              <QuotaRow
                key={quota.id}
                quota={quota}
                categories={categories}
                readOnly={readOnly}
                onSave={(input) => void updateQuota(projectId, quota.id, input)}
                onDelete={() => void removeQuota(projectId, quota.id)}
              />
            ))}
          </ul>
        )}
        {!readOnly ? (
          <div className="grid min-w-0 gap-2 rounded-xl border border-border/60 p-3">
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem_8rem]">
              <Input
                placeholder="Nazwa (np. godziny programisty)"
                value={quotaLabel}
                onChange={(event) => setQuotaLabel(event.target.value)}
              />
              <Input
                type="number"
                min={0}
                step="0.5"
                value={quotaQty}
                onChange={(event) => setQuotaQty(event.target.value)}
              />
              <Select
                value={quotaUnit}
                onChange={(event) => setQuotaUnit(event.target.value as ContractQuotaUnit)}
              >
                {CONTRACT_QUOTA_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {CONTRACT_QUOTA_UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
            </div>
            {quotaUnit === "hours" ? (
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Kategoria czasu pracy">
                  <Select
                    value={quotaCategoryId}
                    onChange={(event) => setQuotaCategoryId(event.target.value)}
                  >
                    <option value="">Wybierz kategorię…</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Opis">
                  <Input
                    placeholder="np. prace programistyczne w ramach umowy"
                    value={quotaNotes}
                    onChange={(event) => setQuotaNotes(event.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <Field label="Opis (opcjonalnie)">
                <Input
                  value={quotaNotes}
                  onChange={(event) => setQuotaNotes(event.target.value)}
                />
              </Field>
            )}
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto sm:justify-self-start"
              onClick={() => void handleAddQuota()}
            >
              <Plus className="mr-1 h-4 w-4" />
              Dodaj
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function QuotaRow({
  quota,
  categories,
  readOnly,
  onSave,
  onDelete,
}: {
  quota: ProjectContractQuota;
  categories: TimeCategory[];
  readOnly: boolean;
  onSave: (input: ProjectContractQuotaInput) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(quota.label);
  const [quantity, setQuantity] = useState(String(quota.quantity));
  const [unit, setUnit] = useState(quota.unit);
  const [notes, setNotes] = useState(quota.notes);
  const [timeCategoryId, setTimeCategoryId] = useState(quota.timeCategoryId ?? "");

  useEffect(() => {
    setLabel(quota.label);
    setQuantity(String(quota.quantity));
    setUnit(quota.unit);
    setNotes(quota.notes);
    setTimeCategoryId(quota.timeCategoryId ?? "");
  }, [quota]);

  function saveIfChanged(next?: Partial<ProjectContractQuotaInput>) {
    if (readOnly) return;
    const payload: ProjectContractQuotaInput = {
      label,
      quantity: Number(quantity) || 0,
      unit,
      notes,
      timeCategoryId: unit === "hours" ? timeCategoryId || null : null,
      ...next,
    };
    const sameLabel = payload.label === quota.label;
    const sameQty = payload.quantity === quota.quantity;
    const sameUnit = payload.unit === quota.unit;
    const sameNotes = (payload.notes ?? "") === (quota.notes ?? "");
    const sameCat = (payload.timeCategoryId ?? null) === (quota.timeCategoryId ?? null);
    if (sameLabel && sameQty && sameUnit && sameNotes && sameCat) return;
    onSave(payload);
  }

  return (
    <li className="grid min-w-0 gap-2 rounded-xl border border-border/60 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <Field label="Nazwa" className="min-w-0 w-full flex-1 sm:min-w-[10rem]">
          <Input
            value={label}
            disabled={readOnly}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={() => saveIfChanged()}
          />
        </Field>
        <Field label="Ilość" className="w-24">
          <Input
            type="number"
            min={0}
            step="0.5"
            value={quantity}
            disabled={readOnly}
            onChange={(event) => setQuantity(event.target.value)}
            onBlur={() => saveIfChanged()}
          />
        </Field>
        <Field label="Jednostka" className="w-32">
          <Select
            value={unit}
            disabled={readOnly}
            onChange={(event) => {
              const next = event.target.value as ContractQuotaUnit;
              setUnit(next);
              saveIfChanged({
                unit: next,
                timeCategoryId: next === "hours" ? timeCategoryId || null : null,
              });
            }}
          >
            {CONTRACT_QUOTA_UNITS.map((value) => (
              <option key={value} value={value}>
                {CONTRACT_QUOTA_UNIT_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        {!readOnly ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Usuń">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {unit === "hours" ? (
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Kategoria czasu pracy">
            <Select
              value={timeCategoryId}
              disabled={readOnly}
              onChange={(event) => {
                const next = event.target.value;
                setTimeCategoryId(next);
                saveIfChanged({ timeCategoryId: next || null });
              }}
            >
              <option value="">Wybierz kategorię…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Opis">
            <Input
              value={notes}
              disabled={readOnly}
              placeholder="Opis deklaracji godzin"
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => saveIfChanged()}
            />
          </Field>
        </div>
      ) : (
        <Field label="Opis">
          <Input
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => saveIfChanged()}
          />
        </Field>
      )}
    </li>
  );
}
