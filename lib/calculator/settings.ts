import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_FUNCTIONAL_CATEGORIES,
  CALCULATOR_HOUSE_SIZE_TIERS,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  type CalculatorAddonKey,
  type CalculatorFunctionalCategory,
  type CalculatorHouseSizeTier,
  type CalculatorOtherSystemKey,
} from "@/lib/calculator/types";

/**
 * Cennik kalkulatora — edytowalny w panelu (`/kalkulacje/ustawienia`), nie w kodzie i nie przez
 * wgrywanie pliku Excel. Wartości startowe wyciągnięte z pliku
 * "Oferta cenowa Luksystem INTELIGETNY DOM_Pakiety_v21.xlsx" (arkusze KALKULATOR/Parametry/
 * ZESTAWIENIE/El rozbudowa/InneSystemy/Pakiety, ścieżka pakietu OPTIMUM) — część z nich to
 * wartości reprezentatywne (dla domu w progu 80–150 m², bez zmienności cen dla PRESTIŻ per
 * metraż) do zweryfikowania i doprecyzowania w panelu.
 */

export type CalculatorBaseSystemSettings = {
  /** Rozdzielnica: skrzynka + zugi + zabezpieczenia + materiały (KALKULATOR C7:F12). */
  rozdzielnicaSprzet: Record<CalculatorHouseSizeTier, number>;
  /** Automatyka: baza + zasilanie buforowe/rezerwowe/KNX + zasilacze LED (KALKULATOR C14:F19). */
  automatykaBaza: Record<CalculatorHouseSizeTier, number>;
  /** Projekt — dom jednokondygnacyjny (KALKULATOR C29/D29/E29, CRM!E7<=1). */
  projektJednaKondygnacja: Record<CalculatorHouseSizeTier, number>;
  /** Projekt — dom wielokondygnacyjny (CRM!E7>1). */
  projektWieleKondygnacji: Record<CalculatorHouseSizeTier, number>;
  /** Wykonanie rozdzielni na budowie — progi wg liczby punktów elektrycznych. */
  wykonanieRozdzielniProg1: number; // < 300 pkt
  wykonanieRozdzielniProg2: number; // < 600 pkt
  wykonanieRozdzielniProg3: number; // >= 600 pkt
  /** Wstępna konfiguracja. */
  konfiguracjaJednaKondygnacja: number;
  konfiguracjaWieleKondygnacji: number;
};

export const DEFAULT_BASE_SYSTEM_SETTINGS: CalculatorBaseSystemSettings = {
  rozdzielnicaSprzet: { do_80: 5650, od_80_do_150: 7950, od_150: 10750 },
  automatykaBaza: { do_80: 6800, od_80_do_150: 7350, od_150: 7350 },
  projektJednaKondygnacja: { do_80: 3000, od_80_do_150: 4000, od_150: 4000 },
  projektWieleKondygnacji: { do_80: 3000, od_80_do_150: 6000, od_150: 6000 },
  wykonanieRozdzielniProg1: 6000,
  wykonanieRozdzielniProg2: 9000,
  wykonanieRozdzielniProg3: 10500,
  konfiguracjaJednaKondygnacja: 2500,
  konfiguracjaWieleKondygnacji: 1500,
};

/** Cena za wybrany poziom (PODSTAWA/KOMFORT/PRESTIŻ) danej kategorii funkcjonalnej — netto. */
export type CalculatorFunctionalPricing = Record<
  CalculatorFunctionalCategory,
  Record<"podstawa" | "komfort" | "prestiz", number>
>;

