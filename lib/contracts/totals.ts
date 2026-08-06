import { computeFixedPriceRowGrossNet, computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow, VatRate } from "@/lib/service/types";
import {
  isContractTableSection,
  type ContractPaymentPlan,
  type ContractPaymentPlanInstallment,
  type ContractSection,
  type ContractTableSection,
} from "@/lib/contracts/types";

/**
 * Silnik przeliczeń umowy: suma tabel głównych + zaznaczonych opcji, rabaty na pozycjach, rabat
 * za wybrany wariant płatności, kwoty rat. Jedno miejsce liczenia — używane w edytorze admina,
 * w podglądzie klienta (na żywo przy zaznaczaniu opcji/wariantu) i przy generowaniu PDF.
 */

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function rowGrossValue(row: ServiceFixedPriceRow, defaultVat: VatRate) {
  const net = computeFixedPriceRowNetValue(row);
  const vat = row.vatRate ?? defaultVat;
  return roundMoney(net * (1 + vat / 100));
}

/** Kwota rabatu na pozycji — różnica między ceną katalogową a ceną po rabacie procentowym wiersza. */
export function calculateRowDiscountAmount(row: Pick<ServiceFixedPriceRow, "quantity" | "netUnitPrice" | "percentDiscount">) {
  return roundMoney(computeFixedPriceRowGrossNet(row) - computeFixedPriceRowNetValue(row));
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

/** Suma rabatów udzielonych na pozycjach (aktywne wiersze) danej tabeli. */
export function calculateTableDiscountAmount(table: Pick<ContractTableSection, "rows">) {
  return roundMoney(
    table.rows.filter((row) => row.active).reduce((sum, row) => sum + calculateRowDiscountAmount(row), 0),
  );
}

export type ContractTotals = {
  mainNet: number;
  mainGross: number;
  optionsNet: number;
  optionsGross: number;
  /** Suma rabatów na pozycjach (tylko liczone tabele: główne + zaznaczone opcje), netto. */
  itemDiscountNet: number;
  /** Suma główna + zaznaczone opcje, przed rabatem za wariant płatności. */
  subtotalNet: number;
  subtotalGross: number;
  planDiscountPercent: number;
  planDiscountNet: number;
  planDiscountGross: number;
  /** Suma końcowa po rabacie za wariant płatności — realna kwota do zapłaty. */
  totalNet: number;
  totalGross: number;
};

/**
 * `optionOverrides` pozwala podglądać "co jeśli klient zaznaczy tę opcję" bez mutowania sekcji.
 * `paymentPlan` — wariant płatności do zastosowania (jego `discountPercent` obniża sumę końcową);
 * pominięcie = brak rabatu za wariant.
 */
export function calculateContractTotals(
  sections: ContractSection[],
  options: {
    defaultVat?: VatRate;
    optionOverrides?: Record<string, boolean>;
    paymentPlan?: ContractPaymentPlan | null;
  } = {},
): ContractTotals {
  const defaultVat = options.defaultVat ?? 23;
  let mainNet = 0;
  let mainGross = 0;
  let optionsNet = 0;
  let optionsGross = 0;
  let itemDiscountNet = 0;

  for (const section of sections) {
    if (!isContractTableSection(section)) {
      continue;
    }
    const net = calculateTableNetTotal(section);
    const gross = calculateTableGrossTotal(section, defaultVat);

    if (section.group === "main") {
      mainNet += net;
      mainGross += gross;
      itemDiscountNet += calculateTableDiscountAmount(section);
      continue;
    }

    const selected = options.optionOverrides?.[section.id] ?? section.selected;
    if (selected) {
      optionsNet += net;
      optionsGross += gross;
      itemDiscountNet += calculateTableDiscountAmount(section);
    }
  }

  const subtotalNet = roundMoney(mainNet + optionsNet);
  const subtotalGross = roundMoney(mainGross + optionsGross);
  const planDiscountPercent = Math.min(100, Math.max(0, options.paymentPlan?.discountPercent ?? 0));
  const planDiscountNet = roundMoney(subtotalNet * (planDiscountPercent / 100));
  const planDiscountGross = roundMoney(subtotalGross * (planDiscountPercent / 100));

  return {
    mainNet: roundMoney(mainNet),
    mainGross: roundMoney(mainGross),
    optionsNet: roundMoney(optionsNet),
    optionsGross: roundMoney(optionsGross),
    itemDiscountNet: roundMoney(itemDiscountNet),
    subtotalNet,
    subtotalGross,
    planDiscountPercent,
    planDiscountNet,
    planDiscountGross,
    totalNet: roundMoney(subtotalNet - planDiscountNet),
    totalGross: roundMoney(subtotalGross - planDiscountGross),
  };
}

export type PaymentPlanInstallmentAmount = ContractPaymentPlanInstallment & {
  amountNet: number;
  amountGross: number;
  /** Kwota jednej z N rozłożonych miesięcznych części (tylko gdy splitOverMonths > 1). */
  perMonthGross: number | null;
};

export function calculatePaymentPlanInstallmentAmounts(
  plan: Pick<ContractPaymentPlan, "installments">,
  totals: ContractTotals,
): PaymentPlanInstallmentAmount[] {
  return plan.installments.map((item) => {
    const amountNet = roundMoney((item.percent / 100) * totals.totalNet);
    const amountGross = roundMoney((item.percent / 100) * totals.totalGross);
    return {
      ...item,
      amountNet,
      amountGross,
      perMonthGross: item.splitOverMonths > 1 ? roundMoney(amountGross / item.splitOverMonths) : null,
    };
  });
}

export function paymentPlanPercentSum(plan: Pick<ContractPaymentPlan, "installments">) {
  return roundMoney(plan.installments.reduce((sum, item) => sum + item.percent, 0));
}

export function isPaymentPlanComplete(plan: Pick<ContractPaymentPlan, "installments">) {
  if (plan.installments.length === 0) {
    return true;
  }
  return Math.abs(paymentPlanPercentSum(plan) - 100) < 0.01;
}

/** Cena końcowa (brutto) danego wariantu, licząc od tej samej bazy (główna + zaznaczone opcje) — do porównywarki wariantów. */
export function calculatePaymentPlanFinalGross(
  sections: ContractSection[],
  plan: ContractPaymentPlan,
  options: { defaultVat?: VatRate; optionOverrides?: Record<string, boolean> } = {},
) {
  return calculateContractTotals(sections, { ...options, paymentPlan: plan }).totalGross;
}
