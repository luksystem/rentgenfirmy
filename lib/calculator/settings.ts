import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_ELECTRICAL_RATE_TYPES,
  CALCULATOR_FUNCTIONAL_CATEGORIES,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  type CalculatorAddonKey,
  type CalculatorElectricalRateType,
  type CalculatorFunctionalCategory,
  type CalculatorOtherSystemKey,
} from "@/lib/calculator/types";

/**
 * Cennik kalkulatora — edytowalny w panelu (`/kalkulacje/ustawienia`), nie w kodzie i nie przez
 * wgrywanie pliku Excel. Wartości startowe zweryfikowane empirycznie przeciw źródłowemu plikowi
 * "Oferta cenowa Luksystem INTELIGETNY DOM_Pakiety_v21.xlsx" — przeliczonemu biblioteką
 * `formulas` z konkretnymi danymi wejściowymi (nie tylko odczyt statycznych komórek), dla ścieżki
 * pakietu OPTIMUM. Patrz komentarz w `lib/calculator/types.ts` o dwóch odkryciach z tej
 * weryfikacji (próg bazy systemu tylko wg liczby kondygnacji, kategorie funkcjonalne jako stała
 * cena odblokowywana checkboxem, nie trzypoziomowy wybór).
 */

export type CalculatorBaseSystemSettings = {
  /** Projekt Inteligentnego Domu (DANE!T109, zweryfikowane: 4000/6000). */
  projektJednaKondygnacja: number;
  projektWieleKondygnacji: number;
  /** Dopłata do projektu przy bardzo dużym domu (KALKULATOR!N29: >=400m² -> +2000). */
  projektDuzyDomProgM2: number;
  projektDuzyDomDoplata: number;
  /** Wykonanie i podłączenie rozdzielni na budowie (DANE!T110, zweryfikowane: 14520/17640). */
  rozdzielniaWykonanieJednaKondygnacja: number;
  rozdzielniaWykonanieWieleKondygnacji: number;
  /** Baza systemu — sterownik, zasilanie, wstępna konfiguracja (DANE!T111, zweryfikowane). */
  bazaZasilanieJednaKondygnacja: number;
  bazaZasilanieWieleKondygnacji: number;
};

export const DEFAULT_BASE_SYSTEM_SETTINGS: CalculatorBaseSystemSettings = {
  projektJednaKondygnacja: 4000,
  projektWieleKondygnacji: 6000,
  projektDuzyDomProgM2: 400,
  projektDuzyDomDoplata: 2000,
  rozdzielniaWykonanieJednaKondygnacja: 14520,
  rozdzielniaWykonanieWieleKondygnacji: 17640,
  bazaZasilanieJednaKondygnacja: 12728.33,
  bazaZasilanieWieleKondygnacji: 11928.33,
};

/**
 * Cena stała danej kategorii funkcjonalnej, doliczana gdy klient zaznaczy odpowiadającą
 * funkcjonalność (np. "Chcę sterować temperaturą" -> kategoria "temperatura"). Wartości
 * zweryfikowane jako różnica ceny OPTIMUM przy włączeniu/wyłączeniu pojedynczej funkcjonalności.
 */
export type CalculatorFunctionalPricing = Record<CalculatorFunctionalCategory, number>;

export const DEFAULT_FUNCTIONAL_PRICING: CalculatorFunctionalPricing = {
  oswietlenie: 2559.9,
  bezpieczenstwo: 14930.7,
  temperatura: 4677.16,
  rolety: 4369.4,
  zewnetrzne: 4967.5,
};

export type CalculatorAddonPricing = Record<CalculatorAddonKey, number>;

