// Generyczny parser dla arkuszy o wspólnej strukturze statusu (Rolety, Przyciski, Alarm, HVAC,
// RACK) — ta sama zasada co `switchboard-xlsx-parser.ts` (osobny, nietykany parser dla RW-Zugi),
// ale sterowany konfiguracją per arkusz zamiast sztywnych kolumn, bo te 5 arkuszy różni się
// realnie doborem kolumn (KOLOR, PRODUCENT, TYP_PRZEWODU, ZASILACZ...) mimo wspólnego statusu.
//
// Niektóre arkusze (HVAC, RACK) mają WIĘCEJ NIŻ JEDEN nagłówek tabeli w tym samym arkuszu —
// np. HVAC: rozdzielacze ogrzewania podłogowego (jeden układ kolumn), potem osobna tabela
// urządzeń klimatyzacji/pompy ciepła (inny układ kolumn) zaczynająca się od własnego wiersza
// nagłówków w środku arkusza. Dlatego config to lista `blocks` — każdy ze swoim wykrywaniem
// nagłówka i mapowaniem kolumn — a nie jeden sztywny układ na cały arkusz.
import * as XLSX from "xlsx";
import type { SwitchboardCircuitStatus } from "@/lib/dashboard/switchboard-types";
import type { DocumentationSheetType } from "@/lib/process/types";

const STATUS_MAP: Record<string, SwitchboardCircuitStatus> = {
  "przygotowane do podłączenia": "przygotowane_do_podlaczenia",
  "podłączone": "podlaczone",
  "podłączone i sprawdzone": "podlaczone_i_sprawdzone",
  "wymaga uwagi": "wymaga_uwagi",
  problem: "problem",
  "nie ruszone": "nie_ruszone",
};

// Wiersz, w którym jedyną wypełnioną treścią jest zdanie dłuższe niż to — akapit informacyjny,
// nie nazwa sekcji ani pozycja. Ten sam próg co w RW-Zugi.
const STANDALONE_PARAGRAPH_MIN_LENGTH = 80;

// Ten sam próg/skracanie co w RW-Zugi — nagłówek sekcji bywa wymieszany z dłuższą instrukcją w tym
// samym wierszu, bez skrócenia trafiał 1:1 jako nazwa sekcji w UI.
const SECTION_NAME_MAX_LENGTH = 60;

function shortenSectionName(text: string): string {
  return text.length > SECTION_NAME_MAX_LENGTH ? `${text.slice(0, SECTION_NAME_MAX_LENGTH).trim()}…` : text;
}

export class DocumentationModuleParseError extends Error {}

export type DocumentationModuleColumnMap = {
  /** 0-indeksowana kolumna z głównym identyfikatorem pozycji (np. NR_OBWODU, PORT). */
  label?: number;
  /** 0-indeksowana kolumna z lokalizacją (POMIESZCZENIE). */
  location?: number;
  /** 0-indeksowana kolumna z opisem/typem pozycji. */
  description?: number;
  /** 0-indeksowana kolumna statusu — wymagana. */
  status: number;
  /** 0-indeksowana kolumna notatki, jeśli arkusz ją ma. */
  note?: number;
  /** Pozostałe kolumny warte zachowania w raw_fields, z etykietą do wyświetlenia. */
  extra: { column: number; label: string }[];
};

export type DocumentationModuleBlock = {
  /** 0-indeksowana kolumna, w której szukamy tekstu nagłówka rozpoczynającego ten blok. */
  headerColumn: number;
  /** Znormalizowany (małe litery) tekst nagłówka, np. "liczba". */
  headerMarker: string;
  columns: DocumentationModuleColumnMap;
  /** Prefiksy (małymi literami) oznaczające nagłówek nowej sekcji w obrębie bloku. */
  sectionPrefixes: string[];
  /** Wiersze, w których wskazana kolumna zaczyna się od jednego z tych prefiksów, są całkowicie
   *  pomijane (nie stają się ani pozycją, ani sekcją) — np. wiersze podsumowań "Zaprojektowane…"
   *  wymieszane z listą realnych pozycji w tym samym arkuszu. */
  skipRowIfColumnStartsWith?: { column: number; prefixes: string[] };
  /** Jeśli ustawione, pozycje z tego bloku trafiają do OSOBNEGO modułu o tej nazwie (np. RACK:
   *  "SWITCH…", "AUDIOSERVER…"). Jeśli nieustawione, blok dokłada pozycje do głównego modułu. */
  moduleNameOverride?: string;
};

