import { computeFixedPriceRowGrossNet, computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import {
  isContractTableSection,
  type ContractPaymentPlan,
  type ContractPaymentPlanInstallment,
  type ContractSection,
  type ContractTableSection,
  type ContractVatDeclaration,
} from "@/lib/contracts/types";

/**
 * Silnik przeliczeń umowy — wszystko liczone w NETTO aż do samego końca: suma tabel głównych +
 * zaznaczonych opcji, rabaty na pozycjach, rabaty za kategorię (instalacja/instalacje dodatkowe),
 * rabat za wybrany wariant płatności. VAT dolicza się dopiero na podstawie deklaracji płatnika
 * (patrz `calculateVatBreakdown`) — jedno miejsce liczenia, używane w edytorze admina, w
 * podglądzie klienta (na żywo) i przy generowaniu PDF.
 */

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Klucz zaznaczenia pojedynczej pozycji w tabeli kategorii "dodatki" (per-wiersz, nie cała tabela). */
export function contractRowSelectionKey(sectionId: string, rowId: string) {
  return `${sectionId}:${rowId}`;
}

/** Kwota rabatu na pozycji — różnica między ceną katalogową a ceną po rabacie procentowym wiersza. */
export function calculateRowDiscountAmount(row: Pick<ServiceFixedPriceRow, "quantity" | "netUnitPrice" | "percentDiscount">) {
  return roundMoney(computeFixedPriceRowGrossNet(row) - computeFixedPriceRowNetValue(row));
}

export function calculateTableNetTotal(table: Pick<ContractTableSection, "rows">) {
  return roundMoney(table.rows.reduce((sum, row) => sum + computeFixedPriceRowNetValue(row), 0));
}

/** Suma rabatów udzielonych na pozycjach (aktywne wiersze) danej tabeli. */
export function calculateTableDiscountAmount(table: Pick<ContractTableSection, "rows">) {
  return roundMoney(
    table.rows.filter((row) => row.active).reduce((sum, row) => sum + calculateRowDiscountAmount(row), 0),
  );
}

export type ContractTotals = {
  mainNet: number;
  /** Suma tabel opcjonalnych rzeczywiście wliczonych (zaznaczone instalacja/instalacje_dodatkowe + zaznaczone pozycje dodatków). */
  optionsNet: number;
  /** Suma rabatów na pozycjach (informacyjnie — już wliczona w netto wierszy). */
  itemDiscountNet: number;
  /** Suma rabatów za zaznaczone kategorie (instalacja/instalacje_dodatkowe). */
  categoryDiscountNet: number;
  /** mainNet + optionsNet − categoryDiscountNet, przed rabatem za wariant płatności. */
  subtotalNet: number;
  planDiscountPercent: number;
  planDiscountNet: number;
  /** Suma końcowa netto — punkt wyjścia do rozliczenia VAT. */
  totalNet: number;
};

/**
 * `selectionOverrides` pozwala podglądać wybór klienta bez mutowania sekcji — klucz to id sekcji
 * (całe tabele instalacja/instalacje_dodatkowe) albo `contractRowSelectionKey` (pojedyncze pozycje
 * w tabelach "dodatki"). `paymentPlan` — wariant płatności do zastosowania.
 */
export function calculateContractTotals(
  sections: ContractSection[],
  options: {
    selectionOverrides?: Record<string, boolean>;
    paymentPlan?: ContractPaymentPlan | null;
  } = {},
): ContractTotals {
  let mainNet = 0;
  let optionsNet = 0;
  let itemDiscountNet = 0;
  let categoryDiscountNet = 0;

  for (const section of sections) {
    if (!isContractTableSection(section)) {
      continue;
    }

    if (section.group === "main") {
      mainNet += calculateTableNetTotal(section);
      itemDiscountNet += calculateTableDiscountAmount(section);
      continue;
    }

    if (section.category === "dodatki") {
      for (const row of section.rows) {
        if (!row.active) {
          continue;
        }
        const key = contractRowSelectionKey(section.id, row.id);
        const selected = options.selectionOverrides?.[key] ?? section.selectedRowIds.includes(row.id);
        if (!selected) {
          continue;
        }
        optionsNet += computeFixedPriceRowNetValue(row);
        itemDiscountNet += calculateRowDiscountAmount(row);
      }
      continue;
    }

    // instalacja / instalacje_dodatkowe — całą tabelą naraz
    const selected = options.selectionOverrides?.[section.id] ?? section.selected;
    if (!selected) {
      continue;
    }
    const net = calculateTableNetTotal(section);
    optionsNet += net;
    itemDiscountNet += calculateTableDiscountAmount(section);
    categoryDiscountNet += roundMoney(net * ((section.categoryDiscountPercent ?? 0) / 100));
  }

  const subtotalNet = roundMoney(mainNet + optionsNet - categoryDiscountNet);
  const planDiscountPercent = Math.min(100, Math.max(0, options.paymentPlan?.discountPercent ?? 0));
  const planDiscountNet = roundMoney(subtotalNet * (planDiscountPercent / 100));

  return {
    mainNet: roundMoney(mainNet),
    optionsNet: roundMoney(optionsNet),
    itemDiscountNet: roundMoney(itemDiscountNet),
    categoryDiscountNet: roundMoney(categoryDiscountNet),
    subtotalNet,
    planDiscountPercent,
    planDiscountNet,
    totalNet: roundMoney(subtotalNet - planDiscountNet),
  };
}

export type PaymentPlanInstallmentAmount = ContractPaymentPlanInstallment & {
  amountNet: number;
  /** Kwota jednej z N rozłożonych miesięcznych części (tylko gdy splitOverMonths > 1). */
  perMonthNet: number | null;
};

export function calculatePaymentPlanInstallmentAmounts(
  plan: Pick<ContractPaymentPlan, "installments">,
  totals: ContractTotals,
): PaymentPlanInstallmentAmount[] {
  return plan.installments.map((item) => {
    const amountNet = roundMoney((item.percent / 100) * totals.totalNet);
    return {
      ...item,
      amountNet,
      perMonthNet: item.splitOverMonths > 1 ? roundMoney(amountNet / item.splitOverMonths) : null,
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

/**
 * Zwraca klucze selekcji reprezentujące "wszystko zaznaczone" (wszystkie tabele opcjonalne +
 * wszystkie pozycje "dodatki") — do podglądu pełnego możliwego zakresu umowy w panelu admina,
 * zanim klient cokolwiek wybierze.
 */
export function allSelectionKeys(sections: ContractSection[]): string[] {
  const keys: string[] = [];
  for (const section of sections) {
    if (!isContractTableSection(section) || section.group !== "option") {
      continue;
    }
    if (section.category === "dodatki") {
      for (const row of section.rows) {
        keys.push(contractRowSelectionKey(section.id, row.id));
      }
    } else {
      keys.push(section.id);
    }
  }
  return keys;
}

/** Cena końcowa netto danego wariantu, licząc od tej samej bazy — do porównywarki wariantów. */
export function calculatePaymentPlanFinalNet(
  sections: ContractSection[],
  plan: ContractPaymentPlan,
  options: { selectionOverrides?: Record<string, boolean> } = {},
) {
  return calculateContractTotals(sections, { ...options, paymentPlan: plan }).totalNet;
}

const VAT_RATE_PREFERENTIAL = 8;
const VAT_RATE_STANDARD = 23;

export type ContractVatBreakdown = {
  /** Kwota (netto) rozliczana jako "inne" (gotówka). */
  inneNet: number;
  inneDiscountPercent: number;
  inneDiscount: number;
  /** Kwota "inne" po rabacie — bez VAT. */
  inneFinal: number;
  /** Kwota (netto) rozliczana "normalnie" wg typu płatnika. */
  normalNet: number;
  /** Efektywna (ew. mieszana przy przekroczeniu progu m2) stawka VAT części normalnej. */
  normalVatRatePercent: number;
  normalVat: number;
  normalGross: number;
  /** Czy do pełnego wyliczenia brakuje jeszcze danych (powierzchnia/typ budynku dla osoby prywatnej). */
  needsAreaDeclaration: boolean;
  /** Suma końcowa do zapłaty (inneFinal + normalGross). */
  finalTotal: number;
};

/**
 * Rozliczenie VAT na podstawie deklaracji klienta — stawka dla części "normalnej" zależy od typu
 * płatnika (firma = 23% zawsze; osoba prywatna = 8%/23% wg progu powierzchni, proporcjonalnie przy
 * przekroczeniu progu), a część oznaczona jako "inne" (gotówka) idzie z 0% VAT i dodatkowym
 * rabatem `inneDiscountPercent` — to pole żyje na samej umowie (domyślnie z ustawień modułu w
 * momencie utworzenia, dalej edytowalne per umowa), nie jest tu na nowo odczytywane z ustawień
 * globalnych. Gdy dane o powierzchni jeszcze nie są uzupełnione, konserwatywnie liczy 23% (żeby
 * nie zaniżać ceny) i sygnalizuje to przez `needsAreaDeclaration`.
 */
export function calculateVatBreakdown(
  totalNet: number,
  declaration: ContractVatDeclaration,
  inneDiscountPercent: number,
): ContractVatBreakdown {
  const innePercent = Math.min(100, Math.max(0, declaration.innePercent));
  const inneNet = roundMoney(totalNet * (innePercent / 100));
  const normalNet = roundMoney(totalNet - inneNet);
  const inneDiscount = roundMoney(inneNet * (inneDiscountPercent / 100));
  const inneFinal = roundMoney(inneNet - inneDiscount);

  let normalVatRatePercent = VAT_RATE_STANDARD;
  let needsAreaDeclaration = false;

  if (declaration.payerType === "firma") {
    normalVatRatePercent = VAT_RATE_STANDARD;
  } else {
    const threshold =
      declaration.buildingType === "dom_jednorodzinny" ? 300 : declaration.buildingType === "lokal_mieszkalny" ? 150 : null;
    if (!threshold || !declaration.areaM2) {
      needsAreaDeclaration = true;
      normalVatRatePercent = VAT_RATE_STANDARD;
    } else if (declaration.areaM2 <= threshold) {
      normalVatRatePercent = VAT_RATE_PREFERENTIAL;
    } else {
      const ratioPreferential = threshold / declaration.areaM2;
      normalVatRatePercent = roundMoney(
        ratioPreferential * VAT_RATE_PREFERENTIAL + (1 - ratioPreferential) * VAT_RATE_STANDARD,
      );
    }
  }

  const normalVat = roundMoney(normalNet * (normalVatRatePercent / 100));
  const normalGross = roundMoney(normalNet + normalVat);

  return {
    inneNet,
    inneDiscountPercent,
    inneDiscount,
    inneFinal,
    normalNet,
    normalVatRatePercent,
    normalVat,
    normalGross,
    needsAreaDeclaration,
    finalTotal: roundMoney(inneFinal + normalGross),
  };
}
