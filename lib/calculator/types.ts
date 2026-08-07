import { partyToServiceClientName } from "@/lib/party/display-name";
import type { Client, ServiceClient } from "@/lib/service/types";
import type { Contact } from "@/lib/contacts/types";

/**
 * Moduł Kalkulator ofert — ankieta pytań (odpowiednik arkusza `CRM` z pliku
 * "Oferta cenowa Luksystem...xlsx") -> silnik przeliczeń (lib/calculator/engine.ts) -> pozycje
 * trafiające do nowej Umowy. Na start: tylko ścieżka pakietu OPTIMUM (bez SMART/PREMIUM i bez
 * równoległego silnika "Easy System" — te dojdą później tym samym wzorcem). Liczymy wyłącznie
 * cenę dla klienta — bez wewnętrznej kalkulacji marży/kosztu sprzętu (świadomie pominięte,
 * patrz plan modułu).
 *
 * Model bazy systemu i kategorii funkcjonalnych zweryfikowany empirycznie przeciw źródłowemu
 * plikowi (biblioteka `formulas` — przeliczenie arkusza z konkretnymi danymi wejściowymi, nie
 * tylko odczyt statycznych komórek). Dwa ważne, potwierdzone w ten sposób odkrycia:
 * 1. próg cenowy bazy systemu w ścieżce OPTIMUM zależy WYŁĄCZNIE od liczby kondygnacji
 *    (1 vs >1), a nie od wpisanej powierzchni — mimo że arkusz sugeruje osobne progi metrażowe.
 * 2. kategorie funkcjonalne (bezpieczeństwo/temperatura/rolety/zewnętrzne/oświetlenie wewn.) mają
 *    dla OPTIMUM stałą cenę odblokowywaną checkboxem funkcjonalności — NIE trzypoziomowy wybór
 *    Podstawa/Komfort/Prestiż (ten wybór istnieje w arkuszu, ale zasila wewnętrzną kalkulację
 *    kosztu/marży, nie cenę sprzedaży, więc świadomie tu pominięty).
 */

export const CALCULATOR_OFFER_STATUSES = ["draft", "ready", "converted"] as const;
export type CalculatorOfferStatus = (typeof CALCULATOR_OFFER_STATUSES)[number];

export const CALCULATOR_OFFER_STATUS_LABELS: Record<CalculatorOfferStatus, string> = {
  draft: "Szkic",
  ready: "Gotowa",
  converted: "Przeniesiona do umowy",
};

export const CALCULATOR_FUNCTIONAL_CATEGORIES = [
  "oswietlenie",
  "bezpieczenstwo",
  "temperatura",
  "rolety",
  "zewnetrzne",
] as const;
export type CalculatorFunctionalCategory = (typeof CALCULATOR_FUNCTIONAL_CATEGORIES)[number];

export const CALCULATOR_FUNCTIONAL_CATEGORY_LABELS: Record<CalculatorFunctionalCategory, string> = {
  oswietlenie: "Oświetlenie wewnętrzne",
  bezpieczenstwo: "Systemy bezpieczeństwa",
  temperatura: "Sterowanie temperaturą",
  rolety: "Rolety / żaluzje / karnisze",
  zewnetrzne: "Zewnętrzne (ogród, elewacja)",
};

export const CALCULATOR_ADDON_KEYS = [
  "stacjaPogodowa",
  "oswietlenieSciemniane230V",
  "oswietlenieKoloroweRGBW",
  "czujnikiOtwarciaOkien",
  "klawiaturyNfc",
  "przygotowanieDostepuDrzwi",
  "bezpieczenstwoPlusPlusPlus",
  "sterowaneGniazda",
  "dodatkowyLicznikPradu",
  "dodatkowyZasilaczUps",
  "rozdzielniaPlusPlusPlus",
  "budzikInteligentny",
  "przyciskUkryty",
  "stacjaDokujacaIpad",
  "ipad",
] as const;
export type CalculatorAddonKey = (typeof CALCULATOR_ADDON_KEYS)[number];

export const CALCULATOR_ADDON_LABELS: Record<CalculatorAddonKey, string> = {
  stacjaPogodowa: "Stacja pogodowa",
  oswietlenieSciemniane230V: "Oświetlenie ściemniane 230V",
  oswietlenieKoloroweRGBW: "Oświetlenie kolorowe RGBW",
  czujnikiOtwarciaOkien: "Czujniki otwarcia okien",
  klawiaturyNfc: "Klawiatury dostępowe NFC",
  przygotowanieDostepuDrzwi: "Przygotowanie dostępu do drzwi",
  bezpieczenstwoPlusPlusPlus: "Bezpieczeństwo +++",
  sterowaneGniazda: "Sterowane gniazda",
  dodatkowyLicznikPradu: "Dodatkowy licznik prądu",
  dodatkowyZasilaczUps: "Dodatkowy zasilacz UPS",
  rozdzielniaPlusPlusPlus: "Rozdzielnia +++ (przeszklona)",
  budzikInteligentny: "Budzik inteligentny",
  przyciskUkryty: "Przycisk ukryty Touch Surface",
  stacjaDokujacaIpad: "Stacja dokująca do iPada",
  ipad: "iPad",
};

