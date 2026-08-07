import { describe, expect, it } from "vitest";
import { extractTextFromCsvBuffer } from "@/lib/knowledge/text-extraction";

function buildCsvBuffer(rowCount: number) {
  const header = "Tytuł,Opis\n";
  const rows = Array.from({ length: rowCount }, (_, index) => `Zgłoszenie ${index + 1},Treść ${index + 1}`);
  return Buffer.from(header + rows.join("\n"), "utf8");
}

describe("extractTextFromCsvBuffer", () => {
  it("nie ucina małego pliku i nie ustawia truncated", () => {
    const result = extractTextFromCsvBuffer(buildCsvBuffer(5));
    expect(result.truncated).toBe(false);
    expect(result.text).toContain("Rekord 1");
    expect(result.text).toContain("Zgłoszenie 5");
    expect(result.text).not.toContain("pokazano pierwsze");
  });

  // Regresja: archiwum zgłoszeń z ActiveCollab (setki/tysiące wierszy) było wcześniej cicho
  // ucinane przy 4 000 wierszy — bez tej flagi UI nie miało jak o tym poinformować.
  it("ustawia truncated i dopisuje ostrzeżenie, gdy plik przekracza limit wierszy", () => {
    const result = extractTextFromCsvBuffer(buildCsvBuffer(20_500));
    expect(result.truncated).toBe(true);
    expect(result.text).toContain("plik zawiera więcej rekordów");
    expect(result.text).not.toContain("Zgłoszenie 20500");
  });
});
