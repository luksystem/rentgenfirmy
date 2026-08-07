import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_FUNCTIONAL_CATEGORIES,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  type CalculatorAddonKey,
  type CalculatorAnswers,
  type CalculatorFunctionalCategory,
  type CalculatorHouseSizeTier,
  type CalculatorOtherSystemKey,
} from "@/lib/calculator/types";
import type { CalculatorSettings } from "@/lib/calculator/settings";

/**
 * Silnik przeliczeń kalkulatora — odpowiednik łańcucha arkuszy KALKULATOR -> ZESTAWIENIE ->
 * DANE -> Pakiety z pliku źródłowego, ograniczony do ścieżki pakietu OPTIMUM i tylko do ceny
 * dla klienta (bez wewnętrznej kalkulacji marży/kosztu sprzętu). Wszystko czyste funkcje —
 * używane identycznie w formularzu (na żywo), przy generowaniu PDF i przy tworzeniu umowy,
 * wzorem `lib/contracts/totals.ts`.
 */

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Próg metrażowy — w oryginalnym pliku ta konkretna gałąź (ścieżka OPTIMUM, `DANE!E10`) dobiera
 * próg wyłącznie na podstawie liczby kondygnacji (1 -> "80-150m2", >1 -> "150m2+"), z pominięciem
 * realnej powierzchni — wygląda na uproszczenie/niedopatrzenie w oryginalnym arkuszu, a nie
 * zamierzone działanie. Tu celowo liczymy próg z faktycznie podanej powierzchni (0–80 / 80–150 /
 * 150+ m²), co jest bardziej intuicyjne dla ogólnego kalkulatora — do potwierdzenia z biurem.
 */
export function resolveHouseSizeTier(answers: Pick<CalculatorAnswers, "powierzchniaM2">): CalculatorHouseSizeTier {
  if (answers.powierzchniaM2 <= 80) {
    return "do_80";
  }
  if (answers.powierzchniaM2 <= 150) {
    return "od_80_do_150";
  }
  return "od_150";
}

export type CalculatorBaseSystemResult = {
  tier: CalculatorHouseSizeTier;
  rozdzielnicaSprzetNet: number;
  automatykaBazaNet: number;
  projektNet: number;
  projektDiscountNet: number;
  wykonanieRozdzielniNet: number;
  konfiguracjaNet: number;
  totalNet: number;
};

/** Rozdzielnica + automatyka bazowa + projekt (z ew. rabatem kompleksowości) + wykonanie + konfiguracja. */
export function calculateBaseSystem(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
  punktyElektryczne: number,
): CalculatorBaseSystemResult {
  const tier = resolveHouseSizeTier(answers);
  const wieleKondygnacji = answers.liczbaKondygnacji > 1;

  const rozdzielnicaSprzetNet = settings.baseSystem.rozdzielnicaSprzet[tier];
  const automatykaBazaNet = settings.baseSystem.automatykaBaza[tier];

  const projektBaseNet = wieleKondygnacji
    ? settings.baseSystem.projektWieleKondygnacji[tier]
    : settings.baseSystem.projektJednaKondygnacja[tier];
  const projektDiscountNet = answers.kompleksowaInstalacja
    ? roundMoney(projektBaseNet * (settings.discounts.projektKompleksowaPercent / 100))
    : 0;
  const projektNet = roundMoney(projektBaseNet - projektDiscountNet);

  const wykonanieRozdzielniNet =
    punktyElektryczne < 300
      ? settings.baseSystem.wykonanieRozdzielniProg1
      : punktyElektryczne < 600
        ? settings.baseSystem.wykonanieRozdzielniProg2
        : settings.baseSystem.wykonanieRozdzielniProg3;

  const konfiguracjaNet = wieleKondygnacji
    ? settings.baseSystem.konfiguracjaWieleKondygnacji
    : settings.baseSystem.konfiguracjaJednaKondygnacja;

  const totalNet = roundMoney(
    rozdzielnicaSprzetNet + automatykaBazaNet + projektNet + wykonanieRozdzielniNet + konfiguracjaNet,
  );

  return {
    tier,
    rozdzielnicaSprzetNet,
    automatykaBazaNet,
    projektNet,
    projektDiscountNet,
    wykonanieRozdzielniNet,
    konfiguracjaNet,
    totalNet,
  };
}

