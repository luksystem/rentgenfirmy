import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_FUNCTIONAL_CATEGORIES,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  type CalculatorAddonKey,
  type CalculatorAnswers,
  type CalculatorElectricalRateType,
  type CalculatorFunctionalCategory,
  type CalculatorOtherSystemKey,
} from "@/lib/calculator/types";
import {
  CALCULATOR_HARDWARE_LABELS,
  type CalculatorHardwareCatalog,
  type CalculatorOtherSystemsCatalog,
  type CalculatorSettings,
} from "@/lib/calculator/settings";

/**
 * Silnik przeliczeń kalkulatora — odpowiednik łańcucha arkuszy KALKULATOR -> ZESTAWIENIE ->
 * DANE -> Pakiety z pliku źródłowego, ograniczony do ścieżki pakietu OPTIMUM i tylko do ceny
 * dla klienta (bez wewnętrznej kalkulacji marży/kosztu sprzętu). Wszystko czyste funkcje —
 * używane identycznie w formularzu (na żywo), przy generowaniu PDF i przy tworzeniu umowy,
 * wzorem `lib/contracts/totals.ts`. Wartości bazowe w `settings.ts` zweryfikowane empirycznie
 * przeciw źródłowemu plikowi (biblioteka `formulas`) — patrz komentarz w `types.ts`.
 */

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundUp(value: number) {
  return Math.ceil(Math.max(0, value));
}

/**
 * Ilość sterowanych obwodów ON/OFF 230V (CRM!O4) — zweryfikowana formuła źródłowa, używana
 * zarówno w kategorii funkcjonalnej "Oświetlenie" (ZESTAWIENIE!L8 -> Parametry!G15 -> N14) jak i
 * w pozycji "Oświetlenie — punkty" instalacji elektrycznej (zastępuje wcześniejszą heurystykę).
 */
function obwodyOswietleniaOnOff(answers: CalculatorAnswers): number {
  return (
    (answers.strefaPrywatna ? 4 : 0) +
    (answers.strefaOtwarta ? 6 : 0) +
    (answers.komunikacja ? 2 : 0) +
    answers.liczbaSypialniDodatkowych * 2 +
    answers.liczbaPomieszczenWilgotnych * 1 +
    answers.liczbaPozostalychPomieszczen * 2 +
    answers.iloscGarazy * 2
  );
}

/** Ilość obwodów ściemnianych listw LED 24V (DANE!M17) — dodatkowa składowa punktów oświetlenia. */
function obwodySciemnianeLed24V(answers: CalculatorAnswers): number {
  return (
    (answers.strefaPrywatna ? 2 : 0) +
    (answers.strefaOtwarta ? 4 : 0) +
    (answers.komunikacja ? 2 : 0) +
    answers.liczbaSypialniDodatkowych +
    answers.liczbaPomieszczenWilgotnych
  );
}

/**
 * Całkowita liczba punktów elektrycznych w instalacji (El rozbudowa!Q41) — decyduje o progu ceny
 * "Wykonania Rozdzielni" w bazie systemu. Zweryfikowana na realnym przykładzie oferty: większość
 * składowych (oświetlenie, rolety, monitoring, ogrzewanie, zewnętrzne) zgadza się co do punktu;
 * blok "podstawowe wyposażenie" (zależny w źródle od zdublowanego arkusza SprzetSMART)
 * przybliżony stałą punktową z ustawień zamiast w pełni odtworzony.
 */
function calculateElectricalPointsTotal(answers: CalculatorAnswers, settings: CalculatorSettings): number {
  const gniazdaObwody =
    (answers.strefaPrywatna ? 2 : 0) +
    (answers.strefaOtwarta ? 4 : 0) +
    (answers.komunikacja ? 1 : 0) +
    answers.liczbaSypialniDodatkowych +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.iloscGarazy;
  const gniazdaKolejne =
    (answers.strefaPrywatna ? 6 : 0) +
    (answers.strefaOtwarta ? 8 : 0) +
    (answers.komunikacja ? 3 : 0) +
    answers.liczbaSypialniDodatkowych * 3 +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.iloscGarazy * 6;
  const gniazda400V = (answers.strefaOtwarta ? 1 : 0) + answers.iloscGarazy;

  const oswietleniePunkty = obwodyOswietleniaOnOff(answers) + obwodySciemnianeLed24V(answers);
  const oswietlenieKolejne = oswietleniePunkty * (answers.korzystamZArchitekta ? 1.5 : 0.5);

  const rolety = answers.liczbaRolet;

  const podstawoweWyposazenie =
    settings.rozdzielnia.podstawoweWyposazeniePunkty + 1 + answers.liczbaOkienOtwieranych + 1;

  const telewizja = answers.instalacjaDoTelewizjiLubLan
    ? (answers.strefaPrywatna ? 2 : 0) + (answers.strefaOtwarta ? 2 : 0) + answers.liczbaSypialniDodatkowych + 5
    : 0;
  const glosniki = answers.instalacjaDoGlosnikow
    ? (answers.strefaOtwarta ? 5 : 0) + (answers.strefaPrywatna ? 2 : 0) + answers.liczbaSypialniDodatkowych + answers.liczbaPozostalychPomieszczen
    : 0;
  const monitoring = answers.instalacjaDoMonitoringu ? answers.iloscKamerMonitoringu : 0;

  const grzejnikiRozdzielacz = roundUp(answers.strefyOgrzewaniaPodlogowego / 5);

  const zewnetrzneBaza = answers.iloscOswietlenZewnetrznych + answers.iloscSekcjiPodlewania;
  const zewnetrzne = answers.sterowanieOgrodem ? zewnetrzneBaza + zewnetrzneBaza / 2 + 1 : 0;

  return (
    gniazdaObwody +
    gniazdaKolejne +
    gniazda400V +
    oswietleniePunkty +
    oswietlenieKolejne +
    rolety +
    podstawoweWyposazenie +
    telewizja +
    glosniki +
    monitoring +
    grzejnikiRozdzielacz +
    zewnetrzne
  );
}

