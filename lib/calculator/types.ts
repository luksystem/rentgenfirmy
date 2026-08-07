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
 */

export const CALCULATOR_OFFER_STATUSES = ["draft", "ready", "converted"] as const;
export type CalculatorOfferStatus = (typeof CALCULATOR_OFFER_STATUSES)[number];

export const CALCULATOR_OFFER_STATUS_LABELS: Record<CalculatorOfferStatus, string> = {
  draft: "Szkic",
  ready: "Gotowa",
  converted: "Przeniesiona do umowy",
};

export const CALCULATOR_HOUSE_SIZE_TIERS = ["do_80", "od_80_do_150", "od_150"] as const;
export type CalculatorHouseSizeTier = (typeof CALCULATOR_HOUSE_SIZE_TIERS)[number];

export const CALCULATOR_HOUSE_SIZE_TIER_LABELS: Record<CalculatorHouseSizeTier, string> = {
  do_80: "do 80 m²",
  od_80_do_150: "80–150 m²",
  od_150: "150 m²+",
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

export const CALCULATOR_FUNCTIONAL_LEVELS = ["podstawa", "komfort", "prestiz"] as const;
export type CalculatorFunctionalLevel = (typeof CALCULATOR_FUNCTIONAL_LEVELS)[number];

export const CALCULATOR_FUNCTIONAL_LEVEL_LABELS: Record<CalculatorFunctionalLevel, string> = {
  podstawa: "Podstawa",
  komfort: "Komfort",
  prestiz: "Prestiż",
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

  // Funkcjonalności
  jestKominek: boolean;
  jestGaz: boolean;
  planujeRolety: boolean;
  liczbaRolet: number;
  sterowanieOgrodem: boolean;
  scenyOswietleniowe: boolean;
  sterowanieTemperatura: boolean;
  systemWlamaniowy: boolean;
  alarmIKontrolaDostepu: boolean;

  // Poziom kategorii funkcjonalnych — wybór biura per oferta
  poziomOswietlenie: CalculatorFunctionalLevel;
  poziomBezpieczenstwo: CalculatorFunctionalLevel;
  poziomTemperatura: CalculatorFunctionalLevel;
  poziomRolety: CalculatorFunctionalLevel;
  poziomZewnetrzne: CalculatorFunctionalLevel;

  // Dodatki — checkbox per pozycja
  addons: Record<CalculatorAddonKey, boolean>;
  iloscStacjiDokujacychZIpadem: number;

  // Inne systemy — checkbox per system + ich ilości
  otherSystems: Record<CalculatorOtherSystemKey, boolean>;
  iloscKamerMonitoringu: number;
  iloscStrefMultiroom: number;
  iloscGlosnikowMultiroom: number;

  // Instalacja elektryczna (uproszczony model punktowy)
  liczbaPunktowElektrycznychRecznie: number | null;

  // Finanse / rabaty / wyjątki
  trudnyKlientWspolczynnik: number;
  platnoscZGory: boolean;
  istniejePodstawowyAlarm: boolean;
  tylkoRozdzielnia: boolean;
};

export function emptyCalculatorAnswers(): CalculatorAnswers {
  return {
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

    poziomOswietlenie: "komfort",
    poziomBezpieczenstwo: "komfort",
    poziomTemperatura: "komfort",
    poziomRolety: "komfort",
    poziomZewnetrzne: "komfort",

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

    liczbaPunktowElektrycznychRecznie: null,

    trudnyKlientWspolczynnik: 1,
    platnoscZGory: false,
    istniejePodstawowyAlarm: false,
    tylkoRozdzielnia: false,
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
