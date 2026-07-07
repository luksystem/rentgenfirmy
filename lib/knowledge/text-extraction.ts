import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
// Importujemy wewnętrzny plik biblioteki (nie główny `pdf-parse`), bo `index.js` pakietu
// ma tryb debugowy uruchamiany warunkiem `!module.parent`, który po zbundlowaniu przez
// Next.js/webpack bywa prawdziwy i próbuje wczytać przykładowy plik testowy z pakietu (ENOENT).
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const LINK_FETCH_TIMEOUT_MS = 15_000;
const MAX_EXTRACTED_CHARS = 400_000;

function clamp(text: string) {
  return text.length > MAX_EXTRACTED_CHARS ? text.slice(0, MAX_EXTRACTED_CHARS) : text;
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return clamp(result.text.trim());
}

export function extractTextFromPlainBuffer(buffer: Buffer): string {
  return clamp(buffer.toString("utf8").trim());
}

// Format eksportu WhatsApp: "12.03.24, 14:05 - Jan Kowalski: treść wiadomości" (lub z nawiasami
// kwadratowymi na iOS: "[12.03.24, 14:05:32] Jan Kowalski: treść"). Usuwamy datę/nadawcę, żeby
// zostawić czystą treść rozmowy do przeszukiwania; jeśli format nie jest rozpoznany, plik jest
// traktowany jak zwykły tekst.
const WHATSAPP_LINE_PATTERN =
  /^(?:\[)?\d{1,2}[./]\d{1,2}[./]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\])?\s*[-–]?\s*([^:]{1,80}):\s*(.*)$/;

export function extractTextFromWhatsAppBuffer(buffer: Buffer): string {
  const raw = buffer.toString("utf8");
  const lines = raw.split(/\r?\n/);
  const cleaned: string[] = [];

  for (const line of lines) {
    const match = WHATSAPP_LINE_PATTERN.exec(line.trim());
    if (match) {
      const [, author, message] = match;
      if (message && !/<Media omitted>|<Multimedia bez opisu>/i.test(message)) {
        cleaned.push(`${author.trim()}: ${message.trim()}`);
      }
    } else if (line.trim()) {
      cleaned.push(line.trim());
    }
  }

  return clamp(cleaned.join("\n").trim());
}

// Wykrywa separator (przecinek vs. średnik — częsty w plikach CSV eksportowanych z Excela w PL
// locale) na podstawie pierwszego wiersza, a następnie parsuje CSV zgodnie z RFC 4180
// (pola w cudzysłowach mogą zawierać separator, znaki nowej linii i podwójne cudzysłowy "").
function detectCsvDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

const CSV_MAX_ROWS = 4_000;

export function extractTextFromCsvBuffer(buffer: Buffer): string {
  const raw = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = detectCsvDelimiter(raw);
  const rows = parseCsvRows(raw, delimiter);

  if (rows.length === 0) {
    return "";
  }

  const [header, ...dataRows] = rows;
  const limitedRows = dataRows.slice(0, CSV_MAX_ROWS);

  const lines = limitedRows.map((cells, index) => {
    const parts = cells
      .map((cell, cellIndex) => {
        const label = (header[cellIndex] ?? `Kolumna ${cellIndex + 1}`).trim();
        const value = cell.trim();
        return value ? `${label}: ${value}` : null;
      })
      .filter((part): part is string => Boolean(part));
    return `Rekord ${index + 1} — ${parts.join(" | ")}`;
  });

  if (dataRows.length > CSV_MAX_ROWS) {
    lines.push(
      `… plik zawiera więcej rekordów (${dataRows.length} łącznie) — pokazano pierwsze ${CSV_MAX_ROWS}.`,
    );
  }

  return clamp(lines.join("\n\n").trim());
}

export async function fetchAndExtractLinkContent(
  url: string,
): Promise<{ text: string; title: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINK_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RentgenKnowledgeBaseBot/1.0)",
      },
    });
    if (!response.ok) {
      throw new Error(`Nie udało się pobrać strony (HTTP ${response.status}).`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, nav, footer, header, svg").remove();

    const title = $("title").first().text().trim() || null;
    const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    return { text: clamp(text), title };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchYoutubeTranscriptAndTitle(
  url: string,
): Promise<{ text: string; title: string | null }> {
  const [transcriptResult, titleResult] = await Promise.allSettled([
    YoutubeTranscript.fetchTranscript(url, { lang: "pl" }).catch(() =>
      YoutubeTranscript.fetchTranscript(url),
    ),
    fetchYoutubeOembedTitle(url),
  ]);

  if (transcriptResult.status === "rejected") {
    throw new Error(
      transcriptResult.reason instanceof Error
        ? `Nie udało się pobrać transkrypcji: ${transcriptResult.reason.message}`
        : "Nie udało się pobrać transkrypcji filmu.",
    );
  }

  const text = transcriptResult.value.map((entry) => entry.text).join(" ");
  const title = titleResult.status === "fulfilled" ? titleResult.value : null;

  return { text: clamp(text.trim()), title };
}

async function fetchYoutubeOembedTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { title?: string };
    return payload.title?.trim() || null;
  } catch {
    return null;
  }
}
