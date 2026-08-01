import { normalizeSheetName, type DocumentationModuleParseConfig } from "@/lib/import/documentation-module-parser";

// Mapowania kolumn potwierdzone na realnym pliku Burchacińskiego (ID_<Klient>_Spis.xlsx).
// Kolumny 0-indeksowane (A=0, B=1, ...).

export const ROLETY_CONFIG: DocumentationModuleParseConfig = {
  moduleType: "rolety",
  moduleLabel: "Rolety",
  sheetNameNormalized: normalizeSheetName("Rolety"),
  blocks: [
    {
      headerColumn: 0, // A = "Liczba"
      headerMarker: "liczba",
      columns: {
        description: 1, // Nazwa (np. "_Roleta_wypust")
        label: 2, // NR_OBWODU (np. "Roleta 1")
        location: 3, // POMIESZCZENIE
        status: 5, // F
        note: 6, // G
        extra: [{ column: 4, label: "Typ przewodu" }], // E = TYP_PRZEWODU
      },
      sectionPrefixes: [],
    },
  ],
};

export const PRZYCISKI_CONFIG: DocumentationModuleParseConfig = {
  moduleType: "przyciski",
  moduleLabel: "Przyciski",
  sheetNameNormalized: normalizeSheetName("Przyciski"),
  blocks: [
    {
      headerColumn: 0, // A = "Liczba"
      headerMarker: "liczba",
      columns: {
        description: 1, // PRODUCENT (faktycznie nazwa urządzenia, np. "_Luksystem_Czujka obecności")
        location: 3, // POMIESZCZENIE
        status: 5, // F = STATUS
        note: 6, // G = NOTATKA
        extra: [
          { column: 2, label: "Typ" }, // TYP_PRZYCISKU/CZUJKI
          { column: 4, label: "Kolor" },
        ],
      },
      // Pod główną listą po pomieszczeniach arkusz ma osobną sekcję "Podstawowa konfiguracja
      // przycisków" z wierszami podsumowań ("Zaprojektowane przyciski: LoxoneTouch, ilość 0,
      // Antracytowe:") — to zbiorcze liczniki typów, nie fizyczne pozycje do odhaczenia, więc
      // pomijamy je całkowicie zamiast importować jako śmieciowe "pozycje".
      skipRowIfColumnStartsWith: { column: 0, prefixes: ["zaprojektowan"] },
      sectionPrefixes: [],
    },
  ],
  // Typ montażu i kolor bywają ustalane/zmieniane dopiero na budowie — po pierwszym imporcie
  // Rentgen jest dla nich źródłem prawdy, plik przy re-imporcie ich już nie nadpisuje.
  editableFieldLabels: ["Typ", "Kolor"],
};

export const PRZYCISKI_TYP_OPTIONS = ["Wpuszczana", "Natynkowa"] as const;
export const PRZYCISKI_KOLOR_OPTIONS = ["Biały", "Czarny", "Inny"] as const;

export const ALARM_CONFIG: DocumentationModuleParseConfig = {
  moduleType: "alarm",
  moduleLabel: "Alarm",
  sheetNameNormalized: normalizeSheetName("Alarm"),
  blocks: [
    {
      headerColumn: 1, // B = "Liczba" (kolumna A bez nagłówka, ale ma dane — kod wejścia DI)
      headerMarker: "liczba",
      columns: {
        label: 3, // NR_OBWODU (np. "MK.1")
        description: 2, // Nazwa (np. "Kontaktron", "Czujka ruchu")
        location: 4, // POMIESZCZENIE
        status: 6, // G
        note: 7, // H
        extra: [
          { column: 0, label: "Wejście" }, // np. "DI/1/1"
          { column: 5, label: "Typ przewodu" },
        ],
      },
      sectionPrefixes: [],
    },
  ],
};

