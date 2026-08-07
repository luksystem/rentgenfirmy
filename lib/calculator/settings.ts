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
};

export const DEFAULT_BASE_SYSTEM_SETTINGS: CalculatorBaseSystemSettings = {
  projektJednaKondygnacja: 4000,
  projektWieleKondygnacji: 6000,
  projektDuzyDomProgM2: 400,
  projektDuzyDomDoplata: 2000,
};

/**
 * Baza systemu — sterownik, zasilanie, wstępna konfiguracja, logistyka (DANE!T111 = KALKULATOR!
 * N32+N35+N36+Parametry!D65). Zweryfikowane 1:1 na dwóch realnych przykładach oferty (15437.20 zł
 * i 9483.916667 zł — dokładnie zgodne z arkuszem, w tym składowa logistyki zależna od odległości).
 */
export type CalculatorBazaZasilaniaSettings = {
  /** Wstępna konfiguracja (KALKULATOR!N32) — wg liczby kondygnacji, ×współczynnik rozdzielnica. */
  wstepnaKonfiguracjaJednaKondygnacja: number;
  wstepnaKonfiguracjaWieleKondygnacji: number;
  /** Automatyka podstawa (N35) — standard vs rozszerzenie KNX. */
  automatykaPodstawaStandard: number;
  automatykaPodstawaKnx: number;
  /** Zasilanie buforowe + rezerwowe (N36) — stałe, niezależne od kondygnacji/KNX. */
  zasilanieBuforoweRezerwowe: number;
  /** Zasilanie KNX — dopłata gdy rozszerzenieKnx=true (N36). */
  zasilanieKnxDoplata: number;
  /** Zasilacze LED — cena za jednostkę modułu RGBW (ta sama ilość co w kategorii Oświetlenie, ZESTAWIENIE!L10/3×700). */
  zasilaczeLedZaModulRgbw: number;
  /** Zasilacze LED — dopłata gdy wybrany dodatek "Dodatkowy zasilacz UPS" (CRM!K7). */
  zasilaczeLedUpsRoletyDoplata: number;
  /** Linki i materiały dodatkowe (N36) — różne dla jednej/wielu kondygnacji. */
  linkiMaterialyJednaKondygnacja: number;
  linkiMaterialyWieleKondygnacji: number;
  /** Oznaczniki/końcówki (N36) — stałe. */
  oznaczniki: number;
  /** Sprzęt przy "tylko rozdzielnia" (CRM!S8=true, SprzetRG!L36) — rzadki przypadek biurowy. */
  tylkoRozdzielniaSprzet: number;
  /** Logistyka (Parametry!D65 = WYJAZDY!L15 × trudny klient) — koszt paliwa za km (w obie strony, już ×0.85×2). */
  logistykaPaliwoZaKm: number;
  /** Logistyka — dieta za dzień/osobę, dolicza się gdy odległość jednostronna > logistykaProgDietyKm. */
  logistykaDietaStawka: number;
  logistykaProgDietyKm: number;
  /** Logistyka — nocleg za dzień/osobę, dolicza się gdy odległość jednostronna > logistykaProgNoclegowKm. */
  logistykaNoclegStawka: number;
  logistykaProgNoclegowKm: number;
  /** Logistyka — stawka za godzinę dojazdu, przeliczona już na złotówki za km. */
  logistykaGodzinowaZaKm: number;
  /** Logistyka — stała opłata (WYJAZDY!O4), niezależna od odległości. */
  logistykaStalaOplata: number;
};

export const DEFAULT_BAZA_ZASILANIA_SETTINGS: CalculatorBazaZasilaniaSettings = {
  wstepnaKonfiguracjaJednaKondygnacja: 2500,
  wstepnaKonfiguracjaWieleKondygnacji: 1500,
  automatykaPodstawaStandard: 2900,
  automatykaPodstawaKnx: 4900,
  zasilanieBuforoweRezerwowe: 1500,
  zasilanieKnxDoplata: 450,
  zasilaczeLedZaModulRgbw: 700 / 3,
  zasilaczeLedUpsRoletyDoplata: 500,
  linkiMaterialyJednaKondygnacja: 700,
  linkiMaterialyWieleKondygnacji: 900,
  oznaczniki: 150,
  tylkoRozdzielniaSprzet: 13300,
  logistykaPaliwoZaKm: 11.9,
  logistykaDietaStawka: 30,
  logistykaProgDietyKm: 80,
  logistykaNoclegStawka: 70,
  logistykaProgNoclegowKm: 120,
  logistykaGodzinowaZaKm: 28 / 3,
  logistykaStalaOplata: 500,
};

