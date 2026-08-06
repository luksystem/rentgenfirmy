"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { createContractPaymentScheduleItem } from "@/lib/contracts/factory";
import {
  calculateContractTotals,
  calculatePaymentScheduleAmounts,
  paymentSchedulePercentSum,
} from "@/lib/contracts/totals";
import type { ContractPaymentScheduleItem, ContractSection } from "@/lib/contracts/types";
import { cn, formatMoney } from "@/lib/utils";

export function ContractPaymentScheduleEditor({
  schedule,
  sections,
  onChange,
  disabled = false,
}: {
  schedule: ContractPaymentScheduleItem[];
  sections: ContractSection[];
  onChange: (schedule: ContractPaymentScheduleItem[]) => void;
  disabled?: boolean;
}) {
  // Podgląd zakłada, że wszystkie opcje są zaznaczone — biuro widzi pełny możliwy zakres umowy.
  const totals = calculateContractTotals(sections, {
    optionOverrides: Object.fromEntries(
      sections.filter((section) => section.type === "table").map((section) => [section.id, true]),
    ),
  });
  const amounts = calculatePaymentScheduleAmounts(schedule, totals);
  const percentSum = paymentSchedulePercentSum(schedule);
  const percentValid = schedule.length === 0 || Math.abs(percentSum - 100) < 0.01;

  function updateItem(index: number, next: ContractPaymentScheduleItem) {
    onChange(schedule.map((item, i) => (i === index ? next : item)));
  }

  function removeItem(index: number) {
    onChange(schedule.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Harmonogram spłat</h3>
        <p className="mt-1 text-sm text-muted">
          Podział na raty procentowe — kwoty przeliczają się automatycznie od aktualnej sumy umowy
          (główna umowa + zaznaczone opcje).
        </p>
      </div>

      {schedule.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted">
          Brak rat — cała kwota płatna jednorazowo.
        </p>
      ) : (
        <div className="grid gap-3">
          {amounts.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-xl border border-border/80 p-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
              <Field label="Nazwa raty">
                <Input
                  value={item.label}
                  disabled={disabled}
                  onChange={(event) => updateItem(index, { ...schedule[index], label: event.target.value })}
                  placeholder="Np. Zaliczka przy podpisaniu"
                />
              </Field>
              <Field label="Procent">
                <NumericInput
                  value={item.percent}
                  disabled={disabled}
                  onChange={(percent) =>
                    updateItem(index, { ...schedule[index], percent: Math.min(100, Math.max(0, percent)) })
                  }
                />
              </Field>
              <Field label="Uwagi (np. warunek płatności)">
                <Input
                  value={item.note}
                  disabled={disabled}
                  onChange={(event) => updateItem(index, { ...schedule[index], note: event.target.value })}
                  placeholder="Np. przy rozpoczęciu montażu"
                />
              </Field>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <p className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(item.amountGross)}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={disabled}>
                  Usuń
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange([...schedule, createContractPaymentScheduleItem()])}
      >
        Dodaj ratę
      </Button>

      <p className={cn("text-sm", percentValid ? "text-muted" : "font-semibold text-rose-400")}>
        Suma procentów: {percentSum}%{percentValid ? "" : " — musi wynosić 100%"}
        {" · "}
        Wartość umowy (z opcjami): {formatMoney(totals.totalGross)} brutto
      </p>
    </div>
  );
}
