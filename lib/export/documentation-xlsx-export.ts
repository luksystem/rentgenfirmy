// Eksport z powrotem do Excela — odtwarza układ kolumn oryginalnego pliku dokumentacji technicznej
// (patrz `lib/import/switchboard-xlsx-parser.ts` i `lib/import/documentation-module-parser.ts`,
// które są tu jedynym źródłem prawdy o pozycjach kolumn) na podstawie AKTUALNEGO stanu w bazie —
// czyli ze statusami/notatkami wpisanymi w aplikacji i pozycjami dodanymi ręcznie. Wynikowy plik
// ma te same nazwy arkuszy i te same kolumny co oryginał, więc da się go ponownie zaimportować.
import * as XLSX from "xlsx";
import {
  SWITCHBOARD_CIRCUIT_STATUS_LABELS,
  type SwitchboardCircuit,
} from "@/lib/dashboard/switchboard-types";
import {
  DOCUMENTATION_MODULE_LABELS,
  type DocumentationModule,
  type DocumentationModuleItem,
} from "@/lib/dashboard/documentation-module-types";
import { SWITCHBOARD_COL } from "@/lib/import/switchboard-xlsx-parser";
import {
  ALL_DOCUMENTATION_MODULE_CONFIGS,
} from "@/lib/import/documentation-module-configs";
import type {
  DocumentationModuleBlock,
  DocumentationModuleParseConfig,
} from "@/lib/import/documentation-module-parser";
import { fetchSwitchboardsWithCircuits, type SwitchboardWithCircuits } from "@/lib/supabase/switchboard-repository";
import { fetchDocumentationModulesWithItems } from "@/lib/supabase/documentation-module-repository";

type CellValue = string | number | null;

// Kolumna daleko za wszystkimi realnymi danymi (max realnie używana kolumna to RACK/blok
// AUDIOSERVER, indeks 9) — jedno stałe miejsce na oznaczenie pochodzenia wiersza, wspólne dla
// wszystkich arkuszy, żeby nigdy nie kolidowało z żadnym układem kolumn.
const SOURCE_MARKER_COLUMN = 20;
const MANUAL_SOURCE_LABEL = "Dodano ręcznie (Rentgen)";

function makeRow(entries: Record<number, CellValue | undefined>): CellValue[] {
  const row: CellValue[] = new Array(SOURCE_MARKER_COLUMN + 1).fill(null);
  for (const [col, value] of Object.entries(entries)) {
    row[Number(col)] = value ?? null;
  }
  return row;
}

