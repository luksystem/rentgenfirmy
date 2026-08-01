// Parser arkusza "RW - Zugi" ze stałego firmowego szablonu dokumentacji rozdzielni
// (`ID_<Klient>_Spis.xlsx`). Funkcja czysta — bez zależności od Supabase — żeby dało się ją
// zweryfikować na realnym pliku bez wystawiania czegokolwiek na produkcję.
//
// Układ arkusza: nagłówek sekcji "Rozdzielnica <nazwa>", zaraz po nim wiersz nagłówków kolumn
// (rozpoznawalny po kolumnie B == "Nr zabezpieczenia"), potem wiersze danych aż do kolejnej
// sekcji / stopki "NOTATKI" / końca arkusza. Arkusz ma wbudowaną listę rozwijaną Excela na
// kolumnie P (status) z zasięgiem aż do wiersza ~311 — czyli obejmuje też sekcje poniżej głównej
// listy zugów (złączki rezerwowe, magistrale, bloki rozdzielcze dla linii sygnałowych), które w
// realnych plikach często nie mają jeszcze wypełnionego statusu. Dlatego v2 NIE wymaga wartości w
// P — zamiast tego rozróżnia pozycję od nagłówka sekcji po strukturze wiersza (patrz
// `classifyRow` niżej).
import * as XLSX from "xlsx";
import type { SwitchboardCircuitStatus } from "@/lib/dashboard/switchboard-types";

const SHEET_NAME_TARGET = "rwzugi";
const HEADER_COLUMN_INDEX = 1; // B
const HEADER_MARKER = "nr zabezpieczenia";
const SECTION_MARKER = "rozdzielnica";
const FOOTER_MARKER = "notatki";

// Kolumny 0-indeksowane (A=0 … Q=16), zgodnie z układem arkusza potwierdzonym na realnym pliku.
// Eksportowane — `lib/export/documentation-xlsx-export.ts` odtwarza ten sam układ przy eksporcie
// z powrotem do Excela, żeby wyeksportowany plik dało się ponownie zaimportować.
export const SWITCHBOARD_COL = {
  breakerType: 0, // A
  breakerNo: 1, // B
  slotNo: 2, // C
  zugNo: 3, // D
  zugSubNo: 4, // E
  connectorType: 5, // F
  circuitNo: 6, // G
  circuitDescription: 7, // H
  detail1: 8, // I — bez nagłówka, treść zależy od sekcji
  detail2: 9, // J — bez nagłówka
  location: 10, // K
  breakerNoAlt: 11, // L — duplikat B na niektórych wierszach
  breakerTypeAlt: 12, // M — duplikat A
  rcdNo: 13, // N
  detail3: 14, // O — bez nagłówka
  status: 15, // P
  note: 16, // Q
} as const;

const COL = SWITCHBOARD_COL;

// Kolumny liczone przy ocenie "czy to nagłówek sekcji czy pozycja" — A..O (bez P/Q: status i
// notatka same w sobie nie świadczą o tym, że wiersz jest realną pozycją, a puste P jest wręcz
// typowe dla całych nowo wykrytych sekcji).
const CONTENT_COLUMNS = [
  COL.breakerType,
  COL.breakerNo,
  COL.slotNo,
  COL.zugNo,
  COL.zugSubNo,
  COL.connectorType,
  COL.circuitNo,
  COL.circuitDescription,
  COL.detail1,
  COL.detail2,
  COL.location,
  COL.breakerNoAlt,
  COL.breakerTypeAlt,
  COL.rcdNo,
  COL.detail3,
];

// Wiersz, w którym jedyną wypełnioną treścią jest zdanie dłuższe niż to — czysty akapit
// informacyjny (np. instrukcja dla elektryka), nie nazwa sekcji ani pozycja. Pomijamy go w
// całości zamiast robić z niego brzydki, wielozdaniowy tytuł sekcji.
const STANDALONE_PARAGRAPH_MIN_LENGTH = 80;

// Wszystkie realne nagłówki sekcji w tym szablonie zaczynają się od jednego z tych słów
// ("Złączki rezerwowe", "Złączki magistral", "Blok rozdzielczy dla…"). To dużo pewniejszy sygnał
// niż "jedna wypełniona komórka" — pojedyncza komórka bez tego prefiksu (np. przypadkowy,
// osierocony wpis "Roleta 1" pozostały po edycji arkusza) to szum, nie granica sekcji. Sprawdzane
// na KAŻDEJ wypełnionej komórce wiersza, nie tylko gdy komórka jest jedyna — nagłówek bywa
// wymieszany z pomocniczymi danymi w tym samym wierszu (np. "Powierzchnia" w sąsiednich
// kolumnach).
const SECTION_LABEL_PATTERN = /^(złączki|blok)/i;

