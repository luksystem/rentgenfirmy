import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_ELECTRICAL_RATE_TYPES,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  type CalculatorAddonKey,
  type CalculatorElectricalRateType,
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
 * Katalog sprzętu (BOM — bill of materials) zasilający kategorie funkcjonalne. Każda kategoria
 * (Oświetlenie/Bezpieczeństwo/Temperatura/Rolety/Zewnętrzne) to suma (cena_sprzętu × ilość) po
 * pozycjach z tego katalogu — dokładnie jak w źródle (ZESTAWIENIE!F6:F65 + kolumny L/P/U/Z/AE),
 * zweryfikowane 1:1 na realnym przykładzie oferty (patrz calculateFunctionalBudgets w engine.ts).
 * Ilości per pozycja są policzone przez silnik z odpowiedzi ankiety, nie tutaj — tu tylko ceny.
 */
export type CalculatorHardwareCatalog = {
  /** Relay Loxone 14 kanałów — oświetlenie/temperatura/rolety/zewnętrzne (ZESTAWIENIE D7/D8). */
  relayLoxone14: number;
  /** Moduł RGBW — oświetlenie (D10). */
  rgbwModule: number;
  /** Czujka Loxone — oświetlenie, sic (D32) — w źródle liczona w tej kategorii, nie w bezpieczeństwie. */
  czujkaLoxone: number;
  /** Extension DI — bezpieczeństwo (D14). */
  extensionDI: number;
  /** Zawór odcięcia wody — bezpieczeństwo (D19). */
  zaworOdciecia: number;
  /** Centrala Alarmowa baza — bezpieczeństwo (D21). */
  centralaAlarmowa: number;
  /** INT-KNX — bezpieczeństwo (D22). */
  intKnx: number;
  /** Syrena alarmowa — bezpieczeństwo (D23), zawsze wliczona. */
  syrenaAlarmowa: number;
  /** Czujki sufitowe — bezpieczeństwo (D24). */
  czujkiSufitowe: number;
  /** Czujki Dualne — bezpieczeństwo (D29). */
  czujkiDualne: number;
  /** Czujki bezpieczeństwa (dym/uśpienie) — bezpieczeństwo (D31). */
  czujkiBezpieczenstwaSprzet: number;
  /** Kontaktron brama — bezpieczeństwo (D35). */
  kontaktronBrama: number;
  /** Kontaktron okno/drzwi — cena standardowa, gdy okna NIE mają fabrycznych czujników (D36). */
  kontaktronOknoDrzwiStandard: number;
  /** Kontaktron okno/drzwi — cena obniżona, gdy okna MAJĄ fabryczne czujniki (D36). */
  kontaktronOknoDrzwiFabryczne: number;
  /** Czujka zalania — bezpieczeństwo (D37). */
  czujkaZalania: number;
  /** Klawiatura mała — bezpieczeństwo, tylko przy architekturze SATEL (D40). */
  klawiaturaMala: number;
  /** Klawiatura garaż strefowa — bezpieczeństwo, tylko przy architekturze SATEL (D41). */
  klawiaturaGarazStrefowa: number;
  /** Siłownik Salus — temperatura (D44). */
  silownikSalus: number;
  /** Głowica grzejnika — temperatura (D45). */
  glowicaGrzejnika: number;
  /** Czujniki 1-wire — temperatura (D46). */
  czujniki1Wire: number;
  /** 1-wire Ext — temperatura, gdy zaznaczone "Oświetlenie" (D12). */
  oneWireExt: number;
  /** Czujnik deszczu + zasilacz + zawory podlewania — zewnętrzne, zawsze wliczony gdy kategoria aktywna (D39). */
  czujnikDeszczuZestaw: number;
};