export const DEFAULT_ADDON_PRICING: CalculatorAddonPricing = {
  stacjaPogodowa: 3150,
  oswietlenieSciemniane230V: 2300,
  oswietlenieKoloroweRGBW: 1400,
  czujnikiOtwarciaOkien: 400,
  klawiaturyNfc: 3900,
  przygotowanieDostepuDrzwi: 0,
  bezpieczenstwoPlusPlusPlus: 0,
  sterowaneGniazda: 2700,
  dodatkowyLicznikPradu: 1850,
  dodatkowyZasilaczUps: 1900,
  rozdzielniaPlusPlusPlus: 4600,
  budzikInteligentny: 1500,
  przyciskUkryty: 1500,
  stacjaDokujacaIpad: 1000,
  ipad: 2500,
};

export type CalculatorOtherSystemPricing = Record<CalculatorOtherSystemKey, number>;

/** Cena bazowa per system (InneSystemy!D13:Y13, zweryfikowane niezależnie przez CoMozemy!G18 dla monitoringu). */
export const DEFAULT_OTHER_SYSTEM_PRICING: CalculatorOtherSystemPricing = {
  sieciLan: 3260,
  telewizja: 1920,
  wideodomofon: 3300,
  monitoring: 5200,
  naglosnienie: 8500,
  multiroom: 12400,
  sauna: 0,
  alarmTymczasowy: 1000,
};

/** Stawka za punkt wg typu (El rozbudowa!A2:A6, wartości bazowe bez dojazdów — patrz `referencyjnyDystansKm`). */
export type CalculatorElectricalRatePricing = Record<CalculatorElectricalRateType, number>;

export const DEFAULT_ELECTRICAL_RATES: CalculatorElectricalRatePricing = {
  standard: 135,
  inteligentny: 162,
  gotowe_urzadzenie: 189,
  petla: 108,
};

export type CalculatorElectricalFixedPricing = {
  /** Kanał TV — cena ryczałtowa za kanał, nie wg typu punktu (El rozbudowa!F91). */
  kanalTv: number;
  antenaZMasztem: number;
  dzierzawaRozdzielniBudowlanej: number;
  obsadzenieRozdzielniGlownej: number;
  przylaczeZaMetr: number;
  formalnosciOdbiorowe: number;
  pomiaryWewnetrzneZaPunkt: number;
  dodatkoweBruzdowanieZaMetr: number;
};

export const DEFAULT_ELECTRICAL_FIXED_PRICING: CalculatorElectricalFixedPricing = {
  kanalTv: 300,
  antenaZMasztem: 1000,
  dzierzawaRozdzielniBudowlanej: 500,
  obsadzenieRozdzielniGlownej: 400,
  przylaczeZaMetr: 240,
  formalnosciOdbiorowe: 1500,
  pomiaryWewnetrzneZaPunkt: 12,
  dodatkoweBruzdowanieZaMetr: 40,
};

export type CalculatorElectricalSettings = {
  rates: CalculatorElectricalRatePricing;
  fixed: CalculatorElectricalFixedPricing;
  /**
   * Stawki punktowe powyżej już zawierają koszt dojazdu dla domu w odległości referencyjnej —
   * powyżej tego dystansu dolicza się `doplataZaKmNettoNaPunkt` za każdy dodatkowy km (w obie
   * strony). Uproszczenie rzeczywistego mechanizmu amortyzacji kosztów dojazdu na punkt z
   * arkusza źródłowego (El rozbudowa!I6) — tam zależy dodatkowo od całkowitej liczby punktów w
   * konkretnej wycenie, co jest trudne do wiernego odtworzenia bez cyrkularnych odwołań.
   */
  referencyjnyDystansKm: number;
  doplataZaKmNettoNaPunkt: number;
};

export const DEFAULT_ELECTRICAL_SETTINGS: CalculatorElectricalSettings = {
  rates: DEFAULT_ELECTRICAL_RATES,
  fixed: DEFAULT_ELECTRICAL_FIXED_PRICING,
  referencyjnyDystansKm: 100,
  doplataZaKmNettoNaPunkt: 0,
};