/**
 * Baza systemu — sterownik, zasilanie, wstępna konfiguracja, logistyka (DANE!T111 =
 * KALKULATOR!N32+N35+N36+Parametry!D65). Zweryfikowana 1:1 na dwóch realnych przykładach oferty
 * (15437.20 zł i 9483.916667 zł). Logistyka (koszt dojazdu/diety/noclegów, WYJAZDY!L15) zależy od
 * odległości od siedziby oraz skaluje się liczbą wybranych kategorii funkcjonalnych i tym, czy
 * wybrano dodatek "Czujniki otwarcia okien" — te same wyjazdy montażowe co dla pozostałych
 * elementów instalacji.
 */
function calculateBazaZasilania(answers: CalculatorAnswers, settings: CalculatorSettings): number {
  const b = settings.bazaZasilania;
  const wieleKondygnacji = answers.liczbaKondygnacji > 1;
  const rozdzielniaWspolczynnik = Math.max(0, answers.wspolczynnikRozdzielnica || 1);
  const wspSzefa = Math.max(0, answers.trudnyKlientWspolczynnik || 1);

  const wstepnaKonfiguracja =
    (wieleKondygnacji ? b.wstepnaKonfiguracjaWieleKondygnacji : b.wstepnaKonfiguracjaJednaKondygnacja) * rozdzielniaWspolczynnik;

  const automatykaPodstawa =
    (answers.rozszerzenieKnx ? b.automatykaPodstawaKnx : b.automatykaPodstawaStandard) +
    (answers.tylkoRozdzielnia ? b.tylkoRozdzielniaSprzet : 0);

  const zasilaczeLed =
    rgbwModuleQty(answers) * b.zasilaczeLedZaModulRgbw +
    (answers.addons.dodatkowyZasilaczUps ? b.zasilaczeLedUpsRoletyDoplata : 0);
  const zasilanie = b.zasilanieBuforoweRezerwowe + (answers.rozszerzenieKnx ? b.zasilanieKnxDoplata : 0);
  const linkiMaterialy = wieleKondygnacji ? b.linkiMaterialyWieleKondygnacji : b.linkiMaterialyJednaKondygnacja;
  const zasilanieIDodatki = zasilaczeLed + zasilanie + linkiMaterialy + b.oznaczniki;

  const selectedFunctionalCount =
    (answers.alarmIKontrolaDostepu ? 1 : 0) +
    (answers.sterowanieTemperatura ? 1 : 0) +
    (answers.planujeRolety ? 1 : 0) +
    (answers.sterowanieOgrodem ? 1 : 0) +
    (answers.scenyOswietleniowe ? 1 : 0);
  const czujnikiOtwarciaWyjazd = answers.addons.czujnikiOtwarciaOkien ? 1 : 0;
  const dist = Math.max(0, answers.odlegloscKm);

  const paliwo = dist * b.logistykaPaliwoZaKm;
  const godziny = dist * b.logistykaGodzinowaZaKm;
  const sumaOsobodni = 1 + 3 * czujnikiOtwarciaWyjazd + 1 + 3 * selectedFunctionalCount + 6 + 2 + 1;
  const dieta = dist > b.logistykaProgDietyKm ? b.logistykaDietaStawka * sumaOsobodni : 0;
  const sumaOsobodniMinusDzien = 3 * (czujnikiOtwarciaWyjazd - 1) + 3 * (selectedFunctionalCount - 1) + 3;
  const nocleg = dist > b.logistykaProgNoclegowKm ? b.logistykaNoclegStawka * sumaOsobodniMinusDzien : 0;

  const logistyka = (paliwo + dieta + nocleg + b.logistykaStalaOplata + godziny) * wspSzefa;

  return roundMoney(wstepnaKonfiguracja + automatykaPodstawa + zasilanieIDodatki + logistyka);
}

export type CalculatorBaseSystemResult = {
  wieleKondygnacji: boolean;
  projektNet: number;
  rozdzielniaWykonanieNet: number;
  bazaZasilanieNet: number;
  totalNet: number;
};

/** Projekt (+ ew. dopłata za bardzo duży dom, ×współczynnik projekt) + wykonanie rozdzielni + baza/zasilanie (oba ×współczynnik rozdzielnica). */
export function calculateBaseSystem(answers: CalculatorAnswers, settings: CalculatorSettings): CalculatorBaseSystemResult {
  const wieleKondygnacji = answers.liczbaKondygnacji > 1;

  let projektNet = wieleKondygnacji
    ? settings.baseSystem.projektWieleKondygnacji
    : settings.baseSystem.projektJednaKondygnacja;
  if (answers.powierzchniaM2 >= settings.baseSystem.projektDuzyDomProgM2) {
    projektNet += settings.baseSystem.projektDuzyDomDoplata;
  }
  projektNet = roundMoney(projektNet * Math.max(0, answers.wspolczynnikProjekt || 1));

  const rozdzielniaWspolczynnik = Math.max(0, answers.wspolczynnikRozdzielnica || 1);
  const r = settings.rozdzielnia;
  const sprzetRozdzielni = (wieleKondygnacji ? r.sprzetWieleKondygnacji : r.sprzetJednaKondygnacja) * (1 + r.wzrostCenProcent / 100);
  const punktyElektryczne = calculateElectricalPointsTotal(answers, settings);
  const cenaProgowa =
    punktyElektryczne < r.progPunktowNiski
      ? r.cenaPonizejProguNiskiego
      : punktyElektryczne < r.progPunktowWysoki
        ? r.cenaPonizejProguWysokiego
        : r.cenaPowyzejProguWysokiego;
  const rozdzielniaWykonanieNet = roundMoney((sprzetRozdzielni + cenaProgowa) * rozdzielniaWspolczynnik);
  const bazaZasilanieNet = calculateBazaZasilania(answers, settings);

  return {
    wieleKondygnacji,
    projektNet,
    rozdzielniaWykonanieNet,
    bazaZasilanieNet,
    totalNet: roundMoney(projektNet + rozdzielniaWykonanieNet + bazaZasilanieNet),
  };
}