export type CalculatorFunctionalResult = {
  category: CalculatorFunctionalCategory;
  level: "podstawa" | "komfort" | "prestiz";
  net: number;
};

/** Budżety kategorii funkcjonalnych (Oświetlenie/Bezpieczeństwo/Temperatura/Rolety/Zewnętrzne). */
export function calculateFunctionalBudgets(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorFunctionalResult[] {
  const levelByCategory: Record<CalculatorFunctionalCategory, "podstawa" | "komfort" | "prestiz"> = {
    oswietlenie: answers.poziomOswietlenie,
    bezpieczenstwo: answers.poziomBezpieczenstwo,
    temperatura: answers.poziomTemperatura,
    rolety: answers.poziomRolety,
    zewnetrzne: answers.poziomZewnetrzne,
  };

  return CALCULATOR_FUNCTIONAL_CATEGORIES.map((category) => {
    const level = levelByCategory[category];
    return { category, level, net: settings.functional[category][level] };
  });
}

/** Zryczałtowany model punktowy instalacji elektrycznej (uproszczenie 5-stawkowego modelu z El rozbudowa). */
export function estimateElectricalPoints(answers: CalculatorAnswers): number {
  if (answers.liczbaPunktowElektrycznychRecznie != null) {
    return Math.max(0, answers.liczbaPunktowElektrycznychRecznie);
  }
  const gniazda =
    (answers.strefaPrywatna ? 2 : 0) +
    (answers.strefaOtwarta ? 4 : 0) +
    (answers.komunikacja ? 1 : 0) +
    answers.liczbaSypialniDodatkowych +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.liczbaBramGarazowych * 6;
  const oswietlenie = answers.liczbaPomieszczenZOknami + answers.liczbaOkienOtwieranych;
  const kontrolaDostepu = answers.liczbaDrzwiWejsciowych * 2 + (answers.czyBramaWjazdowa ? 2 : 0);
  const rolety = answers.planujeRolety ? answers.liczbaRolet : 0;

  return Math.round(gniazda + oswietlenie + kontrolaDostepu + rolety);
}

export type CalculatorElectricalResult = {
  points: number;
  net: number;
  discountNet: number;
  finalNet: number;
};

export function calculateElectricalInstallation(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorElectricalResult {
  const points = estimateElectricalPoints(answers);
  const net = roundMoney(points * settings.electrical.cenaZaPunkt);
  const discountNet = answers.kompleksowaInstalacja
    ? roundMoney(net * (settings.discounts.instalacjaKompleksowaPercent / 100))
    : 0;
  return { points, net, discountNet, finalNet: roundMoney(net - discountNet) };
}

export type CalculatorAddonResult = {
  key: CalculatorAddonKey;
  selected: boolean;
  quantity: number;
  net: number;
};

/** Ilość jest istotna tylko dla stacji dokującej i iPada (skalują się razem, wzorem Pakiety!E65/E67). */
function addonQuantity(key: CalculatorAddonKey, answers: CalculatorAnswers): number {
  return key === "stacjaDokujacaIpad" || key === "ipad" ? Math.max(1, answers.iloscStacjiDokujacychZIpadem) : 1;
}

export function calculateAddons(answers: CalculatorAnswers, settings: CalculatorSettings): CalculatorAddonResult[] {
  return CALCULATOR_ADDON_KEYS.map((key) => {
    const selected = answers.addons[key];
    const quantity = addonQuantity(key, answers);
    const net = selected ? roundMoney(settings.addons[key] * quantity) : 0;
    return { key, selected, quantity, net };
  });
}

export type CalculatorOtherSystemResult = {
  key: CalculatorOtherSystemKey;
  selected: boolean;
  net: number;
};

export type CalculatorOtherSystemsResult = {
  items: CalculatorOtherSystemResult[];
  selectedNet: number;
  discountPercent: number;
  discountNet: number;
  finalNet: number;
};

function otherSystemQuantityFactor(key: CalculatorOtherSystemKey, answers: CalculatorAnswers): number {
  if (key === "monitoring") {
    return answers.iloscKamerMonitoringu > 0 ? answers.iloscKamerMonitoringu / 6 : 1;
  }
  if (key === "multiroom") {
    const strefyRatio = answers.iloscStrefMultiroom > 0 ? answers.iloscStrefMultiroom / 4 : 1;
    const glosnikiRatio = answers.iloscGlosnikowMultiroom > 0 ? answers.iloscGlosnikowMultiroom / 6 : 1;
    return (strefyRatio + glosnikiRatio) / 2;
  }
  return 1;
}

/** Inne systemy — rabat proporcjonalny do liczby wybranych spośród wszystkich (CRM!Q7 × wybrane/wszystkie). */
export function calculateOtherSystems(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorOtherSystemsResult {
  const items = CALCULATOR_OTHER_SYSTEM_KEYS.map((key) => {
    const selected = answers.otherSystems[key];
    const factor = otherSystemQuantityFactor(key, answers);
    const net = selected ? roundMoney(settings.otherSystems[key] * factor) : 0;
    return { key, selected, net };
  });

  const selectedNet = roundMoney(items.reduce((sum, item) => sum + item.net, 0));
  const selectedCount = items.filter((item) => item.selected).length;
  const totalCount = CALCULATOR_OTHER_SYSTEM_KEYS.length;
  const discountPercent =
    selectedCount > 0 ? roundMoney((selectedCount / totalCount) * settings.discounts.inneSystemyMaxPercent) : 0;
  const discountNet = roundMoney(selectedNet * (discountPercent / 100));

  return { items, selectedNet, discountPercent, discountNet, finalNet: roundMoney(selectedNet - discountNet) };
}

export type CalculatorTotals = {
  baseSystem: CalculatorBaseSystemResult;
  functional: CalculatorFunctionalResult[];
  functionalNet: number;
  electrical: CalculatorElectricalResult;
  addons: CalculatorAddonResult[];
  addonsNet: number;
  otherSystems: CalculatorOtherSystemsResult;
  /** Trudny klient — współczynnik 1,0–1,3 dolicza się do całości (CRM!S3). */
  trudnyKlientWspolczynnik: number;
  /** Wartość główna (baza systemu + kategorie funkcjonalne + dodatki), przed instalacją elektryczną i inne systemy. */
  mainNet: number;
  /** Rabat przy płatności z góry, liczony od mainNet + electrical + otherSystems. */
  platnoscZGoryDiscountNet: number;
  totalNet: number;
};

export function calculateCalculatorTotals(answers: CalculatorAnswers, settings: CalculatorSettings): CalculatorTotals {
  const electrical = calculateElectricalInstallation(answers, settings);
  const baseSystem = calculateBaseSystem(answers, settings, electrical.points);
  const functional = calculateFunctionalBudgets(answers, settings);
  const functionalNet = roundMoney(functional.reduce((sum, item) => sum + item.net, 0));
  const addons = calculateAddons(answers, settings);
  const addonsNet = roundMoney(addons.reduce((sum, item) => sum + item.net, 0));
  const otherSystems = calculateOtherSystems(answers, settings);

  const trudnyKlientWspolczynnik = Math.min(1.3, Math.max(1, answers.trudnyKlientWspolczynnik || 1));

  const mainNetBeforeCoefficient = roundMoney(baseSystem.totalNet + functionalNet + addonsNet);
  const mainNet = roundMoney(mainNetBeforeCoefficient * trudnyKlientWspolczynnik);

  const subtotalNet = roundMoney(mainNet + electrical.finalNet + otherSystems.finalNet);
  const platnoscZGoryDiscountNet = answers.platnoscZGory
    ? roundMoney(subtotalNet * (settings.discounts.platnoscZGoryPercent / 100))
    : 0;
  const totalNet = roundMoney(subtotalNet - platnoscZGoryDiscountNet);

  return {
    baseSystem,
    functional,
    functionalNet,
    electrical,
    addons,
    addonsNet,
    otherSystems,
    trudnyKlientWspolczynnik,
    mainNet,
    platnoscZGoryDiscountNet,
    totalNet,
  };
}
