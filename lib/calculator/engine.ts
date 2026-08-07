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
import type { CalculatorSettings } from "@/lib/calculator/settings";

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
  const rozdzielniaWykonanieNet = roundMoney(
    (wieleKondygnacji
      ? settings.baseSystem.rozdzielniaWykonanieWieleKondygnacji
      : settings.baseSystem.rozdzielniaWykonanieJednaKondygnacja) * rozdzielniaWspolczynnik,
  );
  const bazaZasilanieNet = roundMoney(
    (wieleKondygnacji ? settings.baseSystem.bazaZasilanieWieleKondygnacji : settings.baseSystem.bazaZasilanieJednaKondygnacja) *
      rozdzielniaWspolczynnik,
  );

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
};

const FUNCTIONAL_GATE: Record<CalculatorFunctionalCategory, keyof CalculatorAnswers> = {
  oswietlenie: "scenyOswietleniowe",
  bezpieczenstwo: "alarmIKontrolaDostepu",
  temperatura: "sterowanieTemperatura",
  rolety: "planujeRolety",
  zewnetrzne: "sterowanieOgrodem",
};

/**
 * Budżety kategorii funkcjonalnych — cena stała odblokowywana odpowiadającym checkboxem
 * funkcjonalności (nie trzypoziomowy wybór, patrz komentarz w types.ts). "Tylko rozdzielnia"
 * (CRM!S8) zeruje kategorię bezpieczeństwa niezależnie od checkboxa (DANE!T112).
 */
export function calculateFunctionalBudgets(
  answers: CalculatorAnswers,
  settings: CalculatorSettings,
): CalculatorFunctionalResult[] {
  return CALCULATOR_FUNCTIONAL_CATEGORIES.map((category) => {
    if (category === "bezpieczenstwo" && answers.tylkoRozdzielnia) {
      return { category, selected: false, net: 0 };
    }
    const selected = Boolean(answers[FUNCTIONAL_GATE[category]]);
    if (!selected) {
      return { category, selected: false, net: 0 };
    }
    let net = settings.functional[category];
    if (category === "zewnetrzne") {
      net = roundMoney(net * Math.max(0, answers.wspolczynnikOutdoor || 1));
    }
    return { category, selected: true, net };
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
 * auto-wyliczoną z parametrów domu albo wpisaną ręcznie (CRM!U-kolumny). Uproszczenie względem
 * źródła: pominięte pozycje "BAZA SYSTEMU peryferiów" (wiersze 10–32, głównie stałe wyposażenie
 * jak czujki/bramy/domofon liczone przez osobny, mocno zagnieżdżony łańcuch odwołań) — do
 * ewentualnego doprecyzowania później.
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

  const gniazdaAuto =
    (answers.strefaPrywatna ? 2 : 0) +
    (answers.strefaOtwarta ? 4 : 0) +
    (answers.komunikacja ? 1 : 0) +
    answers.liczbaSypialniDodatkowych +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen +
    answers.liczbaBramGarazowych * 6;
  items.push(
    item("gniazda_obwody", "Gniazda — obwody", "inteligentny", rate("inteligentny"), answers.iloscObwodowGniazd230V ?? gniazdaAuto),
  );

  const gniazdaKolejneAuto =
    (answers.strefaPrywatna ? 6 : 0) +
    (answers.strefaOtwarta ? 8 : 0) +
    (answers.komunikacja ? 3 : 0) +
    answers.liczbaSypialniDodatkowych * 3 +
    answers.liczbaPomieszczenWilgotnych +
    answers.liczbaPozostalychPomieszczen;
  items.push(
    item(
      "gniazda_kolejne",
      "Gniazda — kolejne w obwodzie",
      "standard",
      rate("standard"),
      answers.iloscKolejnychGniazdObwody230V ?? gniazdaKolejneAuto,
    ),
  );

  const gniazda400Auto = (answers.strefaOtwarta ? 1 : 0) + answers.liczbaBramGarazowych;
  items.push(
    item("gniazda_400v", "Gniazda 400V", "gotowe_urzadzenie", rate("gotowe_urzadzenie"), answers.iloscGniazd400V ?? gniazda400Auto),
  );

  const oswietlenieAuto = answers.liczbaPomieszczenZOknami + answers.liczbaOkienOtwieranych;
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
    let net = selected ? roundMoney(settings.otherSystems[key] * factor) : 0;
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
  const baseSystem = calculateBaseSystem(answers, settings);
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
