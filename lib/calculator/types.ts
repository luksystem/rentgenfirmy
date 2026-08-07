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
  liczbaBramGarazowych: number;

  // Funkcjonalności — każda odblokowuje cenę stałą danej kategorii (patrz settings.functional)
  jestKominek: boolean;
  jestGaz: boolean;
  planujeRolety: boolean;
  liczbaRolet: number;
  sterowanieOgrodem: boolean;
  scenyOswietleniowe: boolean;
  sterowanieTemperatura: boolean;
  systemWlamaniowy: boolean;
  alarmIKontrolaDostepu: boolean;

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
  /** Dodatkowe czujki ponad standardowy zakres pakietu (CRM!O11/O14/O17) — orientacyjna dopłata. */
  iloscCzujekDodatkowychRecznie: number;

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
    liczbaBramGarazowych: 0,

    jestKominek: false,
    jestGaz: false,
    planujeRolety: false,
    liczbaRolet: 0,
    sterowanieOgrodem: false,
    scenyOswietleniowe: false,
    sterowanieTemperatura: false,
    systemWlamaniowy: false,
    alarmIKontrolaDostepu: false,

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
    iloscCzujekDodatkowychRecznie: 0,

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