export type CalculatorFunctionalResult = {
  category: CalculatorFunctionalCategory;
  selected: boolean;
  net: number;
  /** Zestawienie materiałowe auto-dobrane przez silnik dla tej kategorii (puste, gdy kategoria nieaktywna). */
  items: CalculatorFunctionalLineItem[];
};

const FUNCTIONAL_GATE: Record<CalculatorFunctionalCategory, keyof CalculatorAnswers> = {
  oswietlenie: "scenyOswietleniowe",
  bezpieczenstwo: "alarmIKontrolaDostepu",
  temperatura: "sterowanieTemperatura",
  rolety: "planujeRolety",
  zewnetrzne: "sterowanieOgrodem",
};

export type CalculatorFunctionalLineItem = {
  key: string;
  label: string;
  quantity: number;
  unitPrice: number;
  net: number;
};

type CategoryBudget = { items: CalculatorFunctionalLineItem[]; sprzet: number; godziny: number };

/** Buduje pozycję zestawienia materiałowego z katalogu sprzętu (pomija ilości <= 0). */
function hwItem(
  hw: CalculatorHardwareCatalog,
  key: keyof CalculatorHardwareCatalog,
  quantity: number,
  labelOverride?: string,
): CalculatorFunctionalLineItem[] {
  if (quantity <= 0) return [];
  const unitPrice = hw[key];
  return [
    {
      key,
      label: labelOverride ?? CALCULATOR_HARDWARE_LABELS[key],
      quantity,
      unitPrice,
      net: quantity * unitPrice,
    },
  ];
}

/** ZESTAWIENIE!L column (kategoria Oświetlenie, poziom PRESTIŻ — stały domyślny dobór biura). */
/** Ilość modułów RGBW (ZESTAWIENIE!L10) — współdzielona między kategorią Oświetlenie i "Zasilacze LED" w bazie zasilania. */
function rgbwModuleQty(answers: CalculatorAnswers): number {
  return answers.ledySciemniane > 0 ? roundUp(answers.ledySciemniane / 4) : answers.liczbaSypialniDodatkowych * 2;
}

function calculateOswietlenieBudget(answers: CalculatorAnswers, hw: CalculatorHardwareCatalog): CategoryBudget {
  const relayQty = roundUp(obwodyOswietleniaOnOff(answers) / 16);
  const rgbwQty = rgbwModuleQty(answers);
  const czujkaLoxoneQty = answers.czyCzujkiRecznie
    ? answers.iloscCzujekLoxone
    : answers.satelWOptimum
      ? 0
      : Math.max(0, answers.liczbaPomieszczenZOknami - 3);

  const sprzet =
    relayQty * hw.relayLoxone14 + rgbwQty * hw.rgbwModule + czujkaLoxoneQty * hw.czujkaLoxone;
  const items = [
    ...hwItem(hw, "relayLoxone14", relayQty),
    ...hwItem(hw, "rgbwModule", rgbwQty),
    ...hwItem(hw, "czujkaLoxone", czujkaLoxoneQty),
  ];
  return { items, sprzet, godziny: czujkaLoxoneQty * 2 };
}

/** ZESTAWIENIE!P column (kategoria Bezpieczeństwo, poziom KOMFORT). */
function calculateBezpieczenstwoBudget(answers: CalculatorAnswers, hw: CalculatorHardwareCatalog): CategoryBudget {
  const extensionDIQty = answers.satelWOptimum ? 0 : 2;
  const zaworQty = answers.liczbaPomieszczenWilgotnych > 0 ? 1 : 0;
  const centralaQty = answers.satelWOptimum ? 1 : 0;
  const intKnxQty = answers.satelWOptimum ? 1 : 0;
  const syrenaQty = 1;
  const czujkiSufitoweQty = answers.czyCzujkiRecznie
    ? answers.iloscCzujekSatel
    : answers.satelWOptimum
      ? Math.max(0, answers.liczbaPomieszczenZOknami - 3)
      : 0;
  const czujkiDualneQty = answers.czyCzujkiRecznie ? 0 : answers.iloscGarazy;
  const czujkiBezpieczenstwaQty = answers.czyCzujkiRecznie
    ? answers.iloscCzujekBezpieczenstwa
    : (answers.jestKominek ? 1 : 0) + (answers.jestGaz ? 1 : 0);
  const kontaktronBramaQty = answers.iloscGarazy;
  const kontaktronOknoDrzwiQty = answers.liczbaDrzwiWejsciowych + answers.liczbaWyjscNaTaras;
  const kontaktronOknoDrzwiPrice = answers.czyOknaCzujnikiFabryczne
    ? hw.kontaktronOknoDrzwiFabryczne
    : hw.kontaktronOknoDrzwiStandard;
  const czujkaZalaniaQty = answers.liczbaPomieszczenWilgotnych;
  const klawiaturaMalaQty = answers.satelWOptimum ? 1 : 0;
  const klawiaturaGarazQty = answers.satelWOptimum ? 1 : 0;

  const sprzet =
    extensionDIQty * hw.extensionDI +
    zaworQty * hw.zaworOdciecia +
    centralaQty * hw.centralaAlarmowa +
    intKnxQty * hw.intKnx +
    syrenaQty * hw.syrenaAlarmowa +
    czujkiSufitoweQty * hw.czujkiSufitowe +
    czujkiDualneQty * hw.czujkiDualne +
    czujkiBezpieczenstwaQty * hw.czujkiBezpieczenstwaSprzet +
    kontaktronBramaQty * hw.kontaktronBrama +
    kontaktronOknoDrzwiQty * kontaktronOknoDrzwiPrice +
    czujkaZalaniaQty * hw.czujkaZalania +
    klawiaturaMalaQty * hw.klawiaturaMala +
    klawiaturaGarazQty * hw.klawiaturaGarazStrefowa;

  const items = [
    ...hwItem(hw, "extensionDI", extensionDIQty),
    ...hwItem(hw, "zaworOdciecia", zaworQty),
    ...hwItem(hw, "centralaAlarmowa", centralaQty),
    ...hwItem(hw, "intKnx", intKnxQty),
    ...hwItem(hw, "syrenaAlarmowa", syrenaQty),
    ...hwItem(hw, "czujkiSufitowe", czujkiSufitoweQty),
    ...hwItem(hw, "czujkiDualne", czujkiDualneQty),
    ...hwItem(hw, "czujkiBezpieczenstwaSprzet", czujkiBezpieczenstwaQty),
    ...hwItem(hw, "kontaktronBrama", kontaktronBramaQty),
    ...hwItem(
      hw,
      answers.czyOknaCzujnikiFabryczne ? "kontaktronOknoDrzwiFabryczne" : "kontaktronOknoDrzwiStandard",
      kontaktronOknoDrzwiQty,
      "Kontaktron okno/drzwi",
    ),
    ...hwItem(hw, "czujkaZalania", czujkaZalaniaQty),
    ...hwItem(hw, "klawiaturaMala", klawiaturaMalaQty),
    ...hwItem(hw, "klawiaturaGarazStrefowa", klawiaturaGarazQty),
  ];

  const godziny =
    zaworQty +
    centralaQty * 12 +
    intKnxQty * 2 +
    syrenaQty * 2 +
    czujkiSufitoweQty * 2 +
    czujkiDualneQty +
    czujkiBezpieczenstwaQty * 2 +
    kontaktronBramaQty * 2 +
    kontaktronOknoDrzwiQty * 2 +
    czujkaZalaniaQty * 2 +
    klawiaturaMalaQty * 2 +
    klawiaturaGarazQty * 2;

  return { items, sprzet, godziny };
}