const STATUS_MAP: Record<string, SwitchboardCircuitStatus> = {
  "przygotowane do podłączenia": "przygotowane_do_podlaczenia",
  "podłączone": "podlaczone",
  "podłączone i sprawdzone": "podlaczone_i_sprawdzone",
  "wymaga uwagi": "wymaga_uwagi",
  problem: "problem",
  "nie ruszone": "nie_ruszone",
};

export class SwitchboardParseError extends Error {}

export type ParsedCircuit = {
  rowIndex: number;
  mergeKey: string;
  sectionName: string | null;
  zugNo: string | null;
  zugSubNo: string | null;
  circuitNo: string | null;
  breakerType: string | null;
  breakerNo: string | null;
  rcdNo: string | null;
  slotNo: string | null;
  connectorType: string | null;
  circuitDescription: string | null;
  location: string | null;
  detail1: string | null;
  detail2: string | null;
  detail3: string | null;
  status: SwitchboardCircuitStatus;
  note: string | null;
};

export type ParsedSwitchboard = {
  name: string;
  circuits: ParsedCircuit[];
};

export type ParsedSwitchboardFile = {
  sheetName: string;
  switchboards: ParsedSwitchboard[];
};

function cellText(row: unknown[], index: number): string | null {
  const value = row[index];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase();
}

function normalizeSheetName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeStatus(raw: string | null): SwitchboardCircuitStatus {
  if (!raw) return "nie_ruszone";
  return STATUS_MAP[normalize(raw)] ?? "nie_ruszone";
}

function findHeaderRow(rows: unknown[][], from: number, to: number): number | null {
  for (let i = from; i < to; i += 1) {
    const row = rows[i] ?? [];
    if (normalize(cellText(row, HEADER_COLUMN_INDEX)) === HEADER_MARKER) {
      return i;
    }
  }
  return null;
}

type RowClassification =
  | { kind: "blank" }
  | { kind: "paragraph" }
  | { kind: "section-label"; sectionName: string }
  | { kind: "position" };

// Rozróżnia nagłówek sekcji od realnej pozycji po strukturze wiersza, bez żadnych nowych
// oznaczeń w Excelu:
//  - pojedyncza wypełniona komórka z długim akapitem (instrukcja dla elektryka) — pomijamy
//    w całości, to nie jest ani nagłówek, ani pozycja;
//  - dowolny wiersz, w którym którakolwiek wypełniona komórka zaczyna się od "Złączki"/"Blok"
//    (patrz `SECTION_LABEL_PATTERN`) — nagłówek nowej sekcji. Pozostałe dane w tym samym wierszu
//    (jeśli są) świadomie odrzucamy zamiast próbować z nich zrobić pozycję — w praktyce to zawsze
//    pomocniczy kontekst (np. etykieta kolumny "Powierzchnia", specyfikacja szyny zasilającej),
//    nie samodzielny zug/obwód.
//  - wszystko inne = zwykła pozycja, niezależnie od tego, czy kolumna P (status) jest wypełniona.
function classifyRow(row: unknown[]): RowClassification {
  const filled = CONTENT_COLUMNS.map((index) => cellText(row, index)).filter(
    (value): value is string => value !== null,
  );

  if (filled.length === 0) return { kind: "blank" };

  if (filled.length === 1 && filled[0].length >= STANDALONE_PARAGRAPH_MIN_LENGTH) {
    return { kind: "paragraph" };
  }

  const sectionCell = filled.find((text) => SECTION_LABEL_PATTERN.test(text));
  if (sectionCell) return { kind: "section-label", sectionName: sectionCell };

  return { kind: "position" };
}

// Ostatnia siatka bezpieczeństwa: nawet dobrze dobrany klucz może się powtórzyć na wystarczająco
// nieregularnym arkuszu (np. trzeci przewód rolety pod tym samym wyłącznikiem i tym samym
// opisem co inny). Baza ma unikalny indeks na (switchboard_id, merge_key), więc kolizja
// wywaliłaby cały import — zamiast tego dopisujemy licznik do każdego powtórzenia poza pierwszym.
function dedupeMergeKeys(circuits: ParsedCircuit[]): ParsedCircuit[] {
  const seen = new Map<string, number>();
  return circuits.map((circuit) => {
    const count = (seen.get(circuit.mergeKey) ?? 0) + 1;
    seen.set(circuit.mergeKey, count);
    return count === 1 ? circuit : { ...circuit, mergeKey: `${circuit.mergeKey}#${count}` };
  });
}