export type DocumentationModuleParseConfig = {
  moduleType: Exclude<DocumentationSheetType, "rw_zugi">;
  moduleLabel: string;
  /** Znormalizowana nazwa arkusza (bez spacji/myślników, małymi literami) do dopasowania. */
  sheetNameNormalized: string;
  blocks: DocumentationModuleBlock[];
  /** Etykiety pól w `raw_fields` (z `columns.extra[].label`), które po pierwszym imporcie stają
   *  się edytowalne w aplikacji i NIE są już nadpisywane przy ponownym wgraniu pliku — Rentgen
   *  jest wtedy źródłem prawdy, nie arkusz (np. Przyciski: Typ/Kolor zmieniają się na budowie). */
  editableFieldLabels?: string[];
};

export type ParsedDocumentationModuleItem = {
  rowIndex: number;
  mergeKey: string;
  sectionName: string | null;
  label: string | null;
  location: string | null;
  description: string | null;
  rawFields: Record<string, string>;
  status: SwitchboardCircuitStatus;
  note: string | null;
};

export type ParsedDocumentationModule = {
  moduleType: DocumentationModuleParseConfig["moduleType"];
  /** Nazwa modułu (domyślnie moduleLabel, albo `moduleNameOverride` per blok — patrz RACK). */
  moduleName: string;
  items: ParsedDocumentationModuleItem[];
};

export type ParsedDocumentationModuleFile = {
  sheetName: string;
  modules: ParsedDocumentationModule[];
};

function cellText(row: unknown[], index: number | undefined): string | null {
  if (index === undefined) return null;
  const value = row[index];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase();
}

export function normalizeSheetName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeStatus(raw: string | null): SwitchboardCircuitStatus {
  if (!raw) return "nie_ruszone";
  return STATUS_MAP[normalize(raw)] ?? "nie_ruszone";
}

function contentColumns(columns: DocumentationModuleColumnMap): number[] {
  const cols = new Set<number>();
  if (columns.label !== undefined) cols.add(columns.label);
  if (columns.location !== undefined) cols.add(columns.location);
  if (columns.description !== undefined) cols.add(columns.description);
  for (const extra of columns.extra) cols.add(extra.column);
  return [...cols];
}

type RowClassification =
  | { kind: "blank" }
  | { kind: "paragraph" }
  | { kind: "skip" }
  | { kind: "section-label"; sectionName: string }
  | { kind: "position" };

function classifyRow(row: unknown[], block: DocumentationModuleBlock): RowClassification {
  if (block.skipRowIfColumnStartsWith) {
    const { column, prefixes } = block.skipRowIfColumnStartsWith;
    const text = normalize(cellText(row, column));
    if (text && prefixes.some((prefix) => text.startsWith(prefix))) return { kind: "skip" };
  }

  const cols = contentColumns(block.columns);
  const filled = cols.map((index) => cellText(row, index)).filter((value): value is string => value !== null);

  if (filled.length === 0) return { kind: "blank" };

  if (filled.length === 1 && filled[0].length >= STANDALONE_PARAGRAPH_MIN_LENGTH) {
    return { kind: "paragraph" };
  }

  if (block.sectionPrefixes.length > 0) {
    const sectionCell = filled.find((text) =>
      block.sectionPrefixes.some((prefix) => normalize(text).startsWith(prefix)),
    );
    if (sectionCell) return { kind: "section-label", sectionName: shortenSectionName(sectionCell) };
  }

  return { kind: "position" };
}

function dedupeMergeKeys<T extends { mergeKey: string }>(items: T[]): T[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const count = (seen.get(item.mergeKey) ?? 0) + 1;
    seen.set(item.mergeKey, count);
    return count === 1 ? item : { ...item, mergeKey: `${item.mergeKey}#${count}` };
  });
}

/** Znajduje WSZYSTKIE wystąpienia nagłówka danego bloku w arkuszu (zwykle jedno, ale kod nie
 *  zakłada tego na sztywno). */