export type CalculatorDiscountSettings = {
  /** Rabat na instalację elektryczną przy kompleksowości (% ceny instalacji, CRM!Q3). */
  instalacjaKompleksowaPercent: number;
  /** Rabat przy płatności z góry (% całości, CRM!Q4). */
  platnoscZGoryPercent: number;
  /** Maksymalny rabat na "inne systemy", proporcjonalny do liczby wybranych spośród wszystkich (CRM!Q7). */
  inneSystemyMaxPercent: number;
};

export const DEFAULT_DISCOUNT_SETTINGS: CalculatorDiscountSettings = {
  instalacjaKompleksowaPercent: 15,
  platnoscZGoryPercent: 3,
  inneSystemyMaxPercent: 15,
};

export type CalculatorSettings = {
  baseSystem: CalculatorBaseSystemSettings;
  functional: CalculatorFunctionalPricing;
  addons: CalculatorAddonPricing;
  otherSystems: CalculatorOtherSystemPricing;
  electrical: CalculatorElectricalSettings;
  discounts: CalculatorDiscountSettings;
};

export const DEFAULT_CALCULATOR_SETTINGS: CalculatorSettings = {
  baseSystem: DEFAULT_BASE_SYSTEM_SETTINGS,
  functional: DEFAULT_FUNCTIONAL_PRICING,
  addons: DEFAULT_ADDON_PRICING,
  otherSystems: DEFAULT_OTHER_SYSTEM_PRICING,
  electrical: DEFAULT_ELECTRICAL_SETTINGS,
  discounts: DEFAULT_DISCOUNT_SETTINGS,
};

