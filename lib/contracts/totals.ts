import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow, VatRate } from "@/lib/service/types";
import {
  isContractTableSection,
  type ContractPaymentScheduleItem,
  type ContractSection,
  type ContractTableSection,
} from "@/lib/contracts/types";

/**
 * Silnik przeliczeń umowy: suma tabel głównych + zaznaczonych opcji, kwoty rat harmonogramu
 * wg procentu tej sumy. Jedno miejsce liczenia — używane w edytorze admina, w podglądzie
 * klienta (live przy zaznaczaniu opcji) i przy generowaniu PDF.
 */

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function rowGrossValue(row: ServiceFixedPriceRow, defaultVat: VatRate) {
  const net = computeFixedPriceRowNetValue(row);
  const vat = row.vatRate ?? defaultVat;
  return roundMoney(net * (1 + vat / 100));
}

export function calculateTableNetTotal(table: Pick<ContractTableSection, "rows">) {
  return roundMoney(table.rows.reduce((sum, row) => sum + computeFixedPriceRowNetValue(row), 0));
}

export function calculateTableGrossTotal(
  table: Pick<ContractTableSection, "rows">,
  defaultVat: VatRate = 23,
) {
  return roundMoney(table.rows.reduce((sum, row) => sum + rowGrossValue(row, defaultVat), 0));
}

export type ContractTotals = {
  mainNet: number;
  mainGross: number;
  optionsNet: number;
  optionsGross: number;
  totalNet: number;
  totalGross: number;
};

/**
 * `optionOverrides` pozwala podglądać "co jeśli klient zaznaczy tę opcję" bez mutowania sekcji
 * (używane w edytorze admina i w publicznym podglądzie przed zapisem wyboru klienta).
 */
export function calculateContractTotals(
  sections: ContractSection[],
  options: { defaultVat?: VatRate; optionOverrides?: Record<string, boolean> } = {},
): ContractTotals {
  const defaultVat = options.defaultVat ?? 23;
  let mainNet = 0;
  let mainGross = 0;
  let optionsNet = 0;
  let optionsGross = 0;

  for (const section of sections) {
    if (!isContractTableSection(section)) {
      continue;
    }
    const net = calculateTableNetTotal(section);
    const gross = calculateTableGrossTotal(section, defaultVat);

    if (section.group === "main") {
      mainNet += net;
      mainGross += gross;
      continue;
    }

    const selected = options.optionOverrides?.[section.id] ?? section.selected;
    if (selected) {
      optionsNet += net;
      optionsGross += gross;
    }
  }

  return {
    mainNet: roundMoney(mainNet),
    mainGross: roundMoney(mainGross),
    optionsNet: roundMoney(optionsNet),
    optionsGross: roundMoney(optionsGross),
    totalNet: roundMoney(mainNet + optionsNet),
    totalGross: roundMoney(mainGross + optionsGross),
  };
}

export type PaymentScheduleAmount = ContractPaymentScheduleItem & {
  amountNet: number;
  amountGross: number;
};

export function calculatePaymentScheduleAmounts(
  schedule: ContractPaymentScheduleItem[],
  totals: ContractTotals,
): PaymentScheduleAmount[] {
  return schedule.map((item) => ({
    ...item,
    amountNet: roundMoney((item.percent / 100) * totals.totalNet),
    amountGross: roundMoney((item.percent / 100) * totals.totalGross),
  }));
}

export function paymentSchedulePercentSum(schedule: ContractPaymentScheduleItem[]) {
  return roundMoney(schedule.reduce((sum, item) => sum + item.percent, 0));
}

export function isPaymentScheduleComplete(schedule: ContractPaymentScheduleItem[]) {
  if (schedule.length === 0) {
    return true;
  }
  return Math.abs(paymentSchedulePercentSum(schedule) - 100) < 0.01;
}