export const DEFAULT_HARDWARE_CATALOG: CalculatorHardwareCatalog = {
  relayLoxone14: 1584.7,
  rgbwModule: 487.6,
  czujkaLoxone: 487.6,
  extensionDI: 1828.5,
  zaworOdciecia: 792.35,
  centralaAlarmowa: 4632.2,
  intKnx: 1219.0,
  syrenaAlarmowa: 365.7,
  czujkiSufitowe: 275.6,
  czujkiDualne: 268.18,
  czujkiBezpieczenstwaSprzet: 381.6,
  kontaktronBrama: 365.7,
  kontaktronOknoDrzwiStandard: 270,
  kontaktronOknoDrzwiFabryczne: 120,
  czujkaZalania: 426.65,
  klawiaturaMala: 1340.9,
  klawiaturaGarazStrefowa: 670.45,
  silownikSalus: 146.28,
  glowicaGrzejnika: 548.55,
  czujniki1Wire: 182.85,
  oneWireExt: 792.35,
  czujnikDeszczuZestaw: 1462.8,
};

/** Stawka roboczogodziny (ZESTAWIENIE!F70) doliczana do czasu pracy per kategoria funkcjonalna. */
export const DEFAULT_LABOR_RATE_PER_HOUR = 120;

export const CALCULATOR_HARDWARE_LABELS: Record<keyof CalculatorHardwareCatalog, string> = {
  relayLoxone14: "Relay Loxone 14 kanałów",
  rgbwModule: "Moduł RGBW",
  czujkaLoxone: "Czujka Loxone",
  extensionDI: "Extension DI",
  zaworOdciecia: "Zawór odcięcia wody",
  centralaAlarmowa: "Centrala Alarmowa (baza)",
  intKnx: "INT-KNX",
  syrenaAlarmowa: "Syrena alarmowa",
  czujkiSufitowe: "Czujki sufitowe",
  czujkiDualne: "Czujki Dualne",
  czujkiBezpieczenstwaSprzet: "Czujki bezpieczeństwa (dym/uśpienie)",
  kontaktronBrama: "Kontaktron brama",
  kontaktronOknoDrzwiStandard: "Kontaktron okno/drzwi — standard",
  kontaktronOknoDrzwiFabryczne: "Kontaktron okno/drzwi — okna z fabrycznym czujnikiem",
  czujkaZalania: "Czujka zalania",
  klawiaturaMala: "Klawiatura mała (SATEL)",
  klawiaturaGarazStrefowa: "Klawiatura garaż strefowa (SATEL)",
  silownikSalus: "Siłownik Salus",
  glowicaGrzejnika: "Głowica grzejnika",
  czujniki1Wire: "Czujniki 1-wire",
  oneWireExt: "1-wire Ext",
  czujnikDeszczuZestaw: "Czujnik deszczu + zasilacz + zawory podlewania",
};

export type CalculatorAddonPricing = Record<CalculatorAddonKey, number>;

/**
 * Cena jednostkowa dodatku (DANE!T77:T94), zweryfikowana 1:1 na realnym przykładzie oferty —
 * ilość per pozycja liczy silnik (patrz calculateAddons w engine.ts), tu tylko cena za sztukę.
 */
export const DEFAULT_ADDON_PRICING: CalculatorAddonPricing = {
  stacjaPogodowa: 3150,
  oswietlenieSciemniane230V: 2316.1,
  oswietlenieKoloroweRGBW: 687.6,
  czujnikiOtwarciaOkien: 270,
  klawiaturyNfc: 1950.4,
  przygotowanieDostepuDrzwi: 731.4,
  bezpieczenstwoPlusPlusPlus: 609.5,
  sterowaneGniazda: 2681.8,
  dodatkowyLicznikPradu: 1828.5,
  dodatkowyZasilaczUps: 1900,
  rozdzielniaPlusPlusPlus: 3500,
  budzikInteligentny: 1500,
  przyciskUkryty: 1500,
  stacjaDokujacaIpad: 1462.8,
  ipad: 2925.6,
  oswietlenieAwaryjne: 1462.8,
  integracjeZInnymiSystemami: 1950.4,
  dokumentacjaPowykonawcza: 0,
  ustaleniaZInnymiBranzami: 3000,
  konsultacjeZdalne24_7: 3000,
  przedluzenieGwarancji12Miesiecy: 4000,
  gwarancjaCenyOfertowej: 1500,
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
  /**
   * Bazowe wyposażenie instalacji — czujki, bramy, furtka, domofon, rozdzielnice pomocnicze
   * (El rozbudowa, wiersze 10–32 — "BAZA SYSTEMU" peryferiów). Zweryfikowane empirycznie jako
   * niemal stałe (~4239 zł), niezależnie od większości parametrów domu — zawsze wliczane.
   */
  podstawoweWyposazenieInstalacji: number;
  /** Dopłata za każdą bramę garażową (kontaktron) — zweryfikowana empirycznie: +162 zł/bramę. */
  doplataZaBrameGarazowa: number;
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
  podstawoweWyposazenieInstalacji: 4239,
  doplataZaBrameGarazowa: 162,
};

