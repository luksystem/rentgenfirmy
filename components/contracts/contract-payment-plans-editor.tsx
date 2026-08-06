"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { createContractPaymentPlan, createContractPaymentPlanInstallment } from "@/lib/contracts/factory";
import {
  calculateContractTotals,
  calculatePaymentPlanInstallmentAmounts,
  paymentPlanPercentSum,
  type PaymentPlanInstallmentAmount,
} from "@/lib/contracts/totals";
import type { ContractPaymentPlan, ContractPaymentPlanInstallment, ContractSection } from "@/lib/contracts/types";
import { cn, formatMoney } from "@/lib/utils";

function PaymentPlanInstallmentRow({
  item,
  onChange,
  onRemove,
  disabled,
}: {
  item: PaymentPlanInstallmentAmount;
  onChange: (next: ContractPaymentPlanInstallment) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const splitEnabled = item.splitOverMonths > 1;

  return (
    <div className="grid gap-2 rounded-lg border border-border/70 bg-surface-muted/10 p-2.5">
      <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_5rem_9rem_auto]">
        <Input
          value={item.label}
          disabled={disabled}
          onChange={(event) => onChange({ ...item, label: event.target.value })}
          placeholder="Nazwa raty"
          className="col-span-2 h-8 text-sm sm:col-span-1"
        />
        <NumericInput
          value={item.percent}
          disabled={disabled}
          onChange={(percent) => onChange({ ...item, percent: Math.min(100, Math.max(0, percent)) })}
          className="h-8 text-sm"
          aria-label="Procent"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={splitEnabled}
            disabled={disabled}
            onChange={(event) => onChange({ ...item, splitOverMonths: event.target.checked ? 3 : 1 })}
            className="h-4 w-4 rounded border-border"
          />
          Rozłóż na
          {splitEnabled ? (
            <NumericInput
              value={item.splitOverMonths}
              disabled={disabled}
              decimals={false}
              onChange={(value) => onChange({ ...item, splitOverMonths: Math.max(2, Math.round(value)) })}
              className="h-7 w-14 text-xs"
            />
          ) : null}
          mies.
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 justify-self-end p-0 text-rose-400 hover:text-rose-300"
          disabled={disabled}
          onClick={onRemove}
          title="Usuń ratę"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input
        value={item.note}
        disabled={disabled}
        onChange={(event) => onChange({ ...item, note: event.target.value })}
        placeholder="Uwaga widoczna dla klienta (opcjonalnie)"
        className="h-8 text-xs"
      />
      <p className="text-xs text-muted">
        {formatMoney(item.amountGross)} brutto
        {item.perMonthGross != null ? ` · ${item.splitOverMonths}× ${formatMoney(item.perMonthGross)} / mies.` : ""}
      </p>
    </div>
  );
}

function PaymentPlanCard({
  plan,
  index,
  sections,
  onChange,
  onRemove,
  disabled,
}: {
  plan: ContractPaymentPlan;
  index: number;
  sections: ContractSection[];
  onChange: (next: ContractPaymentPlan) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  // Podgląd zakłada, że wszystkie opcje są zaznaczone — biuro widzi pełny możliwy zakres umowy.
  const totals = calculateContractTotals(sections, {
    optionOverrides: Object.fromEntries(
      sections.filter((section) => section.type === "table").map((section) => [section.id, true]),
    ),
    paymentPlan: plan,
  });
  const amounts = calculatePaymentPlanInstallmentAmounts(plan, totals);
  const percentSum = paymentPlanPercentSum(plan);
  const percentValid = plan.installments.length === 0 || Math.abs(percentSum - 100) < 0.01;

  function updateInstallment(id: string, next: ContractPaymentPlanInstallment) {
    onChange({ ...plan, installments: plan.installments.map((item) => (item.id === id ? next : item)) });
  }

  function removeInstallment(id: string) {
    onChange({ ...plan, installments: plan.installments.filter((item) => item.id !== id) });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-border/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Wariant {index + 1}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          Usuń wariant
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nazwa wariantu">
          <Input
            value={plan.label}
            disabled={disabled}
            onChange={(event) => onChange({ ...plan, label: event.target.value })}
            placeholder="Np. Standard 60/30/10"
          />
        </Field>
        <Field label="Dodatkowy rabat za ten wariant (%)">
          <NumericInput
            value={plan.discountPercent}
            disabled={disabled}
            onChange={(discountPercent) =>
              onChange({ ...plan, discountPercent: Math.min(100, Math.max(0, discountPercent)) })
            }
          />
        </Field>
      </div>

      <div className="grid gap-2">
        {amounts.map((item) => (
          <PaymentPlanInstallmentRow
            key={item.id}
            item={item}
            disabled={disabled}
            onChange={(next) => updateInstallment(item.id, next)}
            onRemove={() => removeInstallment(item.id)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => onChange({ ...plan, installments: [...plan.installments, createContractPaymentPlanInstallment()] })}
      >
        Dodaj ratę
      </Button>

      <p className={cn("text-sm", percentValid ? "text-muted" : "font-semibold text-rose-400")}>
        Suma rat: {percentSum}%{percentValid ? "" : " — musi wynosić 100%"}
        {" · "}
        Cena po tym wariancie: <span className="font-medium text-foreground">{formatMoney(totals.totalGross)} brutto</span>
        {plan.discountPercent > 0 ? ` (rabat ${plan.discountPercent}% = −${formatMoney(totals.planDiscountGross)})` : ""}
      </p>
    </div>
  );
}

export function ContractPaymentPlansEditor({
  plans,
  sections,
  onChange,
  disabled = false,
}: {
  plans: ContractPaymentPlan[];
  sections: ContractSection[];
  onChange: (plans: ContractPaymentPlan[]) => void;
  disabled?: boolean;
}) {
  function updatePlan(index: number, next: ContractPaymentPlan) {
    onChange(plans.map((plan, i) => (i === index ? next : plan)));
  }

  function removePlan(index: number) {
    onChange(plans.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Warianty płatności</h3>
        <p className="mt-1 text-sm text-muted">
          Zdefiniuj jeden lub więcej sposobów płatności do wyboru przez klienta przy podpisywaniu — np.
          standardowy podział rat i szybszą płatność z dodatkowym rabatem. Klient wybiera gotowy wariant,
          nie może go edytować.
        </p>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted">
          Brak wariantów płatności — dodaj co najmniej jeden, żeby klient mógł zobaczyć harmonogram spłat.
        </p>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan, index) => (
            <PaymentPlanCard
              key={plan.id}
              plan={plan}
              index={index}
              sections={sections}
              disabled={disabled}
              onChange={(next) => updatePlan(index, next)}
              onRemove={() => removePlan(index)}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange([...plans, createContractPaymentPlan()])}
      >
        Dodaj wariant płatności
      </Button>
    </div>
  );
}