export const CALCULATOR_OTHER_SYSTEM_KEYS = [
  "sieciLan",
  "telewizja",
  "wideodomofon",
  "monitoring",
  "naglosnienie",
  "multiroom",
  "sauna",
  "alarmTymczasowy",
] as const;
export type CalculatorOtherSystemKey = (typeof CALCULATOR_OTHER_SYSTEM_KEYS)[number];

export const CALCULATOR_OTHER_SYSTEM_LABELS: Record<CalculatorOtherSystemKey, string> = {
  sieciLan: "Sieć LAN i WiFi",
  telewizja: "Instalacja telewizji / anteny",
  wideodomofon: "Wideodomofon",
  monitoring: "Monitoring",
  naglosnienie: "Nagłośnienie / kino domowe",
  multiroom: "System multiroom",
  sauna: "Sauna ze sterowaniem",
  alarmTymczasowy: "Alarm tymczasowy na czas budowy",
};

/** Typ stawki punktu elektrycznego (El rozbudowa!B2:B6) — decyduje o cenie jednostkowej pozycji. */
export const CALCULATOR_ELECTRICAL_RATE_TYPES = ["standard", "inteligentny", "gotowe_urzadzenie", "petla"] as const;
export type CalculatorElectricalRateType = (typeof CALCULATOR_ELECTRICAL_RATE_TYPES)[number];

export const CALCULATOR_ELECTRICAL_RATE_TYPE_LABELS: Record<CalculatorElectricalRateType, string> = {
  standard: "Standard (ST)",
  inteligentny: "Inteligentny Dom (ID)",
  gotowe_urzadzenie: "Gotowe urządzenie (ID READY)",
  petla: "Pętla / magistrala",
};

export type CalculatorClient = {
  fullName: string;
  location: string;
  email: string;
  phone: string;
};

export function emptyCalculatorClient(): CalculatorClient {
  return { fullName: "", location: "", email: "", phone: "" };
}

export function clientToCalculatorClient(
  client: Pick<Client, "firstName" | "lastName" | "location" | "email" | "phone">,
): CalculatorClient {
  return {
    fullName: partyToServiceClientName(client),
    location: client.location,
    email: client.email,
    phone: client.phone,
  };
}

export function contactToCalculatorClient(
  contact: Pick<Contact, "firstName" | "lastName" | "location" | "email" | "phone">,
): CalculatorClient {
  return {
    fullName: partyToServiceClientName(contact),
    location: contact.location,
    email: contact.email,
    phone: contact.phone,
  };
}

export function calculatorClientFromServiceClient(snapshot: ServiceClient): CalculatorClient {
  return { fullName: snapshot.fullName, location: snapshot.location, email: snapshot.email, phone: snapshot.phone };
}

/**
 * Ankieta wejściowa — odpowiednik arkusza `CRM`, ograniczony do pól potrzebnych ścieżce
 * OPTIMUM (bez sekcji "EasySystem" i "DOSTOSUJ SMART" z oryginalnego katalogu pytań). Pola
 * pogrupowane komentarzami wg sekcji formularza w UI.
 */