/** ZESTAWIENIE!U column (kategoria Temperatura, poziom KOMFORT). */
function calculateTemperaturaBudget(answers: CalculatorAnswers, hw: CalculatorHardwareCatalog): CategoryBudget {
  const relayQty = roundUp(answers.strefyOgrzewaniaPodlogowego / 8);
  const oneWireExtQty = answers.scenyOswietleniowe ? 1 : 0;
  const silownikQty = answers.strefyOgrzewaniaPodlogowego * 2;
  const glowicaQty = Math.max(0, answers.iloscGrzejnikowSterowanych);
  const czujniki1WireQty = answers.scenyOswietleniowe ? answers.strefyOgrzewaniaPodlogowego + 2 : 0;

  const sprzet =
    relayQty * hw.relayLoxone14 +
    oneWireExtQty * hw.oneWireExt +
    silownikQty * hw.silownikSalus +
    glowicaQty * hw.glowicaGrzejnika +
    czujniki1WireQty * hw.czujniki1Wire;

  const items = [
    ...hwItem(hw, "relayLoxone14", relayQty),
    ...hwItem(hw, "oneWireExt", oneWireExtQty),
    ...hwItem(hw, "silownikSalus", silownikQty),
    ...hwItem(hw, "glowicaGrzejnika", glowicaQty),
    ...hwItem(hw, "czujniki1Wire", czujniki1WireQty),
  ];

  return { items, sprzet, godziny: glowicaQty + czujniki1WireQty };
}

/** ZESTAWIENIE!Z column (kategoria Rolety, poziom KOMFORT). */
function calculateRoletyBudget(answers: CalculatorAnswers, hw: CalculatorHardwareCatalog): CategoryBudget {
  const relayQty = roundUp((answers.liczbaRolet * 2) / 14);
  return { items: hwItem(hw, "relayLoxone14", relayQty), sprzet: relayQty * hw.relayLoxone14, godziny: relayQty * 5 };
}

/** ZESTAWIENIE!AE column (kategoria Zewnętrzne, poziom KOMFORT). */
function calculateZewnetrzneBudget(answers: CalculatorAnswers, hw: CalculatorHardwareCatalog): CategoryBudget {
  const relayQty = roundUp((answers.iloscOswietlenZewnetrznych + answers.iloscSekcjiPodlewania) / 14);
  const sprzet = relayQty * hw.relayLoxone14 + hw.czujnikDeszczuZestaw;
  const items = [...hwItem(hw, "relayLoxone14", relayQty), ...hwItem(hw, "czujnikDeszczuZestaw", 1)];
  return { items, sprzet, godziny: 16 }; // ZESTAWIENIE!AE69 — stała wartość w źródle
}

/**
 * Budżety kategorii funkcjonalnych — pełna lista materiałowa (BOM), zweryfikowana co do grosza na
 * realnym przykładzie oferty klienta (ZESTAWIENIE!L/P/U/Z/AE, przy stałych domyślnych poziomach
 * biura: PRESTIŻ dla oświetlenia, KOMFORT dla pozostałych — Parametry!B8:B12, niezależne od
 * odpowiedzi klienta). Każda kategoria = (SUMA sprzęt×ilość + godziny pracy×stawka) ×
 * współczynnik "trudny klient" (WSP_SZEFA_1 = CRM!S3); zewnętrzne dodatkowo × współczynnik
 * outdoor (CRM!Q25). "Tylko rozdzielnia" (CRM!S8) zeruje bezpieczeństwo niezależnie od checkboxa
 * (DANE!T112). Nieaktywna funkcjonalność = cała kategoria zerowa (potwierdzone formułą źródłową).
 */