export const CALCULATOR_BAZA_ZASILANIA_LABELS: Record<keyof CalculatorBazaZasilaniaSettings, string> = {
  wstepnaKonfiguracjaJednaKondygnacja: "Wstępna konfiguracja — jedna kondygnacja",
  wstepnaKonfiguracjaWieleKondygnacji: "Wstępna konfiguracja — wiele kondygnacji",
  automatykaPodstawaStandard: "Automatyka podstawa — standard",
  automatykaPodstawaKnx: "Automatyka podstawa — rozszerzenie KNX",
  zasilanieBuforoweRezerwowe: "Zasilanie buforowe + rezerwowe",
  zasilanieKnxDoplata: "Zasilanie KNX — dopłata",
  zasilaczeLedZaModulRgbw: "Zasilacze LED — za moduł RGBW",
  zasilaczeLedUpsRoletyDoplata: "Zasilacze LED — dopłata za UPS rolet",
  linkiMaterialyJednaKondygnacja: "Linki i materiały — jedna kondygnacja",
  linkiMaterialyWieleKondygnacji: "Linki i materiały — wiele kondygnacji",
  oznaczniki: "Oznaczniki / końcówki",
  tylkoRozdzielniaSprzet: "Sprzęt przy „tylko rozdzielnia”",
  logistykaPaliwoZaKm: "Logistyka — paliwo za km",
  logistykaDietaStawka: "Logistyka — dieta (stawka)",
  logistykaProgDietyKm: "Logistyka — próg diety [km, jednostronnie]",
  logistykaNoclegStawka: "Logistyka — nocleg (stawka)",
  logistykaProgNoclegowKm: "Logistyka — próg noclegu [km, jednostronnie]",
  logistykaGodzinowaZaKm: "Logistyka — stawka godzinowa za km",
  logistykaStalaOplata: "Logistyka — opłata stała",
};

/**
 * "Wykonanie Rozdzielni" (DANE!T110) — zweryfikowane jako suma DWÓCH niezależnych składowych
 * (KALKULATOR!N30+N31), obie ostatecznie mnożone przez współczynnik rozdzielnica (CRM!Q24):
 * 1) Sprzęt rozdzielni (skrzynka+zugi+zabezpieczenia) wg liczby kondygnacji, ×(1+wzrostCen);
 * 2) Cena progowa wg CAŁKOWITEJ liczby punktów elektrycznych w instalacji (El rozbudowa!Q41) —
 *    NIEZALEŻNA od liczby kondygnacji (formuła identyczna dla obu progów kondygnacji w źródle).
 * Liczbę punktów liczy silnik z tych samych odpowiedzi co pozycje instalacji elektrycznej (patrz
 * calculateElectricalPointsTotal w engine.ts) — przybliżenie bloku "podstawowe wyposażenie"
 * (zależnego w źródle od zdublowanego arkusza SprzetSMART) stałą wartością punktową.
 */
export type CalculatorRozdzielniaSettings = {
  sprzetJednaKondygnacja: number;
  sprzetWieleKondygnacji: number;
  wzrostCenProcent: number;
  progPunktowNiski: number;
  progPunktowWysoki: number;
  cenaPonizejProguNiskiego: number;
  cenaPonizejProguWysokiego: number;
  cenaPowyzejProguWysokiego: number;
  /** Punktowy odpowiednik bloku "podstawowe wyposażenie" (El rozbudowa, w. 10–32) — zweryfikowany empirycznie jako względnie stały. */
  podstawoweWyposazeniePunkty: number;
};