/**
 * Przyciski i dodatkowe czujki — w arkuszu źródłowym oznaczone jako "do ustalenia z Inwestorem"
 * (sterowane wewnętrzną checklistą przypisań pokój-po-pokoju, nie prostym wzorem ilość×cena).
 * Tu uproszczone do ilość × cena orientacyjna — do potwierdzenia indywidualnie z klientem,
 * dokładnie jak w źródle.
 */
export type CalculatorExtrasSettings = {
  cenaPrzyciskuPrestiz: number;
  cenaPrzyciskuNormal: number;
  cenaZaDodatkowaCzujke: number;
};

export const DEFAULT_EXTRAS_SETTINGS: CalculatorExtrasSettings = {
  cenaPrzyciskuPrestiz: 600,
  cenaPrzyciskuNormal: 400,
  cenaZaDodatkowaCzujke: 300,
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
  hardware: CalculatorHardwareCatalog;
  laborRatePerHour: number;
  addons: CalculatorAddonPricing;
  otherSystems: CalculatorOtherSystemPricing;
  electrical: CalculatorElectricalSettings;
  discounts: CalculatorDiscountSettings;
  extras: CalculatorExtrasSettings;
};

export const DEFAULT_CALCULATOR_SETTINGS: CalculatorSettings = {
  baseSystem: DEFAULT_BASE_SYSTEM_SETTINGS,
  hardware: DEFAULT_HARDWARE_CATALOG,
  laborRatePerHour: DEFAULT_LABOR_RATE_PER_HOUR,
  addons: DEFAULT_ADDON_PRICING,
  otherSystems: DEFAULT_OTHER_SYSTEM_PRICING,
  electrical: DEFAULT_ELECTRICAL_SETTINGS,
  discounts: DEFAULT_DISCOUNT_SETTINGS,
  extras: DEFAULT_EXTRAS_SETTINGS,
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

  const hardwareData = asObject(data.hardware);
  const hardware = {} as CalculatorHardwareCatalog;
  for (const key of Object.keys(DEFAULT_HARDWARE_CATALOG) as (keyof CalculatorHardwareCatalog)[]) {
    hardware[key] = asNumber(hardwareData[key], DEFAULT_HARDWARE_CATALOG[key]);
  }
  const laborRatePerHour = asNumber(data.laborRatePerHour, DEFAULT_LABOR_RATE_PER_HOUR);

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
    podstawoweWyposazenieInstalacji: asNumber(
      fixedData.podstawoweWyposazenieInstalacji,
      DEFAULT_ELECTRICAL_FIXED_PRICING.podstawoweWyposazenieInstalacji,
    ),
    doplataZaBrameGarazowa: asNumber(fixedData.doplataZaBrameGarazowa, DEFAULT_ELECTRICAL_FIXED_PRICING.doplataZaBrameGarazowa),
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

  const extrasData = asObject(data.extras);
  const extras: CalculatorExtrasSettings = {
    cenaPrzyciskuPrestiz: asNumber(extrasData.cenaPrzyciskuPrestiz, DEFAULT_EXTRAS_SETTINGS.cenaPrzyciskuPrestiz),
    cenaPrzyciskuNormal: asNumber(extrasData.cenaPrzyciskuNormal, DEFAULT_EXTRAS_SETTINGS.cenaPrzyciskuNormal),
    cenaZaDodatkowaCzujke: asNumber(extrasData.cenaZaDodatkowaCzujke, DEFAULT_EXTRAS_SETTINGS.cenaZaDodatkowaCzujke),
  };

  return { baseSystem, hardware, laborRatePerHour, addons, otherSystems, electrical, discounts, extras };
}