export type CalculatorAnswers = {
  // Dane kontaktowe / lokalizacja
  odlegloscKm: number;

  // Parametry podstawowe
  powierzchniaM2: number;
  liczbaKondygnacji: number;
  liczbaPomieszczenZOknami: number;
  liczbaOkienOtwieranych: number;
  liczbaDrzwiWejsciowych: number;
  liczbaWyjscNaTaras: number;
  czyBramaWjazdowa: boolean;
  czyOknaCzujnikiFabryczne: boolean;
  korzystamZArchitekta: boolean;
  kompleksowaInstalacja: boolean;
  ofertaPoAnalizie: boolean;
  waznoscOfertyDni: number;

  // Pomieszczenia
  strefaPrywatna: boolean;
  strefaOtwarta: boolean;
  komunikacja: boolean;
  liczbaSypialniDodatkowych: number;
  liczbaPomieszczenWilgotnych: number;
  liczbaPozostalychPomieszczen: number;
  /** CRM!F8 "Ilość garaży" — liczba garaży, NIE liczba bram wjazdowych (ta jest osobno: czyBramaWjazdowa). */
  iloscGarazy: number;

  // Funkcjonalności — każda odblokowuje wyliczoną z listy materiałowej (BOM) cenę danej kategorii
  // (patrz komentarz przy calculateFunctionalBudgets w engine.ts)
  jestKominek: boolean;
  jestGaz: boolean;
  planujeRolety: boolean;
  liczbaRolet: number;
  sterowanieOgrodem: boolean;
  scenyOswietleniowe: boolean;
  sterowanieTemperatura: boolean;
  systemWlamaniowy: boolean;
  alarmIKontrolaDostepu: boolean;

  // Pola zasilające listę materiałową (BOM) kategorii funkcjonalnych (ZESTAWIENIE!L/P/U/Z/AE) —
  // zweryfikowane 1:1 na realnym przykładzie oferty.
  /** CRM!O16 "Ledy ściemniane" — ilość, steruje modułami RGBW w kategorii Oświetlenie. */
  ledySciemniane: number;
  /** CRM!O15 "czy czujki ręcznie?" — gdy TAK, ilości czujek podane ręcznie (poniższe 3 pola) zamiast auto z pomieszczeń. */
  czyCzujkiRecznie: boolean;
  /** CRM!O11 "Ilość czujek Loxone" — feeduje kategorię Oświetlenie (czujka Loxone, sic) gdy czyCzujkiRecznie=true. */
  iloscCzujekLoxone: number;
  /** CRM!O14 "czujki satel" — feeduje kategorię Bezpieczeństwo (czujki sufitowe) gdy czyCzujkiRecznie=true. */
  iloscCzujekSatel: number;
  /** CRM!O17 "czujki bezpieczeństwa" — feeduje kategorię Bezpieczeństwo (czujki dualne/bezp.) gdy czyCzujkiRecznie=true. */
  iloscCzujekBezpieczenstwa: number;
  /** CRM!S42 "SATEL W OPTIMUM" (tylko biuro) — przełącza architekturę alarmu (Loxone-natywny vs SATEL), zmienia dobór sprzętu w kategorii Bezpieczeństwo. */
  satelWOptimum: boolean;
  /** CRM!O2 "Strefy ogrzewania podłogowego" — feeduje kategorię Temperatura. */
  strefyOgrzewaniaPodlogowego: number;
  /** CRM!O3 "Sterowane grzejniki" — ilość, feeduje kategorię Temperatura (głowice grzejnikowe). */
  iloscGrzejnikowSterowanych: number;
  /** DANE — domyślnie 4, "STANDARD" założenie biura (nie CRM), feeduje kategorię Zewnętrzne. */
  iloscOswietlenZewnetrznych: number;
  /** DANE — domyślnie 4, "STANDARD" założenie biura (nie CRM), feeduje kategorię Zewnętrzne. */
  iloscSekcjiPodlewania: number;

  // Dodatki — checkbox per pozycja
  addons: Record<CalculatorAddonKey, boolean>;
  iloscStacjiDokujacychZIpadem: number;

  // Inne systemy — checkbox per system + ich ilości
  otherSystems: Record<CalculatorOtherSystemKey, boolean>;
  iloscKamerMonitoringu: number;
  iloscStrefMultiroom: number;
  iloscGlosnikowMultiroom: number;

  // Instalacja elektryczna — toggle'e (CRM!U2:U12)
  instalacjaDoGlosnikow: boolean;
  instalacjaDoMonitoringu: boolean;
  instalacjaDoTelewizjiLubLan: boolean;
  kanalyPrzepustyDoTv: boolean;
  przylaczeDoDomu: boolean;
  dlugoscPrzylaczaM: number;
  instalacjaMasztuAnteny: boolean;
  rozdzielniaBudowlana: boolean;
  formalnosciOdbiorowe: boolean;
  pomiaryWewnetrzne: boolean;

  // Instalacja elektryczna — ilości ręczne (CRM!U15:U29; null/0 = licz automatycznie z parametrów domu)
  iloscGniazd400V: number | null;
  iloscObwodowGniazd230V: number | null;
  iloscKolejnychGniazdObwody230V: number | null;
  iloscObwodowOswietleniaWszystkich: number | null;
  iloscOswietleniaKolejne: number | null;
  iloscGniazdLanTv: number | null;
  iloscKabliGlosnikowych: number | null;
  iloscKanalowTv: number | null;
  dodatkoweBruzdowanieM: number;

  // Przyciski — CRM rozróżnia dwa osobne materiały/standardy: PRESTIŻ (szklane, CRM!O6 — pole
  // ręczne, bez formuły w źródle) i NORMAL (plastikowe/dotykowe, CRM!O7 — auto-wyliczane z
  // pomieszczeń: komunikacja×2 + sypialnie_dodatkowe×2 + wilgotne×1 + pozostałe×1 + garaże×1 +
  // strefa_prywatna×2 + strefa_otwarta×3, nadpisywalne ręcznie jak inne pola "0 = auto" w tej
  // sekcji). Cena za sztukę jest orientacyjna (do ustalenia z Inwestorem w źródle — patrz
  // komentarz w settings.ts), ale ILOŚĆ dla NORMAL ma realną formułę źródłową.
  iloscPrzyciskowPrestiz: number;
  iloscPrzyciskowNormal: number | null;

  // Finanse / rabaty / wyjątki
  trudnyKlientWspolczynnik: number;
  platnoscZGory: boolean;
  istniejePodstawowyAlarm: boolean;
  tylkoRozdzielnia: boolean;
  /** Współczynniki mnożące poszczególne składowe wyceny (CRM!Q23:Q26, domyślnie 1,0 = bez zmian). */
  wspolczynnikProjekt: number;
  wspolczynnikRozdzielnica: number;
  wspolczynnikOutdoor: number;
  wspolczynnikAlarmTymczasowy: number;
};

