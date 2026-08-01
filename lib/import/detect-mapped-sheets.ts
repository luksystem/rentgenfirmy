// Rozpoznaje, które z 6 zmapowanych arkuszy (RW-Zugi + 5 generycznych modułów dokumentacji) są
// obecne w pliku ".xlsx" wgranym raz, ogólnie dla projektu, w zakładce Dokumentacja — używane do
// pokazania podglądu "znaleziono: X, Y, Z" przed faktycznym importem każdego wykrytego arkusza.
import * as XLSX from "xlsx";
import { normalizeSheetName as normalizeGenericSheetName } from "@/lib/import/documentation-module-parser";
import { ALL_DOCUMENTATION_MODULE_CONFIGS } from "@/lib/import/documentation-module-configs";
import type { DocumentationSheetType } from "@/lib/process/types";

const RW_ZUGI_SHEET_TARGET = normalizeGenericSheetName("RW - Zugi");

export type MappedSheetDetection = {
  sheetType: DocumentationSheetType;
  label: string;
  sheetName: string;
};

export function detectMappedSheets(workbook: XLSX.WorkBook): MappedSheetDetection[] {
  const results: MappedSheetDetection[] = [];

  const rwZugiSheet = workbook.SheetNames.find(
    (name) => normalizeGenericSheetName(name) === RW_ZUGI_SHEET_TARGET,
  );
  if (rwZugiSheet) {
    results.push({ sheetType: "rw_zugi", label: "Rozdzielnie", sheetName: rwZugiSheet });
  }

  for (const config of ALL_DOCUMENTATION_MODULE_CONFIGS) {
    const sheetName = workbook.SheetNames.find(
      (name) => normalizeGenericSheetName(name) === config.sheetNameNormalized,
    );
    if (sheetName) {
      results.push({ sheetType: config.moduleType, label: config.moduleLabel, sheetName });
    }
  }

  return results;
}
