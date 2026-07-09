import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LeaveSignature } from "@/lib/leave/types";
import { formatDate, formatDateTime } from "@/lib/utils";

/** Generowanie karty urlopowej PDF po akceptacji wniosku (serwer, Node.js runtime) — wzorem jest
 * `lib/process/protocol-pdf.ts` (tam wywoływany z przeglądarki, tu z API route, dlatego czcionki
 * wczytujemy z dysku, nie przez `fetch`). Czcionka Lato (OFL) osadzona przez fontkit — polskie znaki. */

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 w punktach

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  return new Uint8Array(Buffer.from(base64, "base64"));
}

async function loadFontBytes(fileName: string): Promise<Buffer> {
  return readFile(path.join(process.cwd(), "public", "fonts", fileName));
}

async function embedTextFonts(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes("Lato-Regular.ttf"),
    loadFontBytes("Lato-Bold.ttf"),
  ]);
  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

export type LeaveCardPdfParams = {
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  workingDayCount: number;
  note: string;
  status: "approved" | "rejected";
  decidedByName: string;
  decidedAt: string;
  decisionNote?: string;
  signature: LeaveSignature | null;
  /** Bajty oryginalnego wzoru PDF wgranego w ustawieniach — opcjonalne. */
  originalPdfBytes?: ArrayBuffer | null;
};

function drawWrappedFactory(
  page: PDFPage,
  margin: number,
  maxWidth: number,
  startY: number,
) {
  let y = startY;
  return function drawWrapped(
    text: string,
    font: PDFFont,
    size: number,
    lineHeight: number,
    color = rgb(0.1, 0.1, 0.1),
  ) {
    const words = text.split(/\s+/).filter(Boolean);
    let line = "";
    const flush = () => {
      if (!line) {
        return;
      }
      page.drawText(line, { x: margin, y, size, font, color });
      y -= lineHeight;
      line = "";
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        flush();
        line = word;
      } else {
        line = candidate;
      }
    }
    flush();
    return y;
  };
}

async function drawInfoAndSignatureBlock(
  pdfDoc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  params: LeaveCardPdfParams,
  startY?: number,
) {
  const { width } = page.getSize();
  const margin = 48;
  const maxWidth = width - margin * 2;
  let y = startY ?? page.getSize().height - margin;

  const draw = drawWrappedFactory(page, margin, maxWidth, y);

  page.drawText("KARTA URLOPOWA", { x: margin, y, size: 16, font: fonts.bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 26;

  const lines: [string, string][] = [
    ["Pracownik", params.employeeName],
    ["Typ dostępności", params.leaveTypeName],
    [
      "Okres",
      `${formatDate(params.startDate)} — ${formatDate(params.endDate)} (${params.workingDayCount} ${
        params.workingDayCount === 1 ? "dzień roboczy" : "dni roboczych"
      }, ${params.dayCount} kalendarzowych)`,
    ],
    ["Status", params.status === "approved" ? "Zaakceptowany" : "Odrzucony"],
    ["Decyzja podjęta przez", `${params.decidedByName} — ${formatDateTime(params.decidedAt)}`],
  ];

  for (const [label, value] of lines) {
    page.drawText(label, { x: margin, y, size: 10, font: fonts.bold, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
    y = draw(value, fonts.regular, 11, 15) - 6;
  }

  if (params.note.trim()) {
    page.drawText("Notatka do przełożonego", { x: margin, y, size: 10, font: fonts.bold, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
    y = draw(params.note, fonts.regular, 10, 14) - 6;
  }

  if (params.decisionNote?.trim()) {
    page.drawText("Uwaga decyzji", { x: margin, y, size: 10, font: fonts.bold, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
    y = draw(params.decisionNote, fonts.regular, 10, 14) - 6;
  }

  y -= 10;

  if (params.signature) {
    page.drawText("Podpis akceptującego", { x: margin, y, size: 10, font: fonts.bold, color: rgb(0.35, 0.35, 0.35) });
    y -= 6;
    const pngBytes = dataUrlToBytes(params.signature.imageDataUrl);
    const image = await pdfDoc.embedPng(pngBytes);
    const maxImgWidth = 200;
    const maxImgHeight = 70;
    const scale = Math.min(maxImgWidth / image.width, maxImgHeight / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    y -= h;
    page.drawImage(image, { x: margin, y, width: w, height: h });
    y -= 14;
    page.drawText(`${params.signature.signerName} — ${formatDateTime(params.signature.signedAt)}`, {
      x: margin,
      y,
      size: 8,
      font: fonts.regular,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 10;
  }

  return y;
}

/** Karta urlopowa z wzoru PDF (dopisana na nowej ostatniej stronie, by nie nadpisywać treści wzoru). */
async function generateFromTemplate(params: LeaveCardPdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(params.originalPdfBytes!);
  const fonts = await embedTextFonts(pdfDoc);
  const page = pdfDoc.addPage(PAGE_SIZE);
  await drawInfoAndSignatureBlock(pdfDoc, page, fonts, params, PAGE_SIZE[1] - 56);
  return pdfDoc.save();
}

/** Karta urlopowa jako samodzielny raport (bez wzoru firmowego). */
async function generateStandalone(params: LeaveCardPdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedTextFonts(pdfDoc);
  const page = pdfDoc.addPage(PAGE_SIZE);
  await drawInfoAndSignatureBlock(pdfDoc, page, fonts, params, PAGE_SIZE[1] - 56);
  return pdfDoc.save();
}

export async function generateLeaveCardPdf(params: LeaveCardPdfParams): Promise<Uint8Array> {
  if (params.originalPdfBytes) {
    return generateFromTemplate(params);
  }
  return generateStandalone(params);
}