export const DEFAULT_ROZDZIELNIA_SETTINGS: CalculatorRozdzielniaSettings = {
  sprzetJednaKondygnacja: 7100,
  sprzetWieleKondygnacji: 9700,
  wzrostCenProcent: 20,
  progPunktowNiski: 300,
  progPunktowWysoki: 600,
  cenaPonizejProguNiskiego: 6000,
  cenaPonizejProguWysokiego: 9000,
  cenaPowyzejProguWysokiego: 10500,
  podstawoweWyposazeniePunkty: 61,
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
  /** Nieużywane — cena zależy od hardware.kontaktronOknoDrzwiStandard/Fabryczne (patrz addonUnitPrice w engine.ts). */
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

/**
 * Cena per system. sieciLan/telewizja/wideodomofon/monitoring/naglosnienie/multiroom są tu
 * NIEUŻYWANE — ich rzeczywista cena to lista materiałowa (BOM) z warunkami, licz ona z
 * `otherSystemsCatalog` (patrz calculateOtherSystems w engine.ts). Sauna i alarm tymczasowy to
 * jedyne prawdziwie stałe ceny.
 */
export const DEFAULT_OTHER_SYSTEM_PRICING: CalculatorOtherSystemPricing = {
  sieciLan: 0,
  telewizja: 0,
  wideodomofon: 0,
  monitoring: 0,
  naglosnienie: 0,
  multiroom: 0,
  /** InneSystemy!V13 (kolumna OPTIMUM, pozycja "SAUNA") — stała, niezależna od parametrów domu. */
  sauna: 5430,
  alarmTymczasowy: 1000,
};

/**
 * Katalog cen "Inne systemy" (InneSystemy!C:S) — składowe wykorzystywane w obliczeniach BOM per
 * system w `calculateOtherSystems` (engine.ts), zweryfikowane 1:1 na realnym przykładzie oferty
 * (LAN=6660, TV=1920, Wideodomofon=5470, Monitoring=13300, Multiroom=6734, Nagłośnienie=8500,
 * suma zgodna z DANE!T119=32164 dla wybranych systemów).
 */
export type CalculatorOtherSystemsCatalog = {
  lanSzafkaRack: number;
  lanBaza: number;
  lanDodatek: number;
  lanZaPunktAP: number;
  lanDrugaSzafka: number;

  tvBaza: number;
  tvMultiswitchDoplata: number;
  tvDodatek: number;
  tvAntena: number;

  wideodomofonBaza: number;
  wideodomofonLoxoneMaly: number;
  /** Dopłata za większy moduł Loxone (delta I6-I4 w źródle) — nie pełna cena I6. */
  wideodomofonLoxoneDuzyDoplata: number;
  wideodomofonDodatkowy: number;

  monitoringRejestratorBaza: number;
  monitoringKameraStandard: number;
  monitoringKamera8Mpx: number;
  monitoringWyjscieStandard: number;
  monitoringWyjscie8Mpx: number;
  monitoringBezRejestratoraStandard: number;
  monitoringBezRejestratora8Mpx: number;
  monitoringSzafaStandard: number;
  monitoringSzafa8Mpx: number;
  monitoringDodatekStandard: number;
  monitoringDodatek8Mpx: number;

  multiroomBaza: number;
  multiroomStrefaDodatkowaPowyzej4: number;
  multiroomZaGlosnik: number;
  multiroomZaSkrzynke: number;
  multiroomDodatek1: number;
  multiroomStrefaBazowa: number;
  multiroomDodatek2: number;
  multiroomStrefaMnoznik: number;
  multiroomGlosnikMnoznik: number;
  multiroomStala: number;

  naglosnienieBaza: number;
  naglosnienieSrodkowy: number;
  naglosnienieDodatekWC: number;
  naglosnienieKolejny: number;
};

export const DEFAULT_OTHER_SYSTEMS_CATALOG: CalculatorOtherSystemsCatalog = {
  lanSzafkaRack: 600,
  lanBaza: 400,
  lanDodatek: 60,
  lanZaPunktAP: 700,
  lanDrugaSzafka: 1400,

  tvBaza: 300,
  tvMultiswitchDoplata: 800,
  tvDodatek: 120,
  tvAntena: 1500,

  wideodomofonBaza: 2800,
  wideodomofonLoxoneMaly: 270,
  wideodomofonLoxoneDuzyDoplata: 1400,
  wideodomofonDodatkowy: 500,

  monitoringRejestratorBaza: 600,
  monitoringKameraStandard: 400,
  monitoringKamera8Mpx: 600,
  monitoringWyjscieStandard: 800,
  monitoringWyjscie8Mpx: 1100,
  monitoringBezRejestratoraStandard: 800,
  monitoringBezRejestratora8Mpx: 1300,
  monitoringSzafaStandard: 1700,
  monitoringSzafa8Mpx: 2100,
  monitoringDodatekStandard: 600,
  monitoringDodatek8Mpx: 1200,

  multiroomBaza: 1850,
  multiroomStrefaDodatkowaPowyzej4: 925,
  multiroomZaGlosnik: 430,
  multiroomZaSkrzynke: 174.1,
  multiroomDodatek1: 400,
  multiroomStrefaBazowa: 564,
  multiroomDodatek2: 200,
  multiroomStrefaMnoznik: 100,
  multiroomGlosnikMnoznik: 200,
  multiroomStala: 1000,

  naglosnienieBaza: 3000,
  naglosnienieSrodkowy: 4500,
  naglosnienieDodatekWC: 430,
  naglosnienieKolejny: 1000,
};

export const CALCULATOR_OTHER_SYSTEMS_CATALOG_LABELS: Record<keyof CalculatorOtherSystemsCatalog, string> = {
  lanSzafkaRack: "LAN — szafka RACK",
  lanBaza: "LAN — baza",
  lanDodatek: "LAN — dodatek",
  lanZaPunktAP: "LAN — za punkt dostępowy (AP)",
  lanDrugaSzafka: "LAN — druga szafka",

  tvBaza: "TV — baza",
  tvMultiswitchDoplata: "TV — dopłata za multiswitch",
  tvDodatek: "TV — dodatek",
  tvAntena: "TV — antena",

  wideodomofonBaza: "Wideodomofon — baza",
  wideodomofonLoxoneMaly: "Wideodomofon — moduł Loxone (mały)",
  wideodomofonLoxoneDuzyDoplata: "Wideodomofon — moduł Loxone (dopłata, duży)",
  wideodomofonDodatkowy: "Wideodomofon — dodatkowy",

  monitoringRejestratorBaza: "Monitoring — rejestrator (baza)",
  monitoringKameraStandard: "Monitoring — kamera (standard)",
  monitoringKamera8Mpx: "Monitoring — kamera (8Mpx)",
  monitoringWyjscieStandard: "Monitoring — wyjście (standard)",
  monitoringWyjscie8Mpx: "Monitoring — wyjście (8Mpx)",
  monitoringBezRejestratoraStandard: "Monitoring — bez rejestratora (standard)",
  monitoringBezRejestratora8Mpx: "Monitoring — bez rejestratora (8Mpx)",
  monitoringSzafaStandard: "Monitoring — szafa (standard)",
  monitoringSzafa8Mpx: "Monitoring — szafa (8Mpx)",
  monitoringDodatekStandard: "Monitoring — dodatek (standard)",
  monitoringDodatek8Mpx: "Monitoring — dodatek (8Mpx)",

  multiroomBaza: "Multiroom — baza",
  multiroomStrefaDodatkowaPowyzej4: "Multiroom — strefa dodatkowa (powyżej 4)",
  multiroomZaGlosnik: "Multiroom — za głośnik",
  multiroomZaSkrzynke: "Multiroom — za skrzynkę",
  multiroomDodatek1: "Multiroom — dodatek 1",
  multiroomStrefaBazowa: "Multiroom — strefa bazowa (za 4 strefy)",
  multiroomDodatek2: "Multiroom — dodatek 2",
  multiroomStrefaMnoznik: "Multiroom — mnożnik za strefę",
  multiroomGlosnikMnoznik: "Multiroom — mnożnik za głośnik",
  multiroomStala: "Multiroom — stała",

  naglosnienieBaza: "Nagłośnienie — baza",
  naglosnienieSrodkowy: "Nagłośnienie — środkowy",
  naglosnienieDodatekWC: "Nagłośnienie — dopłata za głośnik w WC",
  naglosnienieKolejny: "Nagłośnienie — kolejny",
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
  bazaZasilania: CalculatorBazaZasilaniaSettings;
  rozdzielnia: CalculatorRozdzielniaSettings;
  hardware: CalculatorHardwareCatalog;
  laborRatePerHour: number;
  addons: CalculatorAddonPricing;
  otherSystems: CalculatorOtherSystemPricing;
  otherSystemsCatalog: CalculatorOtherSystemsCatalog;
  electrical: CalculatorElectricalSettings;
  discounts: CalculatorDiscountSettings;
  extras: CalculatorExtrasSettings;
};

export const DEFAULT_CALCULATOR_SETTINGS: CalculatorSettings = {
  baseSystem: DEFAULT_BASE_SYSTEM_SETTINGS,
  bazaZasilania: DEFAULT_BAZA_ZASILANIA_SETTINGS,
  rozdzielnia: DEFAULT_ROZDZIELNIA_SETTINGS,
  hardware: DEFAULT_HARDWARE_CATALOG,
  laborRatePerHour: DEFAULT_LABOR_RATE_PER_HOUR,
  addons: DEFAULT_ADDON_PRICING,
  otherSystems: DEFAULT_OTHER_SYSTEM_PRICING,
  otherSystemsCatalog: DEFAULT_OTHER_SYSTEMS_CATALOG,
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
  };

  const bazaZasilaniaData = asObject(data.bazaZasilania);
  const bazaZasilania = {} as CalculatorBazaZasilaniaSettings;
  for (const key of Object.keys(DEFAULT_BAZA_ZASILANIA_SETTINGS) as (keyof CalculatorBazaZasilaniaSettings)[]) {
    bazaZasilania[key] = asNumber(bazaZasilaniaData[key], DEFAULT_BAZA_ZASILANIA_SETTINGS[key]);
  }

  const rozdzielniaData = asObject(data.rozdzielnia);
  const rozdzielnia: CalculatorRozdzielniaSettings = {
    sprzetJednaKondygnacja: asNumber(rozdzielniaData.sprzetJednaKondygnacja, DEFAULT_ROZDZIELNIA_SETTINGS.sprzetJednaKondygnacja),
    sprzetWieleKondygnacji: asNumber(rozdzielniaData.sprzetWieleKondygnacji, DEFAULT_ROZDZIELNIA_SETTINGS.sprzetWieleKondygnacji),
    wzrostCenProcent: asNumber(rozdzielniaData.wzrostCenProcent, DEFAULT_ROZDZIELNIA_SETTINGS.wzrostCenProcent),
    progPunktowNiski: asNumber(rozdzielniaData.progPunktowNiski, DEFAULT_ROZDZIELNIA_SETTINGS.progPunktowNiski),
    progPunktowWysoki: asNumber(rozdzielniaData.progPunktowWysoki, DEFAULT_ROZDZIELNIA_SETTINGS.progPunktowWysoki),
    cenaPonizejProguNiskiego: asNumber(
      rozdzielniaData.cenaPonizejProguNiskiego,
      DEFAULT_ROZDZIELNIA_SETTINGS.cenaPonizejProguNiskiego,
    ),
    cenaPonizejProguWysokiego: asNumber(
      rozdzielniaData.cenaPonizejProguWysokiego,
      DEFAULT_ROZDZIELNIA_SETTINGS.cenaPonizejProguWysokiego,
    ),
    cenaPowyzejProguWysokiego: asNumber(
      rozdzielniaData.cenaPowyzejProguWysokiego,
      DEFAULT_ROZDZIELNIA_SETTINGS.cenaPowyzejProguWysokiego,
    ),
    podstawoweWyposazeniePunkty: asNumber(
      rozdzielniaData.podstawoweWyposazeniePunkty,
      DEFAULT_ROZDZIELNIA_SETTINGS.podstawoweWyposazeniePunkty,
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

  const otherSystemsCatalogData = asObject(data.otherSystemsCatalog);
  const otherSystemsCatalog = {} as CalculatorOtherSystemsCatalog;
  for (const key of Object.keys(DEFAULT_OTHER_SYSTEMS_CATALOG) as (keyof CalculatorOtherSystemsCatalog)[]) {
    otherSystemsCatalog[key] = asNumber(otherSystemsCatalogData[key], DEFAULT_OTHER_SYSTEMS_CATALOG[key]);
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

  return {
    baseSystem,
    bazaZasilania,
    rozdzielnia,
    hardware,
    laborRatePerHour,
    addons,
    otherSystems,
    otherSystemsCatalog,
    electrical,
    discounts,
    extras,
  };
}