export function emptyCalculatorAnswers(): CalculatorAnswers {
  return {
    odlegloscKm: 0,

    powierzchniaM2: 0,
    liczbaKondygnacji: 1,
    liczbaPomieszczenZOknami: 0,
    liczbaOkienOtwieranych: 0,
    liczbaDrzwiWejsciowych: 1,
    liczbaWyjscNaTaras: 0,
    czyBramaWjazdowa: false,
    czyOknaCzujnikiFabryczne: false,
    korzystamZArchitekta: false,
    kompleksowaInstalacja: false,
    ofertaPoAnalizie: false,
    waznoscOfertyDni: 14,

    strefaPrywatna: false,
    strefaOtwarta: false,
    komunikacja: false,
    liczbaSypialniDodatkowych: 0,
    liczbaPomieszczenWilgotnych: 0,
    liczbaPozostalychPomieszczen: 0,
    iloscGarazy: 0,

    jestKominek: false,
    jestGaz: false,
    planujeRolety: false,
    liczbaRolet: 0,
    sterowanieOgrodem: false,
    scenyOswietleniowe: false,
    sterowanieTemperatura: false,
    systemWlamaniowy: false,
    alarmIKontrolaDostepu: false,

    ledySciemniane: 0,
    czyCzujkiRecznie: false,
    iloscCzujekLoxone: 0,
    iloscCzujekSatel: 0,
    iloscCzujekBezpieczenstwa: 0,
    satelWOptimum: false,
    strefyOgrzewaniaPodlogowego: 0,
    iloscGrzejnikowSterowanych: 0,
    iloscOswietlenZewnetrznych: 4,
    iloscSekcjiPodlewania: 4,

    addons: Object.fromEntries(CALCULATOR_ADDON_KEYS.map((key) => [key, false])) as Record<
      CalculatorAddonKey,
      boolean
    >,
    iloscStacjiDokujacychZIpadem: 1,

    otherSystems: Object.fromEntries(CALCULATOR_OTHER_SYSTEM_KEYS.map((key) => [key, false])) as Record<
      CalculatorOtherSystemKey,
      boolean
    >,
    iloscKamerMonitoringu: 6,
    iloscStrefMultiroom: 4,
    iloscGlosnikowMultiroom: 6,

    instalacjaDoGlosnikow: false,
    instalacjaDoMonitoringu: false,
    instalacjaDoTelewizjiLubLan: false,
    kanalyPrzepustyDoTv: false,
    przylaczeDoDomu: false,
    dlugoscPrzylaczaM: 0,
    instalacjaMasztuAnteny: false,
    rozdzielniaBudowlana: false,
    formalnosciOdbiorowe: false,
    pomiaryWewnetrzne: false,

    iloscGniazd400V: null,
    iloscObwodowGniazd230V: null,
    iloscKolejnychGniazdObwody230V: null,
    iloscObwodowOswietleniaWszystkich: null,
    iloscOswietleniaKolejne: null,
    iloscGniazdLanTv: null,
    iloscKabliGlosnikowych: null,
    iloscKanalowTv: null,
    dodatkoweBruzdowanieM: 0,

    iloscPrzyciskowPrestiz: 0,
    iloscPrzyciskowNormal: null,

    trudnyKlientWspolczynnik: 1,
    platnoscZGory: false,
    istniejePodstawowyAlarm: false,
    tylkoRozdzielnia: false,
    wspolczynnikProjekt: 1,
    wspolczynnikRozdzielnica: 1,
    wspolczynnikOutdoor: 1,
    wspolczynnikAlarmTymczasowy: 1,
  };
}

export type CalculatorOffer = {
  id: string;
  status: CalculatorOfferStatus;
  clientId: string | null;
  contactId: string | null;
  title: string;
  client: CalculatorClient;
  answers: CalculatorAnswers;
  contractId: string | null;
  createdAt: string;
  updatedAt: string;
};