function findBlockHeaderRows(rows: unknown[][], block: DocumentationModuleBlock): number[] {
  const found: number[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (normalize(cellText(rows[i] ?? [], block.headerColumn)) === block.headerMarker) found.push(i);
  }
  return found;
}

/** Parsuje jeden arkusz workbooka wg configu (może zawierać kilka bloków tabel w jednym
 *  arkuszu). Zwraca `null`, jeśli arkusz nie istnieje w pliku — to nie błąd, plik po prostu nie
 *  zawiera tego mapowania, inne mogą nadal pasować. */
export function parseDocumentationModuleSheet(
  workbook: XLSX.WorkBook,
  config: DocumentationModuleParseConfig,
): ParsedDocumentationModuleFile | null {
  const sheetName = workbook.SheetNames.find(
    (candidate) => normalizeSheetName(candidate) === config.sheetNameNormalized,
  );
  if (!sheetName) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  // Zbierz start każdego bloku, posortuj po wierszu — blok trwa od (nagłówek+1) do startu
  // kolejnego bloku albo końca arkusza. Kilka bloków może dzielić identyczny znacznik nagłówka
  // (RACK: "PORT" pojawia się dwa razy — SWITCH, potem AUDIOSERVER) — kursor per
  // (kolumna, marker) przydziela kolejne wystąpienia kolejnym blokom w KOLEJNOŚCI ZAPISU w
  // configu, więc bloki muszą być wypisane w takiej kolejności, w jakiej fizycznie występują
  // w arkuszu.
  const matchCursorByKey = new Map<string, number>();
  const blockStarts = config.blocks
    .map((block) => {
      const key = `${block.headerColumn}::${block.headerMarker}`;
      const matches = findBlockHeaderRows(rows, block);
      const cursor = matchCursorByKey.get(key) ?? 0;
      matchCursorByKey.set(key, cursor + 1);
      const headerRow = matches[cursor];
      return headerRow !== undefined ? { block, headerRow } : null;
    })
    .filter((entry): entry is { block: DocumentationModuleBlock; headerRow: number } => entry !== null)
    .sort((a, b) => a.headerRow - b.headerRow);

  if (blockStarts.length === 0) return null;

  const itemsByModuleName = new Map<string, ParsedDocumentationModuleItem[]>();

  blockStarts.forEach((entry, entryIndex) => {
    const { block, headerRow } = entry;
    const dataStart = headerRow + 1;
    const dataEnd = blockStarts[entryIndex + 1]?.headerRow ?? rows.length;
    const moduleName = block.moduleNameOverride ?? config.moduleLabel;

    const items = itemsByModuleName.get(moduleName) ?? [];
    let currentSection: string | null = null;

    for (let i = dataStart; i < dataEnd; i += 1) {
      const row = rows[i] ?? [];
      const classification = classifyRow(row, block);

      if (classification.kind === "blank" || classification.kind === "paragraph" || classification.kind === "skip") {
        continue;
      }
      if (classification.kind === "section-label") {
        currentSection = classification.sectionName;
        continue;
      }

      const label = cellText(row, block.columns.label);
      const location = cellText(row, block.columns.location);
      const description = cellText(row, block.columns.description);
      const statusRaw = cellText(row, block.columns.status);
      const note = cellText(row, block.columns.note);

      const rawFields: Record<string, string> = {};
      for (const extra of block.columns.extra) {
        const value = cellText(row, extra.column);
        if (value) rawFields[extra.label] = value;
      }

      const compoundKey = [label, description, location].filter(Boolean).join("|");
      const mergeKey = compoundKey || `row-${i + 1}`;

      items.push({
        rowIndex: i + 1,
        mergeKey,
        sectionName: currentSection,
        label,
        location,
        description,
        rawFields,
        status: normalizeStatus(statusRaw),
        note,
      });
    }

    itemsByModuleName.set(moduleName, items);
  });

  const modules: ParsedDocumentationModule[] = [...itemsByModuleName.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([moduleName, items]) => ({
      moduleType: config.moduleType,
      moduleName,
      items: dedupeMergeKeys(items),
    }));

  if (modules.length === 0) return null;

  return { sheetName, modules };
}