export const CALCULATOR_SETTINGS_ID = "calculator_settings";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCalculatorSettings(value: unknown): CalculatorSettings {
  const data = asObject(value);

  const baseSystemData = asObject(data.baseSystem);
  const baseSystem: CalculatorBaseSystemSettings = {
    projektJednaKondygnacja: asNumber(baseSystemData.projektJednaKondygnacja, DEFAULT_BASE_SYSTEM_SETTINGS.projektJednaKondygnacja),
    projektWieleKondygnacji: asNumber(baseSystemData.projektWieleKondygnacji, DEFAULT_BASE_SYSTEM_SETTINGS.projektWieleKondygnacji),
    projektDuzyDomProgM2: asNumber(baseSystemData.projektDuzyDomProgM2, DEFAULT_BASE_SYSTEM_SETTINGS.projektDuzyDomProgM2),
    projektDuzyDomDoplata: asNumber(baseSystemData.projektDuzyDomDoplata, DEFAULT_BASE_SYSTEM_SETTINGS.projektDuzyDomDoplata),
    rozdzielniaWykonanieJednaKondygnacja: asNumber(
      baseSystemData.rozdzielniaWykonanieJednaKondygnacja,
      DEFAULT_BASE_SYSTEM_SETTINGS.rozdzielniaWykonanieJednaKondygnacja,
    ),
    rozdzielniaWykonanieWieleKondygnacji: asNumber(
      baseSystemData.rozdzielniaWykonanieWieleKondygnacji,
      DEFAULT_BASE_SYSTEM_SETTINGS.rozdzielniaWykonanieWieleKondygnacji,
    ),
    bazaZasilanieJednaKondygnacja: asNumber(
      baseSystemData.bazaZasilanieJednaKondygnacja,
      DEFAULT_BASE_SYSTEM_SETTINGS.bazaZasilanieJednaKondygnacja,
    ),
    bazaZasilanieWieleKondygnacji: asNumber(
      baseSystemData.bazaZasilanieWieleKondygnacji,
      DEFAULT_BASE_SYSTEM_SETTINGS.bazaZasilanieWieleKondygnacji,
    ),
  };

  const functionalData = asObject(data.functional);
  const functional = {} as CalculatorFunctionalPricing;
  for (const category of CALCULATOR_FUNCTIONAL_CATEGORIES) {
    functional[category] = asNumber(functionalData[category], DEFAULT_FUNCTIONAL_PRICING[category]);
  }

  const addonsData = asObject(data.addons);
  const addons = {} as CalculatorAddonPricing;
  for (const key of CALCULATOR_ADDON_KEYS) {
    addons[key] = asNumber(addonsData[key], DEFAULT_ADDON_PRICING[key]);
  }

  const otherSystemsData = asObject(data.otherSystems);
  const otherSystems = {} as CalculatorOtherSystemPricing;
  for (const key of CALCULATOR_OTHER_SYSTEM_KEYS) {
    otherSystems[key] = asNumber(otherSystemsData[key], DEFAULT_OTHER_SYSTEM_PRICING[key]);
  }

  const electricalData = asObject(data.electrical);
  const ratesData = asObject(electricalData.rates);
  const rates = {} as CalculatorElectricalRatePricing;
  for (const type of CALCULATOR_ELECTRICAL_RATE_TYPES) {
    rates[type] = asNumber(ratesData[type], DEFAULT_ELECTRICAL_RATES[type]);
  }
  const fixedData = asObject(electricalData.fixed);
  const fixed: CalculatorElectricalFixedPricing = {
    kanalTv: asNumber(fixedData.kanalTv, DEFAULT_ELECTRICAL_FIXED_PRICING.kanalTv),
    antenaZMasztem: asNumber(fixedData.antenaZMasztem, DEFAULT_ELECTRICAL_FIXED_PRICING.antenaZMasztem),
    dzierzawaRozdzielniBudowlanej: asNumber(
      fixedData.dzierzawaRozdzielniBudowlanej,
      DEFAULT_ELECTRICAL_FIXED_PRICING.dzierzawaRozdzielniBudowlanej,
    ),
    obsadzenieRozdzielniGlownej: asNumber(
      fixedData.obsadzenieRozdzielniGlownej,
      DEFAULT_ELECTRICAL_FIXED_PRICING.obsadzenieRozdzielniGlownej,
    ),
    przylaczeZaMetr: asNumber(fixedData.przylaczeZaMetr, DEFAULT_ELECTRICAL_FIXED_PRICING.przylaczeZaMetr),
    formalnosciOdbiorowe: asNumber(fixedData.formalnosciOdbiorowe, DEFAULT_ELECTRICAL_FIXED_PRICING.formalnosciOdbiorowe),
    pomiaryWewnetrzneZaPunkt: asNumber(
      fixedData.pomiaryWewnetrzneZaPunkt,
      DEFAULT_ELECTRICAL_FIXED_PRICING.pomiaryWewnetrzneZaPunkt,
    ),
    dodatkoweBruzdowanieZaMetr: asNumber(
      fixedData.dodatkoweBruzdowanieZaMetr,
      DEFAULT_ELECTRICAL_FIXED_PRICING.dodatkoweBruzdowanieZaMetr,
    ),
  };
  const electrical: CalculatorElectricalSettings = {
    rates,
    fixed,
    referencyjnyDystansKm: asNumber(electricalData.referencyjnyDystansKm, DEFAULT_ELECTRICAL_SETTINGS.referencyjnyDystansKm),
    doplataZaKmNettoNaPunkt: asNumber(
      electricalData.doplataZaKmNettoNaPunkt,
      DEFAULT_ELECTRICAL_SETTINGS.doplataZaKmNettoNaPunkt,
    ),
  };

  const discountsData = asObject(data.discounts);
  const discounts: CalculatorDiscountSettings = {
    instalacjaKompleksowaPercent: asNumber(
      discountsData.instalacjaKompleksowaPercent,
      DEFAULT_DISCOUNT_SETTINGS.instalacjaKompleksowaPercent,
    ),
    platnoscZGoryPercent: asNumber(discountsData.platnoscZGoryPercent, DEFAULT_DISCOUNT_SETTINGS.platnoscZGoryPercent),
    inneSystemyMaxPercent: asNumber(discountsData.inneSystemyMaxPercent, DEFAULT_DISCOUNT_SETTINGS.inneSystemyMaxPercent),
  };

  return { baseSystem, functional, addons, otherSystems, electrical, discounts };
}