export const HVAC_CONFIG: DocumentationModuleParseConfig = {
  moduleType: "hvac",
  moduleLabel: "HVAC",
  sheetNameNormalized: normalizeSheetName("HVAC"),
  blocks: [
    {
      // Blok 1: rozdzielacze ogrzewania podłogowego (zawory).
      headerColumn: 0, // A = "Lokalizacja "
      headerMarker: "lokalizacja",
      columns: {
        label: 2, // Sterowanie (np. "Ogrzewanie 1")
        description: 1, // Zawór
        location: 3, // Obieg grzewczy (faktycznie nazwa pomieszczenia, np. "Fitnes")
        status: 6, // G
        note: 7, // H
        extra: [
          { column: 0, label: "Rozdzielacz" }, // też nośnik nagłówków sekcji
          { column: 4, label: "Kabel" },
        ],
      },
      // Nagłówki bloków w tej części arkusza: "Rozdzielacz ogrzewania podłogowego w …" — inne
      // słowo-klucz niż w RW-Zugi ("Złączki"/"Blok"), inna konwencja nazewnictwa autora.
      sectionPrefixes: ["rozdzielacz"],
    },
    {
      // Blok 2: osobna tabela niżej w TYM SAMYM arkuszu — urządzenia klimatyzacji/pompy ciepła,
      // zupełnie inny układ kolumn, własny wiersz nagłówków.
      headerColumn: 0, // A = "Typ urządzenia"
      headerMarker: "typ urządzenia",
      columns: {
        label: 2, // Sterowanie (np. "ModBUS", "+24V")
        description: 1, // Model (np. "Mitsubishi")
        location: 3, // Lokalizacja (np. "Salon") — bywa puste dla urządzeń bez konkretnego pokoju
        status: 6, // G (ta sama kolumna co blok 1 — walidacja w pliku obejmuje G2:G41 i G50:G57)
        note: 7, // H
        extra: [{ column: 0, label: "Typ urządzenia" }, { column: 4, label: "Kabel" }],
      },
      sectionPrefixes: [],
    },
  ],
};

// RACK ma dwa różne bloki tabel w jednym arkuszu (SWITCH sieciowy + AUDIOSERVER) i trafiają do
// OSOBNYCH modułów (moduleNameOverride) — konfiguracja w tym samym pliku, patrz RACK_CONFIG.
//
// UWAGA na indeksy kolumn: arkusz RACK ma pustą kolumnę A (bez treści w ogóle — tylko część
// pustych scaleń), więc SheetJS zwraca wiersze zaczynające się faktycznie od kolumny B, czyli
// index0 w tablicy wiersza = Excel B, index1 = C, itd. (potwierdzone przez openpyxl: B3="PORT").
// Kolumna statusu bloku AUDIOSERVER (Excel J) potwierdzona przez zakres walidacji danych w
// pliku ("J34:J37 J40:J41 J44"), nie przez nagłówek — ten wiersz nagłówkowy nie ma tam podpisu.
export const RACK_CONFIG: DocumentationModuleParseConfig = {
  moduleType: "rack",
  moduleLabel: "RACK",
  sheetNameNormalized: normalizeSheetName("RACK"),
  blocks: [
    {
      headerColumn: 0, // Excel B = "PORT"
      headerMarker: "port",
      columns: {
        label: 2, // Excel D = NR_OBWODU (np. "AP.1", "LAN 2")
        location: 3, // Excel E = POMIESZCZENIE
        status: 6, // Excel H = PODŁĄCZONY
        note: 7, // Excel I = NOTATKA
        extra: [
          { column: 0, label: "Port" },
          { column: 5, label: "Typ przewodu" }, // Excel G
        ],
      },
      // Tytułowy wiersz drugiej tabeli ("AUDIOSERVER 1" + "ADRES IP: ...") leży fizycznie
      // jeszcze w zakresie wierszy bloku 1 (przed własnym nagłówkiem "PORT" bloku 2) i ma 3
      // wypełnione komórki, więc bez tego wpadłby jako śmieciowa pozycja zamiast granicy bloku.
      sectionPrefixes: ["audioserver"],
      moduleNameOverride: "SWITCH",
    },
    {
      headerColumn: 0, // Excel B = "PORT" (drugi raz, w bloku AUDIOSERVER)
      headerMarker: "port",
      columns: {
        label: 1, // Excel C = NR_OBWODU (np. "Głośnik1")
        location: 2, // Excel D = POMIESZCZENIE
        status: 8, // Excel J (bez nagłówka — potwierdzone zakresem walidacji danych)
        note: 9, // Excel K (bez nagłówka, symetrycznie po kolumnie statusu jak w bloku 1)
        extra: [
          { column: 0, label: "Port" },
          { column: 4, label: "Zasilacz" }, // Excel F
          { column: 5, label: "Typ przewodu" }, // Excel G
          { column: 6, label: "Typ głośnika" }, // Excel H
          { column: 7, label: "Producent" }, // Excel I
        ],
      },
      // Podsekcje w tym bloku ("STEREO EXTENSION 1/1") nie powtarzają nagłówka "PORT" — to
      // pojedyncza komórka w kolumnie B, więc jest wykrywana przez sectionPrefixes jak w RW-Zugi.
      sectionPrefixes: ["stereo"],
      moduleNameOverride: "AUDIOSERVER",
    },
  ],
};

export const ALL_DOCUMENTATION_MODULE_CONFIGS = [
  ROLETY_CONFIG,
  PRZYCISKI_CONFIG,
  ALARM_CONFIG,
  HVAC_CONFIG,
  RACK_CONFIG,
];
