"use client";

import {
  AGREEMENT_VAT_RATES,
  computeGrossFromNet,
  normalizeAgreementVatRate,
  type AgreementVatRate,
} from "@/lib/dashboard/agreement-cost";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AgreementCostFields({
  net,
  vatRate,
  onChange,
  compact = false,
}: {
  net: number | null;
  vatRate: AgreementVatRate;
  onChange: (value: {
    proposedCostNet: number | null;
    proposedCostGross: number | null;
    proposedCostVatRate: AgreementVatRate;
  }) => void;
  compact?: boolean;
}) {
  const resolvedVatRate = normalizeAgreementVatRate(vatRate);
  const gross = net != null && net >= 0 ? computeGrossFromNet(net, resolvedVatRate) : null;

  function updateNet(raw: string) {
    const nextNet = raw.trim() ? Number(raw) : null;
    const payload =
      nextNet != null && Number.isFinite(nextNet) && nextNet >= 0
        ? {
            proposedCostNet: nextNet,
            proposedCostGross: computeGrossFromNet(nextNet, resolvedVatRate),
            proposedCostVatRate: resolvedVatRate,
          }
        : {
            proposedCostNet: null,
            proposedCostGross: null,
            proposedCostVatRate: resolvedVatRate,
          };
    onChange(payload);
  }

  function updateVatRate(nextRate: AgreementVatRate) {
    if (net != null && net >= 0) {
      onChange({
        proposedCostNet: net,
        proposedCostGross: computeGrossFromNet(net, nextRate),
        proposedCostVatRate: nextRate,
      });
      return;
    }
    onChange({
      proposedCostNet: null,
      proposedCostGross: null,
      proposedCostVatRate: nextRate,
    });
  }

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
      <Field label="Kwota netto (PLN)">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={net ?? ""}
          onChange={(event) => updateNet(event.target.value)}
        />
      </Field>
      <Field label="Stawka VAT">
        <select
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          value={resolvedVatRate}
          onChange={(event) => updateVatRate(Number(event.target.value) as AgreementVatRate)}
        >
          {AGREEMENT_VAT_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}%
            </option>
          ))}
        </select>
      </Field>
      <Field label="Kwota brutto (PLN)" className={compact ? undefined : "sm:col-span-2"}>
        <Input
          readOnly
          disabled
          value={gross != null ? gross.toFixed(2) : ""}
          placeholder="Obliczana automatycznie"
        />
      </Field>
    </div>
  );
}