export const DEFAULT_FUNCTIONAL_PRICING: CalculatorFunctionalPricing = {
  oswietlenie: { podstawa: 5550, komfort: 7850, prestiz: 10300 },
  bezpieczenstwo: { podstawa: 7350, komfort: 9100, prestiz: 14500 },
  temperatura: { podstawa: 3150, komfort: 4350, prestiz: 4350 },
  rolety: { podstawa: 1200, komfort: 4400, prestiz: 4400 },
  zewnetrzne: { podstawa: 3150, komfort: 5000, prestiz: 5000 },
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

/** Cena bazowa per system (dla domyślnych ilości — kamer/stref itd. doliczane w silniku). */
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

export type CalculatorElectricalSettings = {
  /** Zryczałtowana cena za punkt elektryczny (uproszczenie modelu 5-stawkowego z El rozbudowa). */
  cenaZaPunkt: number;
};

export const DEFAULT_ELECTRICAL_SETTINGS: CalculatorElectricalSettings = {
  cenaZaPunkt: 150,
};

export type CalculatorDiscountSettings = {
  /** Rabat na projekt przy kompleksowej instalacji elektrycznej (% ceny projektu). */
  projektKompleksowaPercent: number;
  /** Rabat na instalację elektryczną przy kompleksowości (% ceny instalacji). */
  instalacjaKompleksowaPercent: number;
  /** Rabat przy płatności z góry (% całości). */
  platnoscZGoryPercent: number;
  /** Maksymalny rabat na "inne systemy", proporcjonalny do liczby wybranych spośród wszystkich. */
  inneSystemyMaxPercent: number;
};

export const DEFAULT_DISCOUNT_SETTINGS: CalculatorDiscountSettings = {
  projektKompleksowaPercent: 50,
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

function normalizeHouseSizeRecord(
  value: unknown,
  fallback: Record<CalculatorHouseSizeTier, number>,
): Record<CalculatorHouseSizeTier, number> {
  const data = asObject(value);
  const result = {} as Record<CalculatorHouseSizeTier, number>;
  for (const tier of CALCULATOR_HOUSE_SIZE_TIERS) {
    result[tier] = asNumber(data[tier], fallback[tier]);
  }
  return result;
}

export function normalizeCalculatorSettings(value: unknown): CalculatorSettings {
  const data = asObject(value);

  const baseSystemData = asObject(data.baseSystem);
  const baseSystem: CalculatorBaseSystemSettings = {
    rozdzielnicaSprzet: normalizeHouseSizeRecord(baseSystemData.rozdzielnicaSprzet, DEFAULT_BASE_SYSTEM_SETTINGS.rozdzielnicaSprzet),
    automatykaBaza: normalizeHouseSizeRecord(baseSystemData.automatykaBaza, DEFAULT_BASE_SYSTEM_SETTINGS.automatykaBaza),
    projektJednaKondygnacja: normalizeHouseSizeRecord(
      baseSystemData.projektJednaKondygnacja,
      DEFAULT_BASE_SYSTEM_SETTINGS.projektJednaKondygnacja,
    ),
    projektWieleKondygnacji: normalizeHouseSizeRecord(
      baseSystemData.projektWieleKondygnacji,
      DEFAULT_BASE_SYSTEM_SETTINGS.projektWieleKondygnacji,
    ),
    wykonanieRozdzielniProg1: asNumber(baseSystemData.wykonanieRozdzielniProg1, DEFAULT_BASE_SYSTEM_SETTINGS.wykonanieRozdzielniProg1),
    wykonanieRozdzielniProg2: asNumber(baseSystemData.wykonanieRozdzielniProg2, DEFAULT_BASE_SYSTEM_SETTINGS.wykonanieRozdzielniProg2),
    wykonanieRozdzielniProg3: asNumber(baseSystemData.wykonanieRozdzielniProg3, DEFAULT_BASE_SYSTEM_SETTINGS.wykonanieRozdzielniProg3),
    konfiguracjaJednaKondygnacja: asNumber(
      baseSystemData.konfiguracjaJednaKondygnacja,
      DEFAULT_BASE_SYSTEM_SETTINGS.konfiguracjaJednaKondygnacja,
    ),
    konfiguracjaWieleKondygnacji: asNumber(
      baseSystemData.konfiguracjaWieleKondygnacji,
      DEFAULT_BASE_SYSTEM_SETTINGS.konfiguracjaWieleKondygnacji,
    ),
  };

  const functionalData = asObject(data.functional);
  const functional = {} as CalculatorFunctionalPricing;
  for (const category of CALCULATOR_FUNCTIONAL_CATEGORIES) {
    const categoryData = asObject(functionalData[category]);
    const fallback = DEFAULT_FUNCTIONAL_PRICING[category];
    functional[category] = {
      podstawa: asNumber(categoryData.podstawa, fallback.podstawa),
      komfort: asNumber(categoryData.komfort, fallback.komfort),
      prestiz: asNumber(categoryData.prestiz, fallback.prestiz),
    };
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
  const electrical: CalculatorElectricalSettings = {
    cenaZaPunkt: asNumber(electricalData.cenaZaPunkt, DEFAULT_ELECTRICAL_SETTINGS.cenaZaPunkt),
  };

  const discountsData = asObject(data.discounts);
  const discounts: CalculatorDiscountSettings = {
    projektKompleksowaPercent: asNumber(discountsData.projektKompleksowaPercent, DEFAULT_DISCOUNT_SETTINGS.projektKompleksowaPercent),
    instalacjaKompleksowaPercent: asNumber(
      discountsData.instalacjaKompleksowaPercent,
      DEFAULT_DISCOUNT_SETTINGS.instalacjaKompleksowaPercent,
    ),
    platnoscZGoryPercent: asNumber(discountsData.platnoscZGoryPercent, DEFAULT_DISCOUNT_SETTINGS.platnoscZGoryPercent),
    inneSystemyMaxPercent: asNumber(discountsData.inneSystemyMaxPercent, DEFAULT_DISCOUNT_SETTINGS.inneSystemyMaxPercent),
  };

  return { baseSystem, functional, addons, otherSystems, electrical, discounts };
}