function capitalize(text: string): string {
  return text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// ---------------------------------------------------------------------------------------------
// RW-Zugi (Rozdzielnie)
// ---------------------------------------------------------------------------------------------

function buildSwitchboardRows(boards: SwitchboardWithCircuits[]): CellValue[][] {
  const rows: CellValue[][] = [];

  for (const { switchboard, circuits } of boards) {
    rows.push(makeRow({ 0: `Rozdzielnica ${switchboard.name}` }));
    rows.push(
      makeRow({
        [SWITCHBOARD_COL.breakerType]: "Typ wyłącznika",
        [SWITCHBOARD_COL.breakerNo]: "Nr zabezpieczenia",
        [SWITCHBOARD_COL.slotNo]: "Slot",
        [SWITCHBOARD_COL.zugNo]: "Zug",
        [SWITCHBOARD_COL.zugSubNo]: "Zug pod-nr",
        [SWITCHBOARD_COL.connectorType]: "Typ złącza",
        [SWITCHBOARD_COL.circuitNo]: "Nr obwodu",
        [SWITCHBOARD_COL.circuitDescription]: "Opis obwodu",
        [SWITCHBOARD_COL.location]: "Lokalizacja",
        [SWITCHBOARD_COL.rcdNo]: "RCD",
        [SWITCHBOARD_COL.status]: "Status",
        [SWITCHBOARD_COL.note]: "Notatka",
        [SOURCE_MARKER_COLUMN]: "Źródło",
      }),
    );

    const sorted = [...circuits].sort((a, b) => a.rowIndex - b.rowIndex);
    let lastSection: string | null | undefined;
    let first = true;
    for (const circuit of sorted) {
      if (first || circuit.sectionName !== lastSection) {
        if (circuit.sectionName) rows.push(makeRow({ 0: circuit.sectionName }));
        lastSection = circuit.sectionName;
        first = false;
      }
      rows.push(buildCircuitRow(circuit));
    }
    rows.push([]);
  }

  return rows;
}

function buildCircuitRow(circuit: SwitchboardCircuit): CellValue[] {
  return makeRow({
    [SWITCHBOARD_COL.breakerType]: circuit.breakerType,
    [SWITCHBOARD_COL.breakerNo]: circuit.breakerNo,
    [SWITCHBOARD_COL.slotNo]: circuit.slotNo,
    [SWITCHBOARD_COL.zugNo]: circuit.zugNo,
    [SWITCHBOARD_COL.zugSubNo]: circuit.zugSubNo,
    [SWITCHBOARD_COL.connectorType]: circuit.connectorType,
    [SWITCHBOARD_COL.circuitNo]: circuit.circuitNo,
    [SWITCHBOARD_COL.circuitDescription]: circuit.circuitDescription,
    [SWITCHBOARD_COL.detail1]: circuit.detail1,
    [SWITCHBOARD_COL.detail2]: circuit.detail2,
    [SWITCHBOARD_COL.location]: circuit.location,
    [SWITCHBOARD_COL.rcdNo]: circuit.rcdNo,
    [SWITCHBOARD_COL.detail3]: circuit.detail3,
    [SWITCHBOARD_COL.status]: SWITCHBOARD_CIRCUIT_STATUS_LABELS[circuit.status],
    [SWITCHBOARD_COL.note]: circuit.note,
    [SOURCE_MARKER_COLUMN]: circuit.source === "manual" ? MANUAL_SOURCE_LABEL : null,
  });
}

export function buildSwitchboardExportSheet(boards: SwitchboardWithCircuits[]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(buildSwitchboardRows(boards));
}

// ---------------------------------------------------------------------------------------------
// Generyczne moduły dokumentacji (Rolety, Przyciski, Alarm, HVAC, RACK)
// ---------------------------------------------------------------------------------------------

function headerRowForBlock(block: DocumentationModuleBlock): CellValue[] {
  const entries: Record<number, CellValue> = {
    [block.columns.status]: "Status",
    [SOURCE_MARKER_COLUMN]: "Źródło",
  };
  if (block.columns.label !== undefined) entries[block.columns.label] = "Nr obwodu";
  if (block.columns.location !== undefined) entries[block.columns.location] = "Pomieszczenie";
  if (block.columns.description !== undefined) entries[block.columns.description] = "Opis";
  if (block.columns.note !== undefined) entries[block.columns.note] = "Notatka";
  for (const extra of block.columns.extra) entries[extra.column] = extra.label;
  // Musi iść PO polach powyżej i wygrać w razie kolizji: `headerColumn` bywa jednocześnie
  // kolumną `extra` (np. HVAC blok 1 — kolumna A niesie i nagłówek "Rozdzielacz…", i wartość pola
  // "Rozdzielacz" w wierszach danych, dokładnie jak w oryginalnym pliku). Bez tego re-import nie
  // znajduje wiersza nagłówka bloku wcale, bo `headerMarker` nie trafia do tej komórki.
  entries[block.headerColumn] = capitalize(block.headerMarker);
  return makeRow(entries);
}

function dataRowForItem(block: DocumentationModuleBlock, item: DocumentationModuleItem): CellValue[] {
  const entries: Record<number, CellValue> = {
    [block.columns.status]: SWITCHBOARD_CIRCUIT_STATUS_LABELS[item.status],
  };
  if (block.columns.label !== undefined) entries[block.columns.label] = item.label;
  if (block.columns.location !== undefined) entries[block.columns.location] = item.location;
  if (block.columns.description !== undefined) entries[block.columns.description] = item.description;
  if (block.columns.note !== undefined) entries[block.columns.note] = item.note;
  for (const extra of block.columns.extra) entries[extra.column] = item.rawFields[extra.label] ?? null;
  if (item.source === "manual") entries[SOURCE_MARKER_COLUMN] = MANUAL_SOURCE_LABEL;
  return makeRow(entries);
}

function appendBlockRows(rows: CellValue[][], block: DocumentationModuleBlock, items: DocumentationModuleItem[]) {
  rows.push(headerRowForBlock(block));
  const sorted = [...items].sort((a, b) => a.rowIndex - b.rowIndex);
  let lastSection: string | null | undefined;
  let first = true;
  for (const item of sorted) {
    if (first || item.sectionName !== lastSection) {
      if (item.sectionName) rows.push(makeRow({ 0: item.sectionName }));
      lastSection = item.sectionName;
      first = false;
    }
    rows.push(dataRowForItem(block, item));
  }
  rows.push([]);
}

/**
 * Rozdziela pozycje między bloki, które dzielą JEDEN moduł (bez `moduleNameOverride` — dziś tylko
 * HVAC: rozdzielacze + urządzenia klimatyzacji w tym samym module "HVAC"). Parsowanie nie
 * zapamiętuje, z którego bloku pochodzi dana pozycja, więc odtwarzamy to po etykietach `extra`,
 * które są unikalne dla danego bloku (np. HVAC block1 ma "Rozdzielacz", block2 ma "Typ
 * urządzenia" — "Kabel" jest wspólne dla obu, więc nie liczy się jako rozróżnik).
 */
function splitSharedModuleItemsByBlock(
  blocksWithoutOverride: DocumentationModuleBlock[],
  items: DocumentationModuleItem[],
): Map<DocumentationModuleBlock, DocumentationModuleItem[]> {
  const result = new Map<DocumentationModuleBlock, DocumentationModuleItem[]>(
    blocksWithoutOverride.map((block) => [block, []]),
  );
  if (blocksWithoutOverride.length <= 1) {
    if (blocksWithoutOverride[0]) result.set(blocksWithoutOverride[0], items);
    return result;
  }

  const ownership = blocksWithoutOverride.map((block) => {
    const myLabels = new Set(block.columns.extra.map((e) => e.label));
    const otherLabels = new Set(
      blocksWithoutOverride
        .filter((b) => b !== block)
        .flatMap((b) => b.columns.extra.map((e) => e.label)),
    );
    return { block, uniqueLabels: [...myLabels].filter((label) => !otherLabels.has(label)) };
  });

  // Fallback dla pozycji bez ŻADNEJ unikalnej etykiety w raw_fields (np. HVAC: pozycja pod
  // "Rozdzielacz…" bez wypełnionej kolumny "Rozdzielacz" ma pusty raw_fields) — takich pozycji
  // nie da się rozstrzygnąć po etykietach, więc używamy sectionName jako drugiego sygnału: bloki
  // z `sectionPrefixes` faktycznie przypisują sekcję pozycjom pod nagłówkiem, płaskie bloki nigdy.
  const sectionedBlock = blocksWithoutOverride.find((b) => b.sectionPrefixes.length > 0) ?? blocksWithoutOverride[0];
  const flatBlock = blocksWithoutOverride.find((b) => b.sectionPrefixes.length === 0) ?? blocksWithoutOverride[0];

  for (const item of items) {
    const owner = ownership.find(({ uniqueLabels }) => uniqueLabels.some((label) => label in item.rawFields));
    const block = owner?.block ?? (item.sectionName ? sectionedBlock : flatBlock);
    result.get(block)?.push(item);
  }
  return result;
}

export function buildDocumentationModuleExportSheet(
  config: DocumentationModuleParseConfig,
  entries: { module: DocumentationModule; items: DocumentationModuleItem[] }[],
): XLSX.WorkSheet {
  const rows: CellValue[][] = [];

  const sharedEntry = entries.find((e) => e.module.name === config.moduleLabel);
  const blocksWithoutOverride = config.blocks.filter((b) => !b.moduleNameOverride);
  const sharedItemsByBlock = splitSharedModuleItemsByBlock(blocksWithoutOverride, sharedEntry?.items ?? []);

  for (const block of config.blocks) {
    const items = block.moduleNameOverride
      ? (entries.find((e) => e.module.name === block.moduleNameOverride)?.items ?? [])
      : (sharedItemsByBlock.get(block) ?? []);
    appendBlockRows(rows, block, items);
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

// ---------------------------------------------------------------------------------------------
// Orkiestracja: pobierz aktualny stan projektu i pobierz jako jeden plik .xlsx
// ---------------------------------------------------------------------------------------------

export async function exportProjectDocumentationWorkbook(
  projectId: string,
  projectName: string,
): Promise<{ exportedSheetCount: number }> {
  const workbook = XLSX.utils.book_new();
  let exportedSheetCount = 0;

  const switchboards = await fetchSwitchboardsWithCircuits(projectId);
  if (switchboards.some((b) => b.circuits.length > 0)) {
    XLSX.utils.book_append_sheet(workbook, buildSwitchboardExportSheet(switchboards), "RW - Zugi");
    exportedSheetCount += 1;
  }

  for (const config of ALL_DOCUMENTATION_MODULE_CONFIGS) {
    const entries = await fetchDocumentationModulesWithItems(
      projectId,
      config.moduleType as Parameters<typeof fetchDocumentationModulesWithItems>[1],
    );
    if (entries.length === 0 || entries.every((e) => e.items.length === 0)) continue;
    const sheetName = DOCUMENTATION_MODULE_LABELS[config.moduleType] ?? config.moduleLabel;
    XLSX.utils.book_append_sheet(workbook, buildDocumentationModuleExportSheet(config, entries), sheetName);
    exportedSheetCount += 1;
  }

  if (exportedSheetCount === 0) {
    throw new Error("Brak zaimportowanych danych do wyeksportowania — najpierw wgraj plik dokumentacji.");
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const safeProjectName = projectName.replace(/[\\/:*?"<>|]/g, "_").trim() || "Projekt";
  XLSX.writeFile(workbook, `${safeProjectName}_Dokumentacja_${dateStamp}.xlsx`);

  return { exportedSheetCount };
}