export function calculateFunctionalBudgets(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorFunctionalResult[] {
  const hw = settings.hardware;
  const wspSzefa = Math.max(0, answers.trudnyKlientWspolczynnik || 1);

  return CALCULATOR_FUNCTIONAL_CATEGORIES.map((category) => {
    if (category === "bezpieczenstwo" && answers.tylkoRozdzielnia) {
      return { category, selected: false, net: 0, items: [] };
    }
    const selected = Boolean(answers[FUNCTIONAL_GATE[category]]);
    if (!selected) {
      return { category, selected: false, net: 0, items: [] };
    }

    const budget =
      category === "oswietlenie"
        ? calculateOswietlenieBudget(answers, hw)
        : category === "bezpieczenstwo"
          ? calculateBezpieczenstwoBudget(answers, hw)
          : category === "temperatura"
            ? calculateTemperaturaBudget(answers, hw)
            : category === "rolety"
              ? calculateRoletyBudget(answers, hw)
              : calculateZewnetrzneBudget(answers, hw);

    let net = roundMoney((budget.sprzet + budget.godziny * settings.laborRatePerHour) * wspSzefa);
    if (category === "zewnetrzne") {
      net = roundMoney(net * Math.max(0, answers.wspolczynnikOutdoor || 1));
    }
    return { category, selected: true, net, items: budget.items };
  });
}

export type CalculatorElectricalLineItem = {
  key: string;
  label: string;
  rateType: CalculatorElectricalRateType | "fixed";
  quantity: number;
  unitPrice: number;
  net: number;
};

function electricalRate(settings: CalculatorSettings, answers: CalculatorAnswers, type: CalculatorElectricalRateType) {
  const base = settings.electrical.rates[type];
  const extraKm = Math.max(0, answers.odlegloscKm - settings.electrical.referencyjnyDystansKm);
  return roundMoney(base + extraKm * settings.electrical.doplataZaKmNettoNaPunkt);
}

/**
 * Instalacja elektryczna — pozycje z ilościami (nie zryczałtowana stawka za punkt), wzorem
 * arkusza `El rozbudowa` (wiersze 62–100): każda pozycja ma własny typ stawki i własną ilość,
 * auto-wyliczoną z parametrów domu albo wpisaną ręcznie (CRM!U-kolumny). Zawiera też bazowe
 * wyposażenie instalacji (czujki/bramy/furtka/domofon/rozdzielnice pomocnicze — El rozbudowa,
 * wiersze 10–32, "BAZA SYSTEMU" peryferiów) — zweryfikowane empirycznie jako niemal stałe
 * (~4239 zł, DANE!K33) i zawsze wliczane, plus dopłata za każdą bramę garażową (+162 zł/bramę,
 * zweryfikowane ×2 -> +324) oraz przyciski szklane PRESTIŻ (CRM!O6, ręczna ilość) i plastikowe
 * NORMAL (CRM!O7, auto-wyliczane z pomieszczeń jak w źródle, nadpisywalne ręcznie) — cena za
 * sztukę orientacyjna, ustawialna w ustawieniach (w źródle oznaczona jako "do ustalenia z
 * Inwestorem" — patrz komentarz w types.ts).
 */
export function calculateElectricalItems(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorElectricalLineItem[] {
  const rate = (type: CalculatorElectricalRateType) => electricalRate(settings, answers, type);
  const item = (
    key: string,
    label: string,
    rateType: CalculatorElectricalRateType | "fixed",
    unitPrice: number,
    quantity: number,
  ): CalculatorElectricalLineItem => ({
    key,
    label,
    rateType,
    quantity: roundMoney(Math.max(0, quantity)),
    unitPrice,
    net: roundMoney(Math.max(0, quantity) * unitPrice),
  });

  const items: CalculatorElectricalLineItem[] = [];

  items.push(
    item(
      "podstawowe_wyposazenie",
      "Podstawowe wyposażenie instalacji (czujki, bramy, furtka, domofon, rozdzielnice pomocnicze)",
      "fixed",
      settings.electrical.fixed.podstawoweWyposazenieInstalacji,
      1,
    ),
  );
  if (answers.iloscGarazy > 0) {
    items.push(
      item(
        "doplata_brama_garazowa",
        "Dopłata za bramę garażową",
        "fixed",
        settings.electrical.fixed.doplataZaBrameGarazowa,
        answers.iloscGarazy,
      ),
    );
  }
  if (answers.iloscPrzyciskowPrestiz > 0) {
    items.push(
      item(
        "przyciski_prestiz",
        "Przyciski szklane (PRESTIŻ)",
        "fixed",
        settings.extras.cenaPrzyciskuPrestiz,
        answers.iloscPrzyciskowPrestiz,
      ),
    );
  }
  const przyciskiNormalAuto =
    (answers.komunikacja ? 2 : 0) +
    answers.liczbaSypialniDodatkowych * 2 +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.iloscGarazy +
    (answers.strefaPrywatna ? 2 : 0) +
    (answers.strefaOtwarta ? 3 : 0);
  const przyciskiNormalQty = answers.iloscPrzyciskowNormal ?? przyciskiNormalAuto;
  if (przyciskiNormalQty > 0) {
    items.push(
      item("przyciski_normal", "Przyciski plastikowe / dotykowe (NORMAL)", "fixed", settings.extras.cenaPrzyciskuNormal, przyciskiNormalQty),
    );
  }

  const gniazdaAuto =
    (answers.strefaPrywatna ? 2 : 0) +
    (answers.strefaOtwarta ? 4 : 0) +
    (answers.komunikacja ? 1 : 0) +
    answers.liczbaSypialniDodatkowych +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.iloscGarazy;
  items.push(
    item("gniazda_obwody", "Gniazda — obwody", "inteligentny", rate("inteligentny"), answers.iloscObwodowGniazd230V ?? gniazdaAuto),
  );

  const gniazdaKolejneAuto =
    (answers.strefaPrywatna ? 6 : 0) +
    (answers.strefaOtwarta ? 8 : 0) +
    (answers.komunikacja ? 3 : 0) +
    answers.liczbaSypialniDodatkowych * 3 +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.iloscGarazy * 6;
  items.push(
    item(
      "gniazda_kolejne",
      "Gniazda — kolejne w obwodzie",
      "standard",
      rate("standard"),
      answers.iloscKolejnychGniazdObwody230V ?? gniazdaKolejneAuto,
    ),
  );

  const gniazda400Auto = (answers.strefaOtwarta ? 1 : 0) + answers.iloscGarazy;
  items.push(
    item("gniazda_400v", "Gniazda 400V", "gotowe_urzadzenie", rate("gotowe_urzadzenie"), answers.iloscGniazd400V ?? gniazda400Auto),
  );

  const oswietlenieAuto = obwodyOswietleniaOnOff(answers) + obwodySciemnianeLed24V(answers);
  items.push(
    item(
      "oswietlenie_punkty",
      "Oświetlenie — punkty ON/LED",
      "inteligentny",
      rate("inteligentny"),
      answers.iloscObwodowOswietleniaWszystkich ?? oswietlenieAuto,
    ),
  );
  const oswietlenieKolejneAuto = oswietlenieAuto * (answers.korzystamZArchitekta ? 1.5 : 0.5);
  items.push(
    item(
      "oswietlenie_kolejne",
      "Oświetlenie — kolejne w obwodzie",
      "standard",
      rate("standard"),
      answers.iloscOswietleniaKolejne ?? oswietlenieKolejneAuto,
    ),
  );

  if (answers.planujeRolety) {
    items.push(item("rolety_zasilanie", "Rolety — zasilanie", "inteligentny", rate("inteligentny"), answers.liczbaRolet));
  }

  if (answers.sterowanieOgrodem) {
    const zewnetrzneQty = 8;
    items.push(item("zewnetrzne_oswietlenie", "Oświetlenie zewnętrzne i ogród", "inteligentny", rate("inteligentny"), zewnetrzneQty));
    items.push(item("podlewanie", "Podlewanie ogrodu", "inteligentny", rate("inteligentny"), zewnetrzneQty / 2));
    items.push(item("czujnik_deszczu", "Czujnik deszczu", "inteligentny", rate("inteligentny"), 1));
  }

  if (answers.instalacjaDoGlosnikow) {
    const glosnikiAuto =
      (answers.strefaOtwarta ? 5 : 0) +
      (answers.strefaPrywatna ? 2 : 0) +
      answers.liczbaSypialniDodatkowych +
      answers.liczbaPozostalychPomieszczen;
    items.push(
      item("glosniki", "Instalacja do głośników", "inteligentny", rate("inteligentny"), answers.iloscKabliGlosnikowych ?? glosnikiAuto),
    );
  }

  if (answers.instalacjaDoMonitoringu) {
    items.push(item("monitoring", "Instalacja do monitoringu", "inteligentny", rate("inteligentny"), answers.iloscKamerMonitoringu));
  }

  if (answers.instalacjaDoTelewizjiLubLan) {
    const lanTvAuto =
      (answers.strefaPrywatna ? 2 : 0) + (answers.strefaOtwarta ? 2 : 0) + answers.liczbaSypialniDodatkowych + 5;
    items.push(item("lan_tv", "Instalacja do TV / LAN", "inteligentny", rate("inteligentny"), answers.iloscGniazdLanTv ?? lanTvAuto));
  }

  if (answers.kanalyPrzepustyDoTv) {
    const kanalyAuto = (answers.strefaPrywatna ? 1 : 0) + (answers.strefaOtwarta ? 1 : 0) + answers.liczbaSypialniDodatkowych;
    items.push(
      item("kanaly_tv", "Kanały / przepusty do TV", "fixed", settings.electrical.fixed.kanalTv, answers.iloscKanalowTv ?? kanalyAuto),
    );
  }

  if (answers.instalacjaMasztuAnteny) {
    items.push(item("antena", "Instalacja masztu antenowego z anteną", "fixed", settings.electrical.fixed.antenaZMasztem, 1));
  }

  if (answers.rozdzielniaBudowlana) {
    items.push(item("rozdzielnia_budowlana", "Dzierżawa rozdzielni budowlanej", "fixed", settings.electrical.fixed.dzierzawaRozdzielniBudowlanej, 1));
  }

  items.push(item("obsadzenie_rg", "Obsadzenie rozdzielni głównej", "fixed", settings.electrical.fixed.obsadzenieRozdzielniGlownej, 1));

  if (answers.przylaczeDoDomu && answers.dlugoscPrzylaczaM > 0) {
    items.push(item("przylacze", "Przyłącze elektryczne do domu", "fixed", settings.electrical.fixed.przylaczeZaMetr, answers.dlugoscPrzylaczaM));
  }

  if (answers.formalnosciOdbiorowe) {
    items.push(item("formalnosci", "Formalności odbiorowe", "fixed", settings.electrical.fixed.formalnosciOdbiorowe, 1));
  }

  if (answers.pomiaryWewnetrzne) {
    const punktyLacznie = items.reduce((sum, entry) => sum + entry.quantity, 0);
    items.push(item("pomiary", "Pomiary wewnętrzne i uziemienia", "fixed", settings.electrical.fixed.pomiaryWewnetrzneZaPunkt, punktyLacznie));
  }

  if (answers.dodatkoweBruzdowanieM > 0) {
    items.push(
      item("bruzdowanie", "Dodatkowe bruzdowanie", "fixed", settings.electrical.fixed.dodatkoweBruzdowanieZaMetr, answers.dodatkoweBruzdowanieM),
    );
  }

  return items.filter((entry) => entry.quantity > 0);
}

export type CalculatorElectricalResult = {
  items: CalculatorElectricalLineItem[];
  net: number;
  discountNet: number;
  finalNet: number;
};

export function calculateElectricalInstallation(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorElectricalResult {
  const items = calculateElectricalItems(answers, settings);
  const net = roundMoney(items.reduce((sum, entry) => sum + entry.net, 0));
  const discountNet = answers.kompleksowaInstalacja
    ? roundMoney(net * (settings.discounts.instalacjaKompleksowaPercent / 100))
    : 0;
  return { items, net, discountNet, finalNet: roundMoney(net - discountNet) };
}

export type CalculatorAddonResult = {
  key: CalculatorAddonKey;
  selected: boolean;
  quantity: number;
  net: number;
};

/**
 * Ilość per pozycja dodatku — zweryfikowana 1:1 na realnym przykładzie oferty (DANE!T77:T94, przez
 * ZESTAWIENIE!AI-column formuły). Większość pozycji to stała ilość 1 (proste włącz/wyłącz), kilka
 * skaluje się z realnymi parametrami domu.
 */
function addonQuantity(key: CalculatorAddonKey, answers: CalculatorAnswers): number {
  switch (key) {
    case "czujnikiOtwarciaOkien":
      return answers.liczbaOkienOtwieranych;
    case "przygotowanieDostepuDrzwi":
      return answers.iloscElektrozaczepow;
    case "klawiaturyNfc":
      return answers.iloscKlawiaturNfc;
    case "oswietlenieSciemniane230V":
      return roundUp(answers.iloscOswSciemniane / 4);
    case "bezpieczenstwoPlusPlusPlus":
      return 2; // El rozbudowa/DANE — stała ilość niezależna od parametrów domu (zweryfikowane)
    case "integracjeZInnymiSystemami":
      // CRM!Q5 "Płatne integracje z innymi systemami" — dodatkowy warunek AND, zeruje pozycję
      // niezależnie od checkboxa dodatku (zweryfikowane empirycznie: DANE!T91 formuła mnoży przez CRM!Q5).
      if (!answers.platneIntegracjeZInnymiSystemami) {
        return 0;
      }
      return (
        (answers.integracjaKlimatyzacja ? 1 : 0) +
        (answers.integracjaWentylacja ? 1 : 0) +
        (answers.integracjaRekuperacja ? 1 : 0) +
        (answers.integracjaPompaCiepla ? 1 : 0)
      );
    default:
      return 1;
  }
}

/**
 * "Rozdzielnia +++" (DANE!T94) i "Dodatki premium" — gwarancje/dokumentacja (DANE!V137:V141) — nie
 * mają współczynnika "trudny klient" w źródle, w przeciwieństwie do pozostałych dodatków.
 */
const ADDONS_WITHOUT_TRUDNY_KLIENT = new Set<CalculatorAddonKey>([
  "rozdzielniaPlusPlusPlus",
  "dokumentacjaPowykonawcza",
  "ustaleniaZInnymiBranzami",
  "konsultacjeZdalne24_7",
  "przedluzenieGwarancji12Miesiecy",
  "gwarancjaCenyOfertowej",
]);

function addonAppliesTrudnyKlient(key: CalculatorAddonKey): boolean {
  return !ADDONS_WITHOUT_TRUDNY_KLIENT.has(key);
}

/**
 * Cena jednostkowa dodatku. "Czujniki otwarcia okien" — jedyny wyjątek: cena zależy od tego, czy
 * okna mają już fabryczne czujniki (ZESTAWIENIE!F36, ta sama pozycja co w kategorii Bezpieczeństwo)
 * — niższa gdy tak (montaż prostszy), wyższa gdy trzeba doinstalować własne.
 */
function addonUnitPrice(key: CalculatorAddonKey, answers: CalculatorAnswers, settings: CalculatorSettings): number {
  if (key === "czujnikiOtwarciaOkien") {
    return answers.czyOknaCzujnikiFabryczne
      ? settings.hardware.kontaktronOknoDrzwiFabryczne
      : settings.hardware.kontaktronOknoDrzwiStandard;
  }
  return settings.addons[key];
}

export function calculateAddons(answers: CalculatorAnswers, settings: CalculatorSettings): CalculatorAddonResult[] {
  const wspSzefa = Math.max(0, answers.trudnyKlientWspolczynnik || 1);
  return CALCULATOR_ADDON_KEYS.map((key) => {
    const selected = answers.addons[key];
    const quantity = addonQuantity(key, answers);
    const coefficient = addonAppliesTrudnyKlient(key) ? wspSzefa : 1;
    const net = selected ? roundMoney(addonUnitPrice(key, answers, settings) * Math.max(0, quantity) * coefficient) : 0;
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

/** LAN — InneSystemy!D13, zweryfikowane: 6660 zł (M17=true, iloscAP=6). */
function calculateLanPrice(answers: CalculatorAnswers, cat: CalculatorOtherSystemsCatalog): number {
  return (
    (answers.szafkaRackLan ? cat.lanSzafkaRack : 0) +
    cat.lanBaza +
    cat.lanDodatek +
    cat.lanZaPunktAP * answers.iloscAP +
    cat.lanDrugaSzafka
  );
}

/** Instalacja telewizyjna — InneSystemy!G13, zweryfikowane: 1920 zł. Szafa RACK reużywa ceny lanSzafkaRack (F8=C4 w źródle). */
function calculateTvPrice(answers: CalculatorAnswers, cat: CalculatorOtherSystemsCatalog): number {
  const antena = answers.multiswitchTv ? cat.tvAntena * 2 : cat.tvAntena;
  return (
    cat.tvBaza +
    (answers.multiswitchTv ? cat.tvMultiswitchDoplata : 0) +
    cat.tvDodatek +
    antena +
    (answers.szafaRackTv ? cat.lanSzafkaRack : 0)
  );
}

/** Wideodomofon — InneSystemy!J13, zweryfikowane: 5470 zł (loxoneDoplata=true). */
function calculateWideodomofonPrice(answers: CalculatorAnswers, cat: CalculatorOtherSystemsCatalog): number {
  return (
    cat.wideodomofonBaza +
    (answers.loxoneDoplataWideodomofon ? cat.wideodomofonLoxoneMaly + cat.wideodomofonLoxoneDuzyDoplata : 0) +
    (answers.loxoneDoplataWideodomofon ? cat.wideodomofonDodatkowy * 2 : cat.wideodomofonDodatkowy)
  );
}

/** Monitoring — InneSystemy!M13, zweryfikowane: 13300 zł (rejestrator=true, 8Mpx=true, 8 kamer). */
function calculateMonitoringPrice(answers: CalculatorAnswers, cat: CalculatorOtherSystemsCatalog): number {
  const kamery = answers.iloscKamerMonitoringu;
  const kameraCena = answers.monitoring8Mpx ? cat.monitoringKamera8Mpx : cat.monitoringKameraStandard;
  const wyjscieCena = answers.monitoring8Mpx ? cat.monitoringWyjscie8Mpx : cat.monitoringWyjscieStandard;
  const bezRejestratoraCena = answers.monitoring8Mpx
    ? cat.monitoringBezRejestratora8Mpx
    : cat.monitoringBezRejestratoraStandard;
  const szafaCena = answers.monitoring8Mpx ? cat.monitoringSzafa8Mpx : cat.monitoringSzafaStandard;
  const dodatekCena = answers.monitoring8Mpx ? cat.monitoringDodatek8Mpx : cat.monitoringDodatekStandard;

  const rejestrator = answers.monitoringRejestrator ? 1 : 0;
  return (
    rejestrator * cat.monitoringRejestratorBaza +
    (kamery > 8 ? kameraCena * 2 : kameraCena) +
    rejestrator * wyjscieCena * kamery +
    (rejestrator ? 0 : bezRejestratoraCena * kamery) +
    rejestrator * szafaCena +
    rejestrator * dodatekCena
  );
}

/** Multiroom (w źródle mylnie podpisany "Nagłośnienie - system multiroom") — InneSystemy!S13, zweryfikowane: 6734 zł. */
function calculateMultiroomPrice(answers: CalculatorAnswers, cat: CalculatorOtherSystemsCatalog): number {
  const strefy = answers.iloscStrefMultiroom;
  const glosniki = answers.iloscGlosnikowMultiroom;
  const skrzynki = answers.iloscSkrzynekMultiroom;

  return (
    cat.multiroomBaza +
    (strefy > 4 ? (strefy - 4) * cat.multiroomStrefaDodatkowaPowyzej4 : 0) +
    glosniki * cat.multiroomZaGlosnik +
    skrzynki * cat.multiroomZaSkrzynke +
    cat.multiroomDodatek1 +
    roundUp(strefy / 4) * cat.multiroomStrefaBazowa +
    cat.multiroomDodatek2 +
    (strefy * cat.multiroomStrefaMnoznik + glosniki * cat.multiroomGlosnikMnoznik + cat.multiroomStala)
  );
}

/** Nagłośnienie — InneSystemy!P13, zweryfikowane: 8500 zł (osobna pozycja, nie wliczona w DANE!T119 w źródle). */
function calculateNaglosnieniePrice(answers: CalculatorAnswers, cat: CalculatorOtherSystemsCatalog): number {
  return (
    cat.naglosnienieBaza +
    cat.naglosnienieSrodkowy +
    (answers.glosnikWcNaglosnienie ? cat.naglosnienieDodatekWC : 0) +
    cat.naglosnienieKolejny
  );
}

function otherSystemPrice(key: CalculatorOtherSystemKey, answers: CalculatorAnswers, settings: CalculatorSettings): number {
  const cat = settings.otherSystemsCatalog;
  switch (key) {
    case "sieciLan":
      return calculateLanPrice(answers, cat);
    case "telewizja":
      return calculateTvPrice(answers, cat);
    case "wideodomofon":
      return calculateWideodomofonPrice(answers, cat);
    case "monitoring":
      return calculateMonitoringPrice(answers, cat);
    case "multiroom":
      return calculateMultiroomPrice(answers, cat);
    case "naglosnienie":
      return calculateNaglosnieniePrice(answers, cat);
    default:
      return settings.otherSystems[key];
  }
}

/** Inne systemy — rabat proporcjonalny do liczby wybranych spośród wszystkich (CRM!Q7 × wybrane/wszystkie). */
export function calculateOtherSystems(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorOtherSystemsResult {
  const items = CALCULATOR_OTHER_SYSTEM_KEYS.map((key) => {
    const selected = answers.otherSystems[key];
    let net = selected ? roundMoney(otherSystemPrice(key, answers, settings)) : 0;
    if (key === "alarmTymczasowy" && selected) {
      net = roundMoney(net * Math.max(0, answers.wspolczynnikAlarmTymczasowy || 1));
    }
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
  /** Trudny klient — współczynnik 1,0–1,3, wliczony per kategoria funkcjonalna (CRM!S3, WSP_SZEFA_1). */
  trudnyKlientWspolczynnik: number;
  /** Wartość główna (baza systemu + kategorie funkcjonalne + dodatki), przed instalacją elektryczną i inne systemy. */
  mainNet: number;
  /** Rabat przy płatności z góry, liczony od mainNet + electrical + otherSystems. */
  platnoscZGoryDiscountNet: number;
  totalNet: number;
};

export function calculateCalculatorTotals(answers: CalculatorAnswers, settings: CalculatorSettings): CalculatorTotals {
  const electrical = calculateElectricalInstallation(answers, settings);
  const baseSystem = calculateBaseSystem(answers, settings);
  const functional = calculateFunctionalBudgets(answers, settings);
  const functionalNet = roundMoney(functional.reduce((sum, item) => sum + item.net, 0));
  const addons = calculateAddons(answers, settings);
  const addonsNet = roundMoney(addons.reduce((sum, item) => sum + item.net, 0));
  const otherSystems = calculateOtherSystems(answers, settings);

  const trudnyKlientWspolczynnik = Math.min(1.3, Math.max(1, answers.trudnyKlientWspolczynnik || 1));

  // Współczynnik "trudny klient" jest już wliczony per kategorię funkcjonalną wewnątrz
  // calculateFunctionalBudgets (WSP_SZEFA_1 w źródle mnoży każdą kategorię z osobna, nie sumę na
  // końcu) — tu nie doliczamy go drugi raz. Baza systemu i dodatki nie są nim objęte w źródle.
  const mainNet = roundMoney(baseSystem.totalNet + functionalNet + addonsNet);

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
