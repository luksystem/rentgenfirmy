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
  type ProjectHourlyReport,
} from "@/lib/settlements/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { useProjectSettlementStore } from "@/store/project-settlement-store";

export function ProjectBillingBudgetPanel({
  projectId,
  actorName,
  readOnly = false,
}: {
  projectId: string;
  actorName: string;
  readOnly?: boolean;
}) {
  const bundle = useProjectSettlementStore((state) => state.byProject[projectId]);
  const loading = useProjectSettlementStore((state) => state.loadingProjects[projectId]);
  const ensureSettlements = useProjectSettlementStore((state) => state.ensureSettlements);
  const saveBillingSettings = useProjectSettlementStore((state) => state.saveBillingSettings);
  const addQuota = useProjectSettlementStore((state) => state.addQuota);
  const updateQuota = useProjectSettlementStore((state) => state.updateQuota);
  const removeQuota = useProjectSettlementStore((state) => state.removeQuota);
  const addHourlyReport = useProjectSettlementStore((state) => state.addHourlyReport);
  const updateHourlyReport = useProjectSettlementStore((state) => state.updateHourlyReport);
  const removeHourlyReport = useProjectSettlementStore((state) => state.removeHourlyReport);

  const settings = bundle?.settings ?? emptyBillingSettings(projectId);
  const quotas = bundle?.quotas ?? [];
  const hourlyReports = bundle?.hourlyReports ?? [];

  const [fixedPriceEnabled, setFixedPriceEnabled] = useState(settings.fixedPriceEnabled);
  const [hourlyEnabled, setHourlyEnabled] = useState(settings.hourlyEnabled);
  const [contractNet, setContractNet] = useState<number | null>(settings.contractAmountNet);
  const [contractVat, setContractVat] = useState(
    normalizeAgreementVatRate(settings.contractVatRate ?? DEFAULT_AGREEMENT_VAT_RATE),
  );
  const [notes, setNotes] = useState(settings.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quotaLabel, setQuotaLabel] = useState("");
  const [quotaQty, setQuotaQty] = useState("0");
  const [quotaUnit, setQuotaUnit] = useState<ContractQuotaUnit>("hours");

  const [hourDate, setHourDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hourHours, setHourHours] = useState("1");
  const [hourRole, setHourRole] = useState("");
  const [hourNet, setHourNet] = useState("");
  const [hourVat, setHourVat] = useState(String(DEFAULT_AGREEMENT_VAT_RATE));
  const [hourNotes, setHourNotes] = useState("");

  useEffect(() => {
    void ensureSettlements(projectId, { sync: !readOnly }).catch(() => undefined);
  }, [ensureSettlements, projectId, readOnly]);

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
    setNotes(bundle.settings.notes);
  }, [bundle?.settings]);

  async function handleSaveSettings() {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await saveBillingSettings(projectId, {
        fixedPriceEnabled,
        hourlyEnabled,
        contractAmountNet: contractNet,
        contractVatRate: contractVat,
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
    await addQuota(projectId, {
      label: quotaLabel.trim(),
      quantity: Number(quotaQty) || 0,
      unit: quotaUnit,
    });
    setQuotaLabel("");
    setQuotaQty("0");
  }

  async function handleAddHourly() {
    if (readOnly) return;
    const hours = Number(hourHours);
    if (!Number.isFinite(hours) || hours < 0) return;
    const netRaw = hourNet.trim() ? Number(hourNet) : null;
    await addHourlyReport(
      projectId,
      {
        workDate: hourDate,
        hours,
        roleLabel: hourRole,
        amountNet: netRaw,
        vatRate: Number(hourVat) || DEFAULT_AGREEMENT_VAT_RATE,
        notes: hourNotes,
      },
      actorName,
    );
    setHourHours("1");
    setHourRole("");
    setHourNet("");
    setHourNotes("");
  }

  if (loading && !bundle) {
    return <p className="text-sm text-muted">Ładowanie budżetu…</p>;
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid gap-3">
        <h3 className="text-sm font-semibold text-foreground">Model rozliczenia</h3>
        <div className="flex flex-wrap gap-4 text-sm">
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
            Godzinowo (zużycie czasu / materiału)
          </label>
        </div>
        {fixedPriceEnabled || hourlyEnabled ? (
          <p className="text-xs text-muted">
            {fixedPriceEnabled && hourlyEnabled
              ? "Oba tryby: kwota umowy jest bazą, do której dokładane są pozycje godzinowe i inne należności."
              : fixedPriceEnabled
                ? "Rozliczenie według kwoty umowy głównej."
                : "Rozliczenie według raportowanych godzin (docelowo z czasu pracy zadań)."}
          </p>
        ) : null}

        {fixedPriceEnabled ? (
          <div className="rounded-xl border border-border/70 p-3">
            <p className="mb-2 text-xs font-medium text-muted">Kwota umowy głównej</p>
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
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold text-foreground">Pola w ramach kontraktu</h3>
        <p className="text-xs text-muted">
          Np. godziny programisty, godziny instalatora, przyjazdy nadzoru na budowę.
        </p>
        {quotas.length === 0 ? (
          <p className="text-sm text-muted">Brak zdefiniowanych pól.</p>
        ) : (
          <ul className="grid gap-2">
            {quotas.map((quota) => (
              <QuotaRow
                key={quota.id}
                quota={quota}
                readOnly={readOnly}
                onSave={(input) => void updateQuota(projectId, quota.id, input)}
                onDelete={() => void removeQuota(projectId, quota.id)}
              />
            ))}
          </ul>
        )}
        {!readOnly ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
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
            <Button type="button" variant="secondary" onClick={() => void handleAddQuota()}>
              <Plus className="mr-1 h-4 w-4" />
              Dodaj
            </Button>
          </div>
        ) : null}
      </section>

      {hourlyEnabled ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-foreground">Raportowanie godzin</h3>
          <p className="text-xs text-muted">
            Na razie ręczne wpisy. Docelowo pozycje będą brane z czasu pracy zadań.
          </p>
          {hourlyReports.length === 0 ? (
            <p className="text-sm text-muted">Brak raportów godzin.</p>
          ) : (
            <ul className="grid gap-2">
              {hourlyReports.map((report) => (
                <HourlyRow
                  key={report.id}
                  report={report}
                  readOnly={readOnly}
                  onSave={(input) => void updateHourlyReport(projectId, report.id, input)}
                  onDelete={() => void removeHourlyReport(projectId, report.id)}
                />
              ))}
            </ul>
          )}
          {!readOnly ? (
            <div className="grid gap-2 rounded-xl border border-border/70 p-3 sm:grid-cols-2">
              <Field label="Data">
                <Input
                  type="date"
                  value={hourDate}
                  onChange={(event) => setHourDate(event.target.value)}
                />
              </Field>
              <Field label="Godziny">
                <Input
                  type="number"
                  min={0}
                  step="0.25"
                  value={hourHours}
                  onChange={(event) => setHourHours(event.target.value)}
                />
              </Field>
              <Field label="Rola / opis">
                <Input
                  value={hourRole}
                  placeholder="np. programista"
                  onChange={(event) => setHourRole(event.target.value)}
                />
              </Field>
              <Field label="Kwota netto (opcjonalnie)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={hourNet}
                  onChange={(event) => setHourNet(event.target.value)}
                />
              </Field>
              <Field label="VAT %">
                <Select value={hourVat} onChange={(event) => setHourVat(event.target.value)}>
                  <option value="0">0%</option>
                  <option value="8">8%</option>
                  <option value="23">23%</option>
                </Select>
              </Field>
              <Field label="Notatka">
                <Input value={hourNotes} onChange={(event) => setHourNotes(event.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Button type="button" onClick={() => void handleAddHourly()}>
                  <Plus className="mr-1 h-4 w-4" />
                  Dodaj raport godzin
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function QuotaRow({
  quota,
  readOnly,
  onSave,
  onDelete,
}: {
  quota: ProjectContractQuota;
  readOnly: boolean;
  onSave: (input: { label: string; quantity: number; unit: ContractQuotaUnit; notes?: string }) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(quota.label);
  const [quantity, setQuantity] = useState(String(quota.quantity));
  const [unit, setUnit] = useState(quota.unit);

  useEffect(() => {
    setLabel(quota.label);
    setQuantity(String(quota.quantity));
    setUnit(quota.unit);
  }, [quota]);

  return (
    <li className="flex flex-wrap items-end gap-2 rounded-xl border border-border/60 px-3 py-2">
      <Field label="Nazwa" className="min-w-[10rem] flex-1">
        <Input
          value={label}
          disabled={readOnly}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={() => {
            if (readOnly) return;
            if (label !== quota.label || Number(quantity) !== quota.quantity || unit !== quota.unit) {
              onSave({ label, quantity: Number(quantity) || 0, unit });
            }
          }}
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
          onBlur={() => {
            if (readOnly) return;
            onSave({ label, quantity: Number(quantity) || 0, unit });
          }}
        />
      </Field>
      <Field label="Jednostka" className="w-32">
        <Select
          value={unit}
          disabled={readOnly}
          onChange={(event) => {
            const next = event.target.value as ContractQuotaUnit;
            setUnit(next);
            if (!readOnly) {
              onSave({ label, quantity: Number(quantity) || 0, unit: next });
            }
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
    </li>
  );
}

function HourlyRow({
  report,
  readOnly,
  onSave,
  onDelete,
}: {
  report: ProjectHourlyReport;
  readOnly: boolean;
  onSave: (input: {
    workDate: string;
    hours: number;
    roleLabel?: string;
    amountNet?: number | null;
    vatRate?: number | null;
    notes?: string;
  }) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm">
      <div>
        <p className="font-medium text-foreground">
          {formatDate(report.workDate)} · {report.hours} h
          {report.roleLabel ? ` · ${report.roleLabel}` : ""}
        </p>
        <p className="text-xs text-muted">
          {report.amountNet != null
            ? `netto ${formatMoney(report.amountNet)} · VAT ${report.vatRate ?? 0}% · brutto ${formatMoney(report.amountGross ?? 0)}`
            : "Bez wyceny kwotowej"}
          {report.notes ? ` — ${report.notes}` : ""}
        </p>
      </div>
      {!readOnly ? (
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onSave({
                workDate: report.workDate,
                hours: report.hours,
                roleLabel: report.roleLabel,
                amountNet: report.amountNet,
                vatRate: report.vatRate,
                notes: report.notes,
              })
            }
            className="hidden"
          >
            Zapisz
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Usuń">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}