export function parseSwitchboardWorkbook(data: ArrayBuffer): ParsedSwitchboardFile {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames.find(
    (candidate) => normalizeSheetName(candidate) === SHEET_NAME_TARGET,
  );
  if (!sheetName) {
    throw new SwitchboardParseError(
      `Nie znaleziono arkusza "RW - Zugi" w pliku. Dostępne arkusze: ${workbook.SheetNames.join(", ")}.`,
    );
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  const sectionStarts: { row: number; name: string }[] = [];
  rows.forEach((row, rowIndex) => {
    const marker = row.find(
      (cell) => typeof cell === "string" && normalize(cell).startsWith(SECTION_MARKER),
    );
    if (typeof marker === "string") {
      const name = marker.trim().replace(/^rozdzielnica\s*/i, "").trim() || marker.trim();
      sectionStarts.push({ row: rowIndex, name });
    }
  });

  if (!sectionStarts.length) {
    throw new SwitchboardParseError(
      `W arkuszu "${sheetName}" nie znaleziono żadnej sekcji "Rozdzielnica …". Sprawdź, czy to ` +
        `właściwy plik.`,
    );
  }

  const footerRow = rows.findIndex((row) =>
    row.some((cell) => typeof cell === "string" && normalize(cell) === FOOTER_MARKER),
  );

  const switchboards: ParsedSwitchboard[] = sectionStarts.map((section, sectionIndex) => {
    const nextSectionRow = sectionStarts[sectionIndex + 1]?.row ?? rows.length;
    const endRow = footerRow >= 0 && footerRow < nextSectionRow ? footerRow : nextSectionRow;

    const headerRow = findHeaderRow(rows, section.row + 1, endRow);
    const dataStart = headerRow !== null ? headerRow + 1 : section.row + 1;

    const circuits: ParsedCircuit[] = [];
    let currentSubsection: string | null = null;
    let currentZugNo: string | null = null;

    for (let i = dataStart; i < endRow; i += 1) {
      const row = rows[i] ?? [];
      const classification = classifyRow(row);

      if (classification.kind === "blank" || classification.kind === "paragraph") {
        continue;
      }
      if (classification.kind === "section-label") {
        currentSubsection = classification.sectionName;
        currentZugNo = null;
        continue;
      }

      const zugNoRaw = cellText(row, COL.zugNo);
      if (zugNoRaw) currentZugNo = zugNoRaw;
      const zugNo = currentZugNo;

      const zugSubNo = cellText(row, COL.zugSubNo);
      const breakerNo = cellText(row, COL.breakerNo) ?? cellText(row, COL.breakerNoAlt);
      const circuitNo = cellText(row, COL.circuitNo);
      const circuitDescription = cellText(row, COL.circuitDescription);
      const statusRaw = cellText(row, COL.status);

      // Zug ma zwykle własny nr pod-pozycji (Z10.1…) — jednoznaczny sam w sobie. Wiersze bez
      // niego (np. trzeci przewód rolety/zasłony, wpięty pod ten sam wyłącznik co poprzednie dwa)
      // rozróżniamy przez wyłącznik + obwód + opis, bo sam wyłącznik bywa współdzielony przez
      // kilka fizycznych pozycji (jeden bezpiecznik na kilka rolet).
      const compoundKey = [breakerNo, circuitNo, circuitDescription].filter(Boolean).join("|");
      const mergeKey = zugSubNo ?? (compoundKey || `row-${i + 1}`);

      circuits.push({
        rowIndex: i + 1,
        mergeKey,
        sectionName: currentSubsection,
        zugNo,
        zugSubNo,
        circuitNo,
        breakerType: cellText(row, COL.breakerType) ?? cellText(row, COL.breakerTypeAlt),
        breakerNo,
        rcdNo: cellText(row, COL.rcdNo),
        slotNo: cellText(row, COL.slotNo),
        connectorType: cellText(row, COL.connectorType),
        circuitDescription,
        location: cellText(row, COL.location),
        detail1: cellText(row, COL.detail1),
        detail2: cellText(row, COL.detail2),
        detail3: cellText(row, COL.detail3),
        status: normalizeStatus(statusRaw),
        note: cellText(row, COL.note),
      });
    }

    return { name: section.name, circuits: dedupeMergeKeys(circuits) };
  });

  if (!switchboards.some((board) => board.circuits.length > 0)) {
    throw new SwitchboardParseError(
      `Znaleziono ${switchboards.length} sekcji "Rozdzielnica …" w arkuszu "${sheetName}", ale ` +
        `żadna nie ma rozpoznawalnych pozycji. Sprawdź układ pliku.`,
    );
  }

  return { sheetName, switchboards };
}
